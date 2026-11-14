import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np
from sentence_transformers import CrossEncoder, SentenceTransformer

logger = logging.getLogger(__name__)

DEFAULT_BI_MODEL = "all-MiniLM-L6-v2"
DEFAULT_CROSS_MODEL = "cross-encoder/ms-marco-MiniLM-L-6-v2"

DEFAULT_THRESHOLD = 0.55
DEFAULT_BI_THRESHOLD = 0.60
DEFAULT_CROSS_THRESHOLD = 0.05
DEFAULT_TOP_K = 5

BASE_DIR = Path(__file__).resolve().parent.parent

SEMANTIC_DATA_DIR = BASE_DIR / "semantic_data"
ANCHORS_FILE = SEMANTIC_DATA_DIR / "semantic_anchors.json"
QUERIES_FILE = SEMANTIC_DATA_DIR / "semantic_queries.json"
MODEL_CACHE_DIR = BASE_DIR / ".model_cache"


def _normalize(vectors: np.ndarray) -> np.ndarray:
    """Normalize rows of a 2D array to unit length for cosine similarity."""
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    return vectors / norms


def _sigmoid(x: np.ndarray) -> np.ndarray:
    """Convert raw cross-encoder logits into [0, 1] confidence probabilities."""
    return 1.0 / (1.0 + np.exp(-np.clip(x, -20.0, 20.0)))


def _split_into_clauses(paragraph: str) -> List[str]:
    """
    Splits a paragraph into sentences and sub-clauses so that specific project acronyms
    or legal disclaimers do not dilute the core funding/acknowledgment phrase.
    """
    candidates = [paragraph]
    sentences = [s.strip() for s in paragraph.split(". ") if len(s.strip()) > 15]
    candidates.extend(sentences)

    for sentence in sentences:
        clauses = [c.strip() for c in sentence.split(", ") if len(c.strip()) > 20]
        if len(clauses) > 1:
            candidates.extend(clauses)

    return list(dict.fromkeys(candidates))


class SemanticExtractor:
    """
    Two-stage acknowledgment extractor:
    1. Bi-Encoder (all-MiniLM-L6-v2) rapidly retrieves top-K candidate paragraphs.
    2. Cross-Encoder (ms-marco-MiniLM-L-6-v2) reranks candidates with joint self-attention.
    """

    def __init__(
        self,
        bi_model_name: str = DEFAULT_BI_MODEL,
        cross_model_name: str = DEFAULT_CROSS_MODEL,
        anchors_path: Path = ANCHORS_FILE,
        queries_path: Path = QUERIES_FILE,
        cache_dir: Path = MODEL_CACHE_DIR,
    ) -> None:
        self.bi_model_name = bi_model_name
        self.cross_model_name = cross_model_name
        self.cache_dir = str(cache_dir)
        self.anchors = self._read_json_list(anchors_path)
        self.queries = self._read_json_list(queries_path)

        self._bi_model: Optional[SentenceTransformer] = None
        self._cross_model: Optional[CrossEncoder] = None
        self._anchor_embeddings: Optional[np.ndarray] = None

    @staticmethod
    def _read_json_list(path: Path) -> List[str]:
        with open(path, "r", encoding="utf-8") as file:
            return json.load(file)

    def _load_models(self) -> None:
        """Lazily loads both Bi-Encoder and Cross-Encoder from local cache (or downloads once)."""
        if self._bi_model is not None and self._cross_model is not None:
            return

        logger.info("Loading Bi-Encoder '%s'...", self.bi_model_name)
        try:
            self._bi_model = SentenceTransformer(
                self.bi_model_name,
                cache_folder=self.cache_dir,
                local_files_only=True,
            )
        except Exception:
            logger.info("Downloading Bi-Encoder '%s' to cache...", self.bi_model_name)
            self._bi_model = SentenceTransformer(
                self.bi_model_name,
                cache_folder=self.cache_dir,
                local_files_only=False,
            )

        logger.info("Loading Cross-Encoder '%s'...", self.cross_model_name)
        try:
            self._cross_model = CrossEncoder(
                self.cross_model_name,
                cache_folder=self.cache_dir,
                local_files_only=True,
            )
        except Exception:
            logger.info("Downloading Cross-Encoder '%s' to cache...", self.cross_model_name)
            self._cross_model = CrossEncoder(
                self.cross_model_name,
                cache_folder=self.cache_dir,
                local_files_only=False,
            )

        self._anchor_embeddings = self._encode(self.anchors)

    def _encode(self, texts: List[str]) -> np.ndarray:
        embeddings = self._bi_model.encode(texts, convert_to_numpy=True, show_progress_bar=False)
        return _normalize(np.asarray(embeddings, dtype=np.float32))

    def extract(
        self,
        chunks: List[str],
        threshold: float = DEFAULT_THRESHOLD,
        bi_threshold: float = DEFAULT_BI_THRESHOLD,
        cross_threshold: float = DEFAULT_CROSS_THRESHOLD,
        top_k: int = DEFAULT_TOP_K,
    ) -> List[Dict[str, Any]]:
        """
        Stage 1: Bi-Encoder scores all chunks (and their clauses) against semantic anchors.
        Stage 2: Top-K candidate chunks are reranked by the Cross-Encoder.
        """
        clean_chunks = [c.strip() for c in chunks if c and c.strip()]
        if not clean_chunks:
            return []

        self._load_models()

        # Stage 1: Fast Bi-Encoder retrieval across clauses
        all_candidates: List[str] = []
        chunk_slices: List[range] = []

        for chunk in clean_chunks:
            candidates = _split_into_clauses(chunk)
            start = len(all_candidates)
            all_candidates.extend(candidates)
            chunk_slices.append(range(start, len(all_candidates)))

        candidate_embeddings = self._encode(all_candidates)
        similarity_matrix = candidate_embeddings @ self._anchor_embeddings.T

        stage1_candidates: List[Dict[str, Any]] = []
        for idx, (chunk, idx_range) in enumerate(zip(clean_chunks, chunk_slices)):
            chunk_scores = similarity_matrix[idx_range]
            flat_best = int(np.argmax(chunk_scores))
            _, best_anchor_idx = divmod(flat_best, chunk_scores.shape[1])
            bi_score = float(chunk_scores.flat[flat_best])

            stage1_candidates.append(
                {
                    "index": idx,
                    "text": chunk,
                    "bi_score": bi_score,
                    "matched_anchor": self.anchors[best_anchor_idx],
                }
            )

        # Select top-K candidates from Stage 1 for Cross-Encoder verification
        top_candidates = sorted(stage1_candidates, key=lambda x: x["bi_score"], reverse=True)[:top_k]

        # Stage 2: Cross-Encoder reranking on the top-K candidates against queries
        pairs = [
            (query, item["text"])
            for item in top_candidates
            for query in self.queries
        ]
        raw_logits = np.asarray(self._cross_model.predict(pairs, show_progress_bar=False), dtype=np.float32)
        cross_probs = _sigmoid(raw_logits).reshape(len(top_candidates), len(self.queries)).max(axis=1)

        results: List[Dict[str, Any]] = []
        for item, cross_prob in zip(top_candidates, cross_probs):
            cross_val = float(cross_prob)

            # Reject false positives where Cross-Encoder score is below cross_threshold
            # and Bi-Encoder score is below bi_threshold
            if cross_val < cross_threshold and item["bi_score"] < bi_threshold:
                confidence = item["bi_score"] * 0.5
            else:
                confidence = max(item["bi_score"], cross_val, 0.5 * item["bi_score"] + 0.5 * cross_val)

            if confidence >= threshold:
                results.append(
                    {
                        "index": item["index"],
                        "text": item["text"],
                        "confidence": round(confidence, 4),
                        "bi_score": round(item["bi_score"], 4),
                        "cross_score": round(cross_val, 4),
                        "matched_anchor": item["matched_anchor"],
                    }
                )

        # Restore natural document reading order
        results.sort(key=lambda x: x["index"])
        for r in results:
            r.pop("index", None)

        return results
