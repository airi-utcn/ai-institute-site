import logging
import signal
import sys
import time
from pathlib import Path
from typing import Optional

# Ensure the pipeline root is on sys.path so `shared` can be imported
PIPELINE_ROOT = Path(__file__).resolve().parent.parent
if str(PIPELINE_ROOT) not in sys.path:
    sys.path.insert(0, str(PIPELINE_ROOT))

from shared.config import settings
from shared.queue_manager import QueueManager
from shared.schemas import ResultMessage, TaskMessage, TaskStatus
from src.pdf_chunker import extract_candidate_chunks
from src.semantic_extractor import SemanticExtractor

logger = logging.getLogger("worker_service")

_running = True


def _handle_shutdown(signum, frame) -> None:
    global _running
    logger.info("Received shutdown signal (%s). Stopping worker gracefully...", signum)
    _running = False


def log_startup_configuration(
    extractor: SemanticExtractor,
    max_papers: int,
    idle_exit_seconds: int,
) -> None:
    """Logs active worker, queue, and AI model configurations at startup."""
    logger.info("============================================================")
    logger.info("PDF Acknowledgment Worker Service - Configuration Summary")
    logger.info("------------------------------------------------------------")
    logger.info(
        "RabbitMQ Broker   : %s:%s (vhost='%s', user='%s')",
        settings.rabbitmq_host,
        settings.rabbitmq_port,
        settings.rabbitmq_vhost,
        settings.rabbitmq_user,
    )
    logger.info(
        "Queues            : '%s' -> '%s' (poll=%ds, idle_exit=%ds, max_papers=%s)",
        settings.tasks_queue,
        settings.results_queue,
        settings.worker_poll_interval_seconds,
        idle_exit_seconds,
        max_papers if max_papers > 0 else "unlimited",
    )
    logger.info("Bi-Encoder Model  : %s", extractor.bi_model_name)
    logger.info("Cross-Encoder     : %s", extractor.cross_model_name)
    logger.info("Model Cache Dir   : %s", extractor.cache_dir)
    logger.info(
        "AI Thresholds     : final=%.2f | bi=%.2f | cross=%.2f | top_k=%d",
        settings.ai_confidence_threshold,
        settings.ai_bi_threshold,
        settings.ai_cross_threshold,
        settings.ai_top_k,
    )
    logger.info("============================================================")


def process_task(task: TaskMessage, extractor: SemanticExtractor) -> ResultMessage:
    """
    Processes a single PDF task from tasks_queue:
    1. Extracts candidate paragraphs from the PDF via pdf_chunker.
    2. Runs the 2-stage AI SemanticExtractor.
    3. Packages the result into a ResultMessage for results_queue.
    """
    start_time = time.monotonic()
    logger.info(
        "[WORKER START] paper_id='%s' | file='%s' | hash=%s...",
        task.paper_id,
        task.pdf_path,
        task.file_hash[:12],
    )

    try:
        chunks = extract_candidate_chunks(task.pdf_path)
        matches = extractor.extract(
            chunks,
            threshold=settings.ai_confidence_threshold,
            bi_threshold=settings.ai_bi_threshold,
            cross_threshold=settings.ai_cross_threshold,
            top_k=settings.ai_top_k,
        )
        elapsed = time.monotonic() - start_time

        if matches:
            ack_text = "\n\n".join(item["text"] for item in matches)
            best_confidence = max(float(item["confidence"]) for item in matches)
            logger.info(
                "[WORKER DONE] paper_id='%s' | file='%s' | extracted in %.2fs | confidence=%.4f",
                task.paper_id,
                task.pdf_path,
                elapsed,
                best_confidence,
            )
        else:
            ack_text = None
            best_confidence = None
            logger.info(
                "[WORKER DONE] paper_id='%s' | file='%s' | no acknowledgment found in %.2fs",
                task.paper_id,
                task.pdf_path,
                elapsed,
            )

        return ResultMessage(
            paper_id=task.paper_id,
            file_hash=task.file_hash,
            status=TaskStatus.SUCCESS,
            acknowledgment_text=ack_text,
            confidence_score=best_confidence,
        )

    except Exception as exc:
        logger.exception("Failed to process paper_id='%s' (file='%s'): %s", task.paper_id, task.pdf_path, exc)
        return ResultMessage(
            paper_id=task.paper_id,
            file_hash=task.file_hash,
            status=TaskStatus.FAILED,
            acknowledgment_text=None,
            confidence_score=None,
            error_message=str(exc),
        )


def run_worker(
    max_papers: Optional[int] = None,
    idle_exit_seconds: Optional[int] = None,
) -> int:
    """
    Main worker batch loop triggered by entrypoint.sh / cron.
    Consumes tasks from tasks_queue and publishes to results_queue, then exits
    cleanly once the batch limit is reached or the queue has been empty for
    `idle_exit_seconds` so the container returns to lightweight `cron -f` mode.
    """
    signal.signal(signal.SIGINT, _handle_shutdown)
    signal.signal(signal.SIGTERM, _handle_shutdown)

    effective_limit = (
        max_papers if max_papers is not None else settings.ack_max_papers_per_run
    )
    effective_idle_exit = (
        idle_exit_seconds
        if idle_exit_seconds is not None
        else settings.worker_idle_exit_seconds
    )

    queue = QueueManager(settings)
    extractor = SemanticExtractor(
        bi_model_name=settings.ai_bi_model,
        cross_model_name=settings.ai_cross_model,
        cache_dir=settings.model_cache_dir,
    )

    log_startup_configuration(extractor, effective_limit, effective_idle_exit)

    processed_count = 0
    last_activity_ts = time.monotonic()

    try:
        while _running:
            try:
                task = queue.pop_task()
            except Exception as conn_err:
                logger.warning(
                    "Could not poll RabbitMQ (%s). Retrying in %ds...",
                    conn_err,
                    settings.worker_poll_interval_seconds,
                )
                time.sleep(settings.worker_poll_interval_seconds)
                continue

            if task is None:
                idle_elapsed = time.monotonic() - last_activity_ts
                if effective_idle_exit > 0 and idle_elapsed >= effective_idle_exit:
                    logger.info(
                        "No tasks in '%s' for %.0fs (processed=%d). Exiting worker Python process so container returns to cron standby.",
                        settings.tasks_queue,
                        idle_elapsed,
                        processed_count,
                    )
                    break
                time.sleep(settings.worker_poll_interval_seconds)
                continue

            result = process_task(task, extractor)
            queue.push_result(result)
            processed_count += 1
            last_activity_ts = time.monotonic()

            if effective_limit > 0 and processed_count >= effective_limit:
                logger.info(
                    "Reached ACK_MAX_PAPERS_PER_RUN limit (%d tasks processed). Exiting worker Python process so container returns to cron standby.",
                    effective_limit,
                )
                break

    finally:
        queue.close()
        logger.info("Worker batch stopped cleanly (total processed=%d).", processed_count)

    return processed_count


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%H:%M:%S",
    )

    # Suppress verbose HTTP request logs from httpx and httpcore
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)

    run_worker()
