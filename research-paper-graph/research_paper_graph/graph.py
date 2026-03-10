import json
import logging
import os

import numpy as np
from sentence_transformers import SentenceTransformer

log = logging.getLogger(__name__)


def _get_faiss():
    """Import FAISS when available."""
    try:
        import faiss

        return faiss
    except ImportError:
        log.warning("faiss-cpu not installed — falling back to brute-force similarity")
        return None


def build_embeddings(papers, model_name="all-MiniLM-L6-v2"):
    """Generate embeddings for papers that have abstracts."""
    papers_with_text = [paper for paper in papers if paper.get("abstract")]
    if len(papers_with_text) < 2:
        log.warning("Not enough papers with abstracts to generate embeddings.")
        return papers_with_text, np.array([])

    log.info(f"Loading model ({model_name})...")
    model = SentenceTransformer(model_name)

    combined = [f"{paper['title']} {paper['abstract']}" for paper in papers_with_text]
    log.info(f"Encoding {len(combined)} papers...")
    embeddings = model.encode(combined, show_progress_bar=True, convert_to_numpy=True)

    norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
    norms[norms == 0] = 1
    embeddings = embeddings / norms

    return papers_with_text, embeddings


def build_faiss_index(embeddings):
    """Build a FAISS inner-product index from normalized embeddings."""
    faiss = _get_faiss()
    if faiss is None or len(embeddings) == 0:
        return None

    dimension = embeddings.shape[1]
    index = faiss.IndexFlatIP(dimension)
    index.add(embeddings.astype(np.float32))
    return index


def generate_links(
    papers,
    similarity_threshold=0.5,
    duplicate_threshold=0.92,
    model_name="all-MiniLM-L6-v2",
    top_k=20,
):
    """Compute similarity links between papers."""
    filtered_papers, embeddings = build_embeddings(papers, model_name)

    if len(embeddings) == 0:
        return [], set(), filtered_papers, embeddings

    links = []
    duplicate_paper_ids = set()

    faiss_index = build_faiss_index(embeddings)

    if faiss_index is not None:
        log.info(f"Querying FAISS index (top_k={top_k})...")
        k = min(top_k + 1, len(filtered_papers))
        scores, indices = faiss_index.search(embeddings.astype(np.float32), k)

        seen_pairs = set()
        for source_index in range(len(filtered_papers)):
            for rank in range(k):
                target_index = int(indices[source_index][rank])
                if target_index == source_index or target_index < 0:
                    continue

                pair = (min(source_index, target_index), max(source_index, target_index))
                if pair in seen_pairs:
                    continue
                seen_pairs.add(pair)

                score = float(scores[source_index][rank])
                if score < similarity_threshold:
                    continue

                is_duplicate = score >= duplicate_threshold
                if is_duplicate:
                    duplicate_paper_ids.add(filtered_papers[target_index]["openAlexId"])

                links.append(
                    {
                        "source_openalex_id": filtered_papers[source_index]["openAlexId"],
                        "target_openalex_id": filtered_papers[target_index]["openAlexId"],
                        "source_title": filtered_papers[source_index]["title"],
                        "target_title": filtered_papers[target_index]["title"],
                        "score": round(score, 4),
                        "is_duplicate": is_duplicate,
                    }
                )
    else:
        log.info("Computing full similarity matrix (brute-force)...")
        similarity_matrix = embeddings @ embeddings.T

        for source_index in range(len(filtered_papers)):
            for target_index in range(source_index + 1, len(filtered_papers)):
                score = float(similarity_matrix[source_index][target_index])
                if score < similarity_threshold:
                    continue

                is_duplicate = score >= duplicate_threshold
                if is_duplicate:
                    duplicate_paper_ids.add(filtered_papers[target_index]["openAlexId"])

                links.append(
                    {
                        "source_openalex_id": filtered_papers[source_index]["openAlexId"],
                        "target_openalex_id": filtered_papers[target_index]["openAlexId"],
                        "source_title": filtered_papers[source_index]["title"],
                        "target_title": filtered_papers[target_index]["title"],
                        "score": round(score, 4),
                        "is_duplicate": is_duplicate,
                    }
                )

    duplicate_links = sum(1 for link in links if link["is_duplicate"])
    log.info(f"Links: {len(links)} total | {len(links) - duplicate_links} clean | {duplicate_links} duplicates")
    log.info(f"Duplicate papers: {len(duplicate_paper_ids)}")

    return links, duplicate_paper_ids, filtered_papers, embeddings


def detect_communities(filtered_papers, embeddings, links, resolution=1.0):
    """Detect communities using the Louvain algorithm."""
    try:
        import networkx as nx
        from networkx.algorithms.community import louvain_communities
    except ImportError:
        log.warning("networkx not installed — skipping community detection")
        return {}, {}

    graph = nx.Graph()
    openalex_ids = [paper["openAlexId"] for paper in filtered_papers]
    graph.add_nodes_from(openalex_ids)

    for link in links:
        if not link["is_duplicate"]:
            graph.add_edge(
                link["source_openalex_id"],
                link["target_openalex_id"],
                weight=link["score"],
            )

    log.info(f"Running Louvain community detection (resolution={resolution})...")
    communities_list = louvain_communities(graph, weight="weight", resolution=resolution, seed=42)

    communities = {}
    for community_id, members in enumerate(communities_list):
        for openalex_id in members:
            communities[openalex_id] = community_id

    community_labels = _label_communities(filtered_papers, communities)
    log.info(f"Detected {len(communities_list)} communities")

    return communities, community_labels


def _label_communities(papers, communities):
    from collections import Counter

    topic_counts = {}
    for paper in papers:
        community_id = communities.get(paper["openAlexId"])
        if community_id is None:
            continue
        if community_id not in topic_counts:
            topic_counts[community_id] = Counter()
        for topic in paper.get("topics", []):
            topic_counts[community_id][topic] += 1

    labels = {}
    for community_id, counter in topic_counts.items():
        top_topics = counter.most_common(3)
        labels[community_id] = " / ".join(topic for topic, _ in top_topics) if top_topics else f"Cluster {community_id}"

    return labels


def save_index(embeddings, papers, path):
    """Persist embeddings and paper IDs for reuse."""
    data = {
        "openalex_ids": [paper["openAlexId"] for paper in papers],
        "embeddings": embeddings.tolist(),
    }
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(data, handle)
    log.info(f"Saved index ({len(papers)} papers) to {path}")


def load_index(path):
    """Load a previously saved index."""
    if not os.path.exists(path):
        return None, None
    with open(path, "r", encoding="utf-8") as handle:
        data = json.load(handle)
    openalex_ids = data.get("openalex_ids", [])
    embeddings = np.array(data.get("embeddings", []), dtype=np.float32)
    log.info(f"Loaded existing index ({len(openalex_ids)} papers) from {path}")
    return openalex_ids, embeddings