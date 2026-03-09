import os
import json
import logging
import numpy as np
from sentence_transformers import SentenceTransformer

log = logging.getLogger(__name__)

# ── FAISS-based nearest-neighbor index ───────────────────────────────────────

def _get_faiss():
    """Import FAISS (optional dependency)."""
    try:
        import faiss
        return faiss
    except ImportError:
        log.warning("faiss-cpu not installed — falling back to brute-force similarity")
        return None


def build_embeddings(papers, model_name='all-MiniLM-L6-v2'):
    """
    Generate embeddings for papers that have abstracts.
    Returns (filtered_papers, embeddings_numpy_array).
    """
    papers_with_text = [p for p in papers if p.get('abstract')]
    if len(papers_with_text) < 2:
        log.warning("Not enough papers with abstracts to generate embeddings.")
        return papers_with_text, np.array([])

    log.info(f"Loading model ({model_name})...")
    model = SentenceTransformer(model_name)

    combined = [f"{p['title']} {p['abstract']}" for p in papers_with_text]
    log.info(f"Encoding {len(combined)} papers...")
    embeddings = model.encode(combined, show_progress_bar=True, convert_to_numpy=True)

    # L2-normalize for cosine similarity via inner product
    norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
    norms[norms == 0] = 1
    embeddings = embeddings / norms

    return papers_with_text, embeddings


def build_faiss_index(embeddings):
    """
    Build a FAISS inner-product index from L2-normalised embeddings.
    Falls back to None if FAISS is unavailable.
    """
    faiss = _get_faiss()
    if faiss is None or len(embeddings) == 0:
        return None

    dim = embeddings.shape[1]
    index = faiss.IndexFlatIP(dim)
    index.add(embeddings.astype(np.float32))
    return index


def generate_links(
    papers,
    similarity_threshold=0.5,
    duplicate_threshold=0.92,
    model_name='all-MiniLM-L6-v2',
    top_k=20,
):
    """
    Compute similarity links between papers using FAISS ANN (with brute-force fallback).

    Returns:
        links               – list of link dicts, each with an 'is_duplicate' bool
        duplicate_paper_ids – set of openAlexId strings that should be skipped
        filtered_papers     – papers that had abstracts (same order as embeddings)
        embeddings          – numpy array of L2-normalised embeddings
    """
    filtered_papers, embeddings = build_embeddings(papers, model_name)

    if len(embeddings) == 0:
        return [], set(), filtered_papers, embeddings

    links = []
    duplicate_paper_ids = set()

    faiss_index = build_faiss_index(embeddings)

    if faiss_index is not None:
        # ── FAISS path: query top_k neighbours per paper ─────────────────
        log.info(f"Querying FAISS index (top_k={top_k})...")
        k = min(top_k + 1, len(filtered_papers))  # +1 because self is included
        scores, indices = faiss_index.search(embeddings.astype(np.float32), k)

        seen_pairs = set()
        for i in range(len(filtered_papers)):
            for rank in range(k):
                j = int(indices[i][rank])
                if j == i or j < 0:
                    continue
                pair = (min(i, j), max(i, j))
                if pair in seen_pairs:
                    continue
                seen_pairs.add(pair)

                score = float(scores[i][rank])
                if score < similarity_threshold:
                    continue

                is_dup = score >= duplicate_threshold
                if is_dup:
                    duplicate_paper_ids.add(filtered_papers[j]['openAlexId'])

                links.append({
                    "source_openalex_id": filtered_papers[i]['openAlexId'],
                    "target_openalex_id": filtered_papers[j]['openAlexId'],
                    "source_title": filtered_papers[i]['title'],
                    "target_title": filtered_papers[j]['title'],
                    "score": round(score, 4),
                    "is_duplicate": is_dup,
                })
    else:
        # ── Brute-force fallback ─────────────────────────────────────────
        log.info("Computing full similarity matrix (brute-force)...")
        sim_matrix = embeddings @ embeddings.T

        for i in range(len(filtered_papers)):
            for j in range(i + 1, len(filtered_papers)):
                score = float(sim_matrix[i][j])
                if score < similarity_threshold:
                    continue
                is_dup = score >= duplicate_threshold
                if is_dup:
                    duplicate_paper_ids.add(filtered_papers[j]['openAlexId'])
                links.append({
                    "source_openalex_id": filtered_papers[i]['openAlexId'],
                    "target_openalex_id": filtered_papers[j]['openAlexId'],
                    "source_title": filtered_papers[i]['title'],
                    "target_title": filtered_papers[j]['title'],
                    "score": round(score, 4),
                    "is_duplicate": is_dup,
                })

    dup_links = sum(1 for l in links if l['is_duplicate'])
    log.info(f"Links: {len(links)} total | {len(links) - dup_links} clean | {dup_links} duplicates")
    log.info(f"Duplicate papers: {len(duplicate_paper_ids)}")

    return links, duplicate_paper_ids, filtered_papers, embeddings


# ── Community detection ──────────────────────────────────────────────────────

def detect_communities(filtered_papers, embeddings, links, resolution=1.0):
    """
    Detect communities using the Louvain algorithm on the similarity graph.

    Returns:
        communities – dict mapping openAlexId → community_id (int)
        community_labels – dict mapping community_id → representative label string
    """
    try:
        import networkx as nx
        from networkx.algorithms.community import louvain_communities
    except ImportError:
        log.warning("networkx not installed — skipping community detection")
        return {}, {}

    G = nx.Graph()
    oa_ids = [p['openAlexId'] for p in filtered_papers]
    G.add_nodes_from(oa_ids)

    for link in links:
        if not link['is_duplicate']:
            G.add_edge(
                link['source_openalex_id'],
                link['target_openalex_id'],
                weight=link['score'],
            )

    log.info(f"Running Louvain community detection (resolution={resolution})...")
    communities_list = louvain_communities(G, weight='weight', resolution=resolution, seed=42)

    communities = {}
    for cid, members in enumerate(communities_list):
        for oa_id in members:
            communities[oa_id] = cid

    # Generate labels from most common topics in each community
    community_labels = _label_communities(filtered_papers, communities)
    log.info(f"Detected {len(communities_list)} communities")

    return communities, community_labels


def _label_communities(papers, communities):
    """Pick the most frequent topic in each community as its label."""
    from collections import Counter

    topic_counts = {}  # community_id → Counter
    for paper in papers:
        cid = communities.get(paper['openAlexId'])
        if cid is None:
            continue
        if cid not in topic_counts:
            topic_counts[cid] = Counter()
        for topic in paper.get('topics', []):
            topic_counts[cid][topic] += 1

    labels = {}
    for cid, counter in topic_counts.items():
        top = counter.most_common(3)
        labels[cid] = " / ".join(t for t, _ in top) if top else f"Cluster {cid}"

    return labels


def save_index(embeddings, papers, path):
    """Persist embeddings and paper IDs so new papers can query incrementally."""
    data = {
        "openalex_ids": [p['openAlexId'] for p in papers],
        "embeddings": embeddings.tolist(),
    }
    with open(path, 'w') as f:
        json.dump(data, f)
    log.info(f"Saved index ({len(papers)} papers) to {path}")


def load_index(path):
    """Load a previously saved index. Returns (openalex_ids, embeddings_np) or (None, None)."""
    if not os.path.exists(path):
        return None, None
    with open(path, 'r') as f:
        data = json.load(f)
    ids = data.get("openalex_ids", [])
    emb = np.array(data.get("embeddings", []), dtype=np.float32)
    log.info(f"Loaded existing index ({len(ids)} papers) from {path}")
    return ids, emb
