import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


@dataclass(frozen=True)
class RuntimeSettings:
    strapi_api_url: str
    strapi_token: str
    strapi_http_timeout: float
    strapi_http_retries: int
    openalex_api_key: str
    openalex_mailto: str
    openalex_http_timeout: float
    openalex_http_retries: int
    openalex_institution_id: str
    import_oa_only: bool
    graph_similarity_threshold: float
    graph_duplicate_threshold: float
    graph_top_k: int
    graph_ai_model: str
    graph_hdbscan_min_cluster_size: int
    graph_hdbscan_min_samples: int
    graph_secondary_cluster_distance_threshold: float
    graph_topic_hdbscan_min_cluster_size: int
    graph_topic_hdbscan_min_samples: int
    pdf_max_bytes: int
    sync_lock_path: str


def _env_bool(name, default):
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _env_float(name, default):
    value = os.getenv(name)
    if value is None or not value.strip():
        return default
    return float(value)


def _env_int(name, default):
    value = os.getenv(name)
    if value is None or not value.strip():
        return default
    return int(value)


def _find_env_file(start_path):
    path = Path(start_path).resolve()
    search_roots = [path.parent, *path.parents]
    for root in search_roots:
        candidate = root / ".env"
        if candidate.exists():
            return candidate
    return None


def load_runtime_settings(current_file=None):
    """Load environment variables and return immutable runtime settings."""
    if current_file:
        script_path = Path(current_file).resolve()
    else:
        script_path = Path(__file__).resolve()

    env_file = _find_env_file(script_path)
    if env_file:
        load_dotenv(env_file)

    return RuntimeSettings(
        strapi_api_url=os.getenv("STRAPI_URL", "http://localhost:1337"),
        strapi_token=os.getenv("STRAPI_API_TOKEN", ""),
        strapi_http_timeout=_env_float("STRAPI_HTTP_TIMEOUT", 60.0),
        strapi_http_retries=_env_int("STRAPI_HTTP_RETRIES", 2),
        openalex_api_key=os.getenv("OPENALEX_API_KEY", "").strip(),
        openalex_mailto=os.getenv("OPENALEX_MAILTO", "").strip(),
        openalex_http_timeout=_env_float("OPENALEX_HTTP_TIMEOUT", 30.0),
        openalex_http_retries=_env_int("OPENALEX_HTTP_RETRIES", 3),
        openalex_institution_id=os.getenv("OPENALEX_INSTITUTION_ID", "").strip(),
        import_oa_only=_env_bool("PAPER_IMPORT_OA_ONLY", False),
        graph_similarity_threshold=_env_float("GRAPH_SIMILARITY_THRESHOLD", 0.5),
        graph_duplicate_threshold=_env_float("GRAPH_DUPLICATE_THRESHOLD", 0.92),
        graph_top_k=_env_int("GRAPH_TOP_K", 20),
        graph_ai_model=os.getenv("GRAPH_AI_MODEL", "all-MiniLM-L6-v2"),
        graph_hdbscan_min_cluster_size=_env_int("GRAPH_HDBSCAN_MIN_CLUSTER_SIZE", 20),
        graph_hdbscan_min_samples=_env_int("GRAPH_HDBSCAN_MIN_SAMPLES", 5),
        graph_secondary_cluster_distance_threshold=_env_float(
            "GRAPH_SECONDARY_CLUSTER_DISTANCE_THRESHOLD", 0.7
        ),
        graph_topic_hdbscan_min_cluster_size=_env_int("GRAPH_TOPIC_HDBSCAN_MIN_CLUSTER_SIZE", 3),
        graph_topic_hdbscan_min_samples=_env_int("GRAPH_TOPIC_HDBSCAN_MIN_SAMPLES", 2),
        pdf_max_bytes=_env_int("PDF_MAX_BYTES", 10 * 1024 * 1024),
        sync_lock_path=os.getenv("PAPER_SYNC_LOCK_PATH", "/var/run/paper-sync/sync.lock"),
    )
