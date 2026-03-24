import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


@dataclass(frozen=True)
class RuntimeSettings:
    strapi_api_url: str
    strapi_token: str
    graph_similarity_threshold: float
    graph_duplicate_threshold: float
    graph_ai_model: str
    graph_top_k: int


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
        graph_similarity_threshold=float(os.getenv("GRAPH_SIMILARITY_THRESHOLD", "0.5")),
        graph_duplicate_threshold=float(os.getenv("GRAPH_DUPLICATE_THRESHOLD", "0.92")),
        graph_ai_model=os.getenv("GRAPH_AI_MODEL", "all-MiniLM-L6-v2"),
        graph_top_k=int(os.getenv("GRAPH_TOP_K", "20")),
    )