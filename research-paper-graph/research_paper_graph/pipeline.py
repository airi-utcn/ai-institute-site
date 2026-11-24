import json
import logging
import os
from dataclasses import dataclass
from datetime import datetime, timezone

from . import graph as gg


@dataclass
class GraphArtifacts:
    all_links: list
    duplicate_ids: set
    communities: dict
    community_labels: dict
    secondary_clusters: dict
    filtered_papers: list
    embedding_payloads: dict
    embeddings: object
    topic_hierarchy: dict  # Topic supercluster data
    paper_topic_superclusters: dict
    quality_metrics: dict
    paper_metadata: dict


def _log_quality_metrics_summary(log, label, metrics):
    """Emit a concise terminal summary for build-time diagnostics."""
    linking = metrics.get("linking", {})
    communities = metrics.get("communities", {})
    meso = metrics.get("meso", {})
    labels = metrics.get("labels", {})

    log.info(
        "[%s] Diagnostics (linking): total=%s clean=%s duplicate_links=%s duplicate_papers=%s density=%s",
        label,
        linking.get("totalLinks", 0),
        linking.get("cleanLinks", 0),
        linking.get("duplicateLinks", 0),
        linking.get("duplicatePaperCount", 0),
        linking.get("cleanEdgeDensity", 0.0),
    )
    log.info(
        "[%s] Diagnostics (communities): count=%s largest_share=%s entropy=%s",
        label,
        communities.get("communityCount", 0),
        communities.get("largestCommunityShare", 0.0),
        communities.get("normalizedEntropy", 0.0),
    )
    log.info(
        "[%s] Diagnostics (meso): median_nodes_per_community=%s mean=%s max=%s",
        label,
        meso.get("medianNodesPerCommunity", 0.0),
        meso.get("meanNodesPerCommunity", 0.0),
        meso.get("maxNodesPerCommunity", 0),
    )
    log.info(
        "[%s] Diagnostics (labels): weighted_alignment=%s low_alignment_clusters=%s",
        label,
        labels.get("weightedAlignmentScore", 0.0),
        len(labels.get("lowAlignmentClusters", [])),
    )

    suggestions = metrics.get("suggestedTuning", [])
    for suggestion in suggestions:
        log.info("[%s] Diagnostics suggestion: %s", label, suggestion)


def build_graph_artifacts(
    papers,
    label,
    *,
    similarity_threshold=0.5,
    duplicate_threshold=0.92,
    model_name="all-MiniLM-L6-v2",
    top_k=0,
    logger=None,
):
    """Generate graph links and community artifacts, persisting local outputs."""
    log = logger or logging.getLogger("paper-sync")
    paper_metadata = {}
    for paper in papers:
        paper_id = gg.paper_identifier(paper)
        if not paper_id:
            continue
        existing_metadata = paper.get("metadata")
        paper_metadata[paper_id] = existing_metadata if isinstance(existing_metadata, dict) else {}

    log.info(
        f"Generating links (threshold={similarity_threshold}, dup={duplicate_threshold})..."
    )
    all_links, duplicate_ids, filtered_papers, embeddings = gg.generate_links(
        papers,
        similarity_threshold=similarity_threshold,
        duplicate_threshold=duplicate_threshold,
        model_name=model_name,
        top_k=top_k,
    )

    indexed_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    embedding_payloads = gg.build_embedding_payloads(
        filtered_papers,
        embeddings,
        model_name,
        indexed_at,
    )

    communities = {}
    community_labels = {}
    secondary_clusters = {}
    output_dir = "outputs"
    os.makedirs(output_dir, exist_ok=True)

    if len(filtered_papers) > 2:
        clean_links = [link for link in all_links if not link["is_duplicate"]]
        communities, community_labels, secondary_clusters = gg.detect_communities(
            filtered_papers,
            embeddings,
            clean_links,
            resolution=1.0,
        )

    # Build topic hierarchy (superclusters)
    topic_hierarchy = {}
    paper_topic_superclusters = {}
    if len(filtered_papers) > 0:
        log.info("Building topic hierarchy...")
        topic_hierarchy = gg.build_topic_hierarchy(filtered_papers, model_name)
        paper_topic_superclusters = gg.build_paper_topic_superclusters(filtered_papers, topic_hierarchy)
        
        # Save topic hierarchy to JSON
        topic_path = os.path.join(output_dir, f"topic_hierarchy_{label}.json")
        # Convert numpy array to list for JSON serialization
        serializable_hierarchy = {
            "topics": topic_hierarchy.get("topics", []),
            "topic_to_cluster": topic_hierarchy.get("topic_to_cluster", {}),
            "cluster_to_topics": topic_hierarchy.get("cluster_to_topics", {}),
            "cluster_labels": topic_hierarchy.get("cluster_labels", {}),
            "paper_superclusters": paper_topic_superclusters,
        }
        with open(topic_path, "w", encoding="utf-8") as handle:
            json.dump(serializable_hierarchy, handle, indent=2)
        log.info(f"Saved topic hierarchy to {topic_path}")

    quality_metrics = gg.compute_graph_quality_metrics(
        filtered_papers,
        embeddings,
        communities,
        community_labels,
        paper_topic_superclusters,
        all_links=all_links,
        duplicate_ids=duplicate_ids,
    )
    quality_path = os.path.join(output_dir, f"quality_{label}.json")
    with open(quality_path, "w", encoding="utf-8") as handle:
        json.dump(quality_metrics, handle, indent=2)
    log.info(f"Saved quality metrics to {quality_path}")
    _log_quality_metrics_summary(log, label, quality_metrics)

    return GraphArtifacts(
        all_links=all_links,
        duplicate_ids=duplicate_ids,
        communities=communities,
        community_labels=community_labels,
        secondary_clusters=secondary_clusters,
        filtered_papers=filtered_papers,
        embedding_payloads=embedding_payloads,
        embeddings=embeddings,
        topic_hierarchy=topic_hierarchy,
        paper_topic_superclusters=paper_topic_superclusters,
        quality_metrics=quality_metrics,
        paper_metadata=paper_metadata,
    )
