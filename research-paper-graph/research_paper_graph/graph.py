import json
import hashlib
import logging
import os
import re
from collections import defaultdict
from functools import lru_cache

import numpy as np
from sentence_transformers import SentenceTransformer

log = logging.getLogger(__name__)


# Coarse top-level sectors used to avoid over-segmented galaxy clusters.
# Keep this list intentionally short and broad; topic-level detail is surfaced downstream.
MACRO_SECTORS = [
    {
        "key": "ai_ml",
        "label": "AI & Machine Learning",
        "keywords": [
            "artificial intelligence",
            "machine learning",
            "deep learning",
            "neural network",
            "computer vision",
            "natural language",
            "reinforcement learning",
            "llm",
            "transformer",
            "data mining",
        ],
    },
    {
        "key": "circuits_systems",
        "label": "Circuits & Systems",
        "keywords": [
            "circuit",
            "vlsi",
            "fpga",
            "embedded",
            "hardware",
            "electronic",
            "signal processing",
            "control system",
            "analog",
            "digital design",
        ],
    },
    {
        "key": "medical_health",
        "label": "Medical & Health",
        "keywords": [
            "medical",
            "clinical",
            "health",
            "biomedical",
            "diagnosis",
            "hospital",
            "patient",
            "imaging",
            "retina",
            "ophthalmology",
        ],
    },
]

FALLBACK_SECTOR_KEY = "emerging_other"
FALLBACK_SECTOR_LABEL = "Emerging & Other"


@lru_cache(maxsize=None)
def _load_sentence_transformer(model_name):
    log.info(f"Loading model ({model_name})...")
    return SentenceTransformer(model_name)


def _get_faiss():
    """Import FAISS when available."""
    try:
        import faiss

        return faiss
    except ImportError:
        log.warning("faiss-cpu not installed — falling back to brute-force similarity")
        return None


def build_embeddings(papers, model_name="all-MiniLM-L6-v2"):
    """Generate embeddings for papers that have abstracts, reusing stored vectors when valid."""
    papers_with_text = [paper for paper in papers if paper.get("abstract")]
    if len(papers_with_text) < 2:
        log.warning("Not enough papers with abstracts to generate embeddings.")
        return papers_with_text, np.array([])

    reused_count = 0
    encode_positions = []
    encode_inputs = []
    embedding_rows = [None] * len(papers_with_text)

    for index, paper in enumerate(papers_with_text):
        stored_embedding = _get_reusable_embedding(paper, model_name)
        if stored_embedding is not None:
            embedding_rows[index] = stored_embedding
            reused_count += 1
            continue

        encode_positions.append(index)
        encode_inputs.append(f"{paper['title']} {paper['abstract']}")

    encoded_count = len(encode_inputs)
    if encoded_count:
        model = _load_sentence_transformer(model_name)
        log.info(f"Encoding {encoded_count} papers...")
        encoded_embeddings = model.encode(encode_inputs, show_progress_bar=True, convert_to_numpy=True)
        for position, embedding in zip(encode_positions, encoded_embeddings):
            embedding_rows[position] = embedding

    if reused_count:
        log.info(f"Reused {reused_count} stored embeddings")

    embeddings = np.asarray(embedding_rows, dtype=np.float32)
    embeddings = _normalize_embeddings(embeddings)

    return papers_with_text, embeddings


def paper_identifier(paper):
    return paper.get("graphId") or paper.get("openAlexId")


def build_embedding_payloads(filtered_papers, embeddings, model_name, indexed_at):
    """Create Strapi-ready embedding metadata keyed by graph paper identifier."""
    if len(filtered_papers) == 0 or len(embeddings) == 0:
        return {}

    payloads = {}
    for paper, embedding in zip(filtered_papers, embeddings):
        paper_id = paper_identifier(paper)
        payloads[paper_id] = {
            "embedding": embedding.tolist(),
            "embeddingModel": model_name,
            "embeddingUpdatedAt": indexed_at,
            "embeddingSourceHash": embedding_source_hash(paper),
            "lastGraphIndexedAt": indexed_at,
        }
    return payloads


def embedding_source_hash(paper):
    raw = json.dumps(
        {
            "title": paper.get("title") or "",
            "abstract": paper.get("abstract") or "",
        },
        sort_keys=True,
        ensure_ascii=True,
    )
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _get_reusable_embedding(paper, model_name):
    stored_embedding = paper.get("embedding")
    if not stored_embedding:
        return None
    if paper.get("embeddingModel") != model_name:
        return None
    if paper.get("embeddingSourceHash") != embedding_source_hash(paper):
        return None

    try:
        embedding = np.asarray(stored_embedding, dtype=np.float32)
    except (TypeError, ValueError):
        return None

    if embedding.ndim != 1 or embedding.size == 0:
        return None
    return embedding


def _normalize_embeddings(embeddings):
    norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
    norms[norms == 0] = 1
    return embeddings / norms


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
    duplicate_pairs = []

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
                source_paper_id = paper_identifier(filtered_papers[source_index])
                target_paper_id = paper_identifier(filtered_papers[target_index])
                if is_duplicate:
                    duplicate_pairs.append((source_paper_id, target_paper_id))

                links.append(
                    {
                        "source_paper_id": source_paper_id,
                        "target_paper_id": target_paper_id,
                        "source_title": filtered_papers[source_index]["title"],
                        "target_title": filtered_papers[target_index]["title"],
                        "score": round(score, 4),
                        "is_duplicate": False,
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
                source_paper_id = paper_identifier(filtered_papers[source_index])
                target_paper_id = paper_identifier(filtered_papers[target_index])
                if is_duplicate:
                    duplicate_pairs.append((source_paper_id, target_paper_id))

                links.append(
                    {
                        "source_paper_id": source_paper_id,
                        "target_paper_id": target_paper_id,
                        "source_title": filtered_papers[source_index]["title"],
                        "target_title": filtered_papers[target_index]["title"],
                        "score": round(score, 4),
                        "is_duplicate": False,
                    }
                )

    duplicate_paper_ids, canonical_by_duplicate = _resolve_duplicate_groups(filtered_papers, duplicate_pairs)

    for link in links:
        source_paper_id = link["source_paper_id"]
        target_paper_id = link["target_paper_id"]
        link["is_duplicate"] = source_paper_id in duplicate_paper_ids or target_paper_id in duplicate_paper_ids
        if source_paper_id in duplicate_paper_ids:
            link["source_canonical_paper_id"] = canonical_by_duplicate[source_paper_id]
        if target_paper_id in duplicate_paper_ids:
            link["target_canonical_paper_id"] = canonical_by_duplicate[target_paper_id]

    duplicate_links = sum(1 for link in links if link["is_duplicate"])
    log.info(f"Links: {len(links)} total | {len(links) - duplicate_links} clean | {duplicate_links} duplicates")
    log.info(f"Duplicate papers: {len(duplicate_paper_ids)}")

    return links, duplicate_paper_ids, filtered_papers, embeddings


def _resolve_duplicate_groups(filtered_papers, duplicate_pairs):
    if not duplicate_pairs:
        return set(), {}

    papers_by_id = {paper_identifier(paper): paper for paper in filtered_papers}
    adjacency = defaultdict(set)
    for source_paper_id, target_paper_id in duplicate_pairs:
        adjacency[source_paper_id].add(target_paper_id)
        adjacency[target_paper_id].add(source_paper_id)

    duplicate_paper_ids = set()
    canonical_by_duplicate = {}
    visited = set()

    for current_paper_id in adjacency:
        if current_paper_id in visited:
            continue

        component = _collect_component(current_paper_id, adjacency, visited)
        canonical_paper_id = _choose_canonical_paper(component, papers_by_id)
        for member_paper_id in component:
            if member_paper_id == canonical_paper_id:
                continue
            duplicate_paper_ids.add(member_paper_id)
            canonical_by_duplicate[member_paper_id] = canonical_paper_id

    return duplicate_paper_ids, canonical_by_duplicate


def _collect_component(start_paper_id, adjacency, visited):
    stack = [start_paper_id]
    component = []

    while stack:
        current_paper_id = stack.pop()
        if current_paper_id in visited:
            continue
        visited.add(current_paper_id)
        component.append(current_paper_id)
        stack.extend(adjacency[current_paper_id] - visited)

    return component


def _choose_canonical_paper(component_paper_ids, papers_by_id):
    return max(component_paper_ids, key=lambda paper_id: _paper_rank_tuple(papers_by_id[paper_id]))


def _paper_rank_tuple(paper):
    title = paper.get("title") or ""
    abstract = paper.get("abstract") or ""
    topics = paper.get("topics") or []
    authors = paper.get("authors") or []
    cited_by = paper.get("cited_by") or 0
    doi = paper.get("doi") or ""
    openalex_id = paper.get("openAlexId") or ""

    return (
        1 if doi else 0,
        len(abstract.strip()),
        len(topics),
        len(authors),
        cited_by,
        len(title.strip()),
        openalex_id,
    )


def detect_communities(filtered_papers, embeddings, links, resolution=1.0):
    """Detect communities using the Louvain algorithm."""
    try:
        import networkx as nx
        from networkx.algorithms.community import louvain_communities
    except ImportError:
        log.warning("networkx not installed — skipping community detection")
        return {}, {}

    graph = nx.Graph()
    paper_ids = [paper_identifier(paper) for paper in filtered_papers]
    graph.add_nodes_from(paper_ids)

    for link in links:
        if not link["is_duplicate"]:
            graph.add_edge(
                link["source_paper_id"],
                link["target_paper_id"],
                weight=link["score"],
            )

    log.info(f"Running Louvain community detection (resolution={resolution})...")
    communities_list = louvain_communities(graph, weight="weight", resolution=resolution, seed=42)

    communities = {}
    for community_id, members in enumerate(communities_list):
        for paper_id in members:
            communities[paper_id] = community_id

    # Coarsen Louvain groups into broad manually curated sectors.
    # This keeps the top-level graph stable and avoids many single-item clusters.
    communities, community_labels = _coarsen_to_macro_sectors(filtered_papers, communities)
    log.info(f"Detected {len(communities_list)} raw communities; {len(set(communities.values()))} macro sectors")

    return communities, community_labels


def _coarsen_to_macro_sectors(papers, communities):
    papers_by_id = {paper_identifier(paper): paper for paper in papers}

    grouped = defaultdict(list)
    for paper_id, community_id in communities.items():
        grouped[community_id].append(paper_id)

    # First assign each raw community to a dominant macro sector when confident.
    raw_to_sector = {}
    for community_id, member_ids in grouped.items():
        counts = defaultdict(int)
        for paper_id in member_ids:
            paper = papers_by_id.get(paper_id)
            sector_key = _infer_macro_sector(paper)
            if sector_key:
                counts[sector_key] += 1

        if not counts:
            raw_to_sector[community_id] = FALLBACK_SECTOR_KEY
            continue

        dominant_sector, dominant_count = max(counts.items(), key=lambda kv: kv[1])
        confidence = dominant_count / max(len(member_ids), 1)

        # If a raw community has weak thematic agreement, keep it in fallback.
        raw_to_sector[community_id] = dominant_sector if confidence >= 0.5 else FALLBACK_SECTOR_KEY

    # Stable sector ordering keeps IDs deterministic across runs.
    ordered_sector_keys = [sector["key"] for sector in MACRO_SECTORS] + [FALLBACK_SECTOR_KEY]
    sector_key_to_id = {key: idx for idx, key in enumerate(ordered_sector_keys)}

    sector_communities = {}
    for paper_id, community_id in communities.items():
        sector_key = raw_to_sector.get(community_id, FALLBACK_SECTOR_KEY)
        sector_communities[paper_id] = sector_key_to_id[sector_key]

    labels = {
        sector_key_to_id[sector["key"]]: sector["label"]
        for sector in MACRO_SECTORS
    }
    labels[sector_key_to_id[FALLBACK_SECTOR_KEY]] = FALLBACK_SECTOR_LABEL

    return sector_communities, labels


def _infer_macro_sector(paper):
    if not paper:
        return None

    title = str(paper.get("title") or "")
    abstract = str(paper.get("abstract") or "")
    topics = " ".join(str(topic) for topic in (paper.get("topics") or []))
    text = f"{title} {abstract} {topics}".lower()
    text = re.sub(r"\s+", " ", text)

    scores = {}
    for sector in MACRO_SECTORS:
        score = 0
        for keyword in sector["keywords"]:
            if keyword in text:
                score += 1
        if score > 0:
            scores[sector["key"]] = score

    if not scores:
        return None

    return max(scores.items(), key=lambda kv: kv[1])[0]


def _label_communities(papers, communities):
    from collections import Counter

    topic_counts = {}
    for paper in papers:
        community_id = communities.get(paper_identifier(paper))
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
        "paper_ids": [paper_identifier(paper) for paper in papers],
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
    paper_ids = data.get("paper_ids", data.get("openalex_ids", []))
    embeddings = np.array(data.get("embeddings", []), dtype=np.float32)
    log.info(f"Loaded existing index ({len(paper_ids)} papers) from {path}")
    return paper_ids, embeddings