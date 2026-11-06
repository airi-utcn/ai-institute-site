import os
from dataclasses import dataclass
from pathlib import Path
from typing import Optional, Tuple

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None

PIPELINE_ROOT = Path(__file__).resolve().parent.parent


def _find_env_file(start_path: Path) -> Optional[Path]:
    for root in [start_path, *start_path.parents]:
        candidate = root / ".env"
        if candidate.is_file():
            return candidate
    return None


def _resolve_path(raw_path: str, base_dir: Path) -> Path:
    path = Path(raw_path)
    if path.is_absolute():
        return path
    return (base_dir / path).resolve()


def _parse_bool(value: Optional[str], default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _parse_csv(value: Optional[str]) -> Tuple[str, ...]:
    if not value:
        return ()
    return tuple(item.strip() for item in value.split(",") if item.strip())


@dataclass(frozen=True)
class PipelineConfig:
    # RabbitMQ Connection
    rabbitmq_host: str
    rabbitmq_port: int
    rabbitmq_user: str
    rabbitmq_password: str
    rabbitmq_vhost: str

    # Queue Names
    tasks_queue: str
    results_queue: str

    # Directories & Paths
    pdf_storage_dir: Path
    state_db_path: Path
    model_cache_dir: Path

    # Worker AI Settings
    ai_bi_model: str
    ai_cross_model: str
    ai_confidence_threshold: float
    ai_bi_threshold: float
    ai_cross_threshold: float
    ai_top_k: int
    ai_slm_enabled: bool
    ai_slm_model: str
    ai_slm_prompt_file: Path
    ai_slm_max_new_tokens: int
    ai_slm_temperature: float
    worker_poll_interval_seconds: int
    worker_idle_exit_seconds: int

    # Strapi & PDF Source Settings
    strapi_url: str
    strapi_internal_url: str
    public_strapi_url: str
    strapi_api_token: str
    strapi_page_size: int
    strapi_timeout_seconds: int
    compute_sha256_stream: bool
    ack_test_pdf_urls: Tuple[str, ...]
    ack_max_papers_per_run: int

    # Coordinator Scheduler & Retry Settings
    ack_sync_cron: str
    ack_sync_tz: str
    ack_run_on_startup: bool
    task_retry_timeout_seconds: int
    max_task_retries: int
    coordinator_result_poll_seconds: float


def load_config() -> PipelineConfig:
    """Loads environment variables from .env and returns immutable pipeline configuration."""
    env_file = _find_env_file(PIPELINE_ROOT)
    if env_file and load_dotenv is not None:
        load_dotenv(env_file)

    public_strapi = (
        os.getenv("PUBLIC_STRAPI_URL")
        or os.getenv("NEXT_PUBLIC_STRAPI_URL")
        or os.getenv("STRAPI_URL")
        or "https://airi.utcluj.ro/strapi"
    ).rstrip("/")
    strapi_url = (os.getenv("STRAPI_URL") or public_strapi).rstrip("/")
    strapi_internal = (os.getenv("STRAPI_INTERNAL_URL") or public_strapi).rstrip("/")

    return PipelineConfig(
        rabbitmq_host=os.getenv("RABBITMQ_HOST", "localhost"),
        rabbitmq_port=int(os.getenv("RABBITMQ_PORT", "5672")),
        rabbitmq_user=os.getenv("RABBITMQ_USER", "guest"),
        rabbitmq_password=os.getenv("RABBITMQ_PASSWORD", "guest"),
        rabbitmq_vhost=os.getenv("RABBITMQ_VHOST", "/"),
        tasks_queue=os.getenv("TASKS_QUEUE_NAME", "tasks_queue"),
        results_queue=os.getenv("RESULTS_QUEUE_NAME", "results_queue"),
        pdf_storage_dir=_resolve_path(os.getenv("PDF_STORAGE_DIR", "./data/pdfs"), PIPELINE_ROOT),
        state_db_path=_resolve_path(
            os.getenv("STATE_DB_PATH", "./data/state/processed_papers.db"),
            PIPELINE_ROOT,
        ),
        model_cache_dir=_resolve_path(
            os.getenv("MODEL_CACHE_DIR", "./worker_service/.model_cache"),
            PIPELINE_ROOT,
        ),
        ai_bi_model=os.getenv("AI_BI_MODEL", "all-MiniLM-L6-v2"),
        ai_cross_model=os.getenv("AI_CROSS_MODEL", "cross-encoder/ms-marco-MiniLM-L-6-v2"),
        ai_confidence_threshold=float(os.getenv("AI_CONFIDENCE_THRESHOLD", "0.55")),
        ai_bi_threshold=float(os.getenv("AI_BI_THRESHOLD", "0.60")),
        ai_cross_threshold=float(os.getenv("AI_CROSS_THRESHOLD", "0.05")),
        ai_top_k=int(os.getenv("AI_TOP_K", "5")),
        ai_slm_enabled=_parse_bool(os.getenv("AI_SLM_ENABLED"), default=True),
        ai_slm_model=os.getenv("AI_SLM_MODEL", "Qwen/Qwen3.5-0.8B"),
        ai_slm_prompt_file=_resolve_path(
            os.getenv("AI_SLM_PROMPT_FILE", "./worker_service/semantic_data/slm_cleanup_prompt.txt"),
            PIPELINE_ROOT,
        ),
        ai_slm_max_new_tokens=int(os.getenv("AI_SLM_MAX_NEW_TOKENS", "512")),
        ai_slm_temperature=float(os.getenv("AI_SLM_TEMPERATURE", "0.2")),
        worker_poll_interval_seconds=int(os.getenv("WORKER_POLL_INTERVAL_SECONDS", "5")),
        worker_idle_exit_seconds=int(os.getenv("WORKER_IDLE_EXIT_SECONDS", "60")),
        strapi_url=strapi_url,
        strapi_internal_url=strapi_internal,
        public_strapi_url=public_strapi,
        strapi_api_token=os.getenv("STRAPI_API_TOKEN", ""),
        strapi_page_size=int(os.getenv("STRAPI_PAGE_SIZE", "100")),
        strapi_timeout_seconds=int(os.getenv("STRAPI_TIMEOUT_SECONDS", "30")),
        compute_sha256_stream=_parse_bool(os.getenv("COMPUTE_SHA256_STREAM"), default=True),
        ack_test_pdf_urls=_parse_csv(os.getenv("ACK_TEST_PDF_URLS")),
        ack_max_papers_per_run=int(os.getenv("ACK_MAX_PAPERS_PER_RUN", "0")),
        ack_sync_cron=os.getenv("ACK_SYNC_CRON", "0 2 * * 6"),
        ack_sync_tz=os.getenv("ACK_SYNC_TZ", os.getenv("TZ", "UTC")),
        ack_run_on_startup=_parse_bool(os.getenv("ACK_RUN_ON_STARTUP"), default=True),
        task_retry_timeout_seconds=int(os.getenv("TASK_RETRY_TIMEOUT_SECONDS", "300")),
        max_task_retries=int(os.getenv("MAX_TASK_RETRIES", "3")),
        coordinator_result_poll_seconds=float(os.getenv("COORDINATOR_RESULT_POLL_SECONDS", "1.0")),
    )


settings = load_config()
