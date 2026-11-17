import logging
import sys
from pathlib import Path
from typing import Any, Dict, Iterator, List, Optional

PIPELINE_ROOT = Path(__file__).resolve().parent.parent
if str(PIPELINE_ROOT) not in sys.path:
    sys.path.insert(0, str(PIPELINE_ROOT))

from result_consumer import drain_results_queue, wait_for_paper_result
from shared.config import PipelineConfig, settings
from shared.queue_manager import QueueManager
from shared.schemas import TaskMessage
from state_tracker import PaperStatus, StateTracker
from utils import (
    StrapiAckClient,
    compute_text_sha256,
    is_http_url,
    resolve_pdf_hash,
)

logger = logging.getLogger(__name__)


def build_strapi_client(config: PipelineConfig = settings) -> StrapiAckClient:
    """Creates a StrapiAckClient configured from `PipelineConfig`."""
    strapi_base = config.strapi_internal_url or config.strapi_url or config.public_strapi_url
    media_base = config.public_strapi_url or strapi_base
    return StrapiAckClient(
        api_base_url=strapi_base,
        token=config.strapi_api_token,
        media_base_url=media_base,
        page_size=config.strapi_page_size,
        timeout=config.strapi_timeout_seconds,
    )


def sync_pending_completed_to_strapi(
    tracker: StateTracker,
    strapi_client: Optional[StrapiAckClient],
) -> int:
    """
    Finds any records in SQLite that have `status = 'COMPLETED'` and a non-empty
    `acknowledgment_text`, looks up their publication in Strapi by `pdf_path` link,
    updates the `acknowledgment` field in Strapi, and promotes their SQLite status
    to `SYNCED_TO_STRAPI`.
    """
    if strapi_client is None:
        return 0

    unsynced = tracker.get_unsynced_completed_papers()
    synced_count = 0
    for row in unsynced:
        pdf_path = row.get("pdf_path") or ""
        ack_text = (row.get("acknowledgment_text") or "").strip()
        if not pdf_path or not ack_text or not is_http_url(pdf_path):
            continue

        synced_doc_id = strapi_client.sync_acknowledgment_by_pdf_url(
            pdf_path=pdf_path,
            acknowledgment_text=ack_text,
            fallback_document_id=row.get("paper_id"),
        )
        if synced_doc_id:
            tracker.mark_as_synced_to_strapi(row["paper_id"])
            synced_count += 1
            logger.info(
                "[SYNCED_TO_STRAPI] paper_id='%s' -> Strapi documentId='%s' (pdf='%s').",
                row["paper_id"],
                synced_doc_id,
                pdf_path,
            )
        else:
            logger.warning(
                "Could not sync acknowledgment for paper_id='%s' (pdf='%s') to Strapi.",
                row["paper_id"],
                pdf_path,
            )

    return synced_count


def iter_candidate_papers(
    config: PipelineConfig = settings,
    strapi_client: Optional[StrapiAckClient] = None,
    override_pdf_urls: Optional[List[str]] = None,
) -> Iterator[Dict[str, Any]]:
    """
    Yields publication dictionaries `{paper_id, title, pdf_path, strapi_hash}` to process.
    Precedence:
    1. `override_pdf_urls` (CLI `--pdf-url`)
    2. `config.ack_test_pdf_urls` (if non-empty)
    3. Local PDFs in `config.pdf_storage_dir` (if non-empty)
    4. Strapi publications via `StrapiAckClient.iter_publications_with_pdfs()`
    """
    urls = override_pdf_urls if override_pdf_urls is not None else config.ack_test_pdf_urls
    if urls:
        logger.info("Using %d test PDF URL(s) from configuration.", len(urls))
        for raw_url in urls:
            url = raw_url.strip()
            if not url:
                continue
            synthetic_id = compute_text_sha256(url)[:24]
            yield {
                "paper_id": synthetic_id,
                "title": url.split("/")[-1] or synthetic_id,
                "pdf_path": url,
                "strapi_hash": None,
            }
        return

    if config.pdf_storage_dir.is_dir():
        local_pdfs = sorted(config.pdf_storage_dir.glob("*.pdf"))
        if local_pdfs:
            logger.info("Reading %d local PDF file(s) from '%s'...", len(local_pdfs), config.pdf_storage_dir)
            for pdf_file in local_pdfs:
                yield {
                    "paper_id": pdf_file.stem,
                    "title": pdf_file.name,
                    "pdf_path": str(pdf_file.resolve()),
                    "strapi_hash": None,
                }
            return

    client = strapi_client or build_strapi_client(config)
    logger.info("Fetching publications with PDFs from Strapi: %s/publications", client.api_url)
    try:
        yield from client.iter_publications_with_pdfs()
    except Exception as exc:
        logger.warning("Could not fetch publications from Strapi (%s).", exc)


def process_single_paper_with_retry(
    paper: Dict[str, Any],
    tracker: StateTracker,
    queue: QueueManager,
    config: PipelineConfig = settings,
    strapi_client: Optional[StrapiAckClient] = None,
) -> str:
    """
    Processes a single paper end-to-end (1-by-1):
    1. Computes the PDF SHA-256 fingerprint without saving the PDF to disk.
    2. Checks `tracker.is_already_processed(paper_id, file_hash, pdf_path=pdf_path)`.
       If already `COMPLETED` with an acknowledgment that hasn't been synced to Strapi yet,
       syncs it to Strapi via `pdf_path` and marks `SYNCED_TO_STRAPI`.
    3. Pushes `TaskMessage` to Queue 1 (`tasks_queue`) and marks it as `QUEUED`.
    4. Waits for the worker's response on Queue 2 (`results_queue`), saves first to SQLite3
       (`COMPLETED`), then sends `acknowledgment` to Strapi by `pdf_path` and updates SQLite3
       to `SYNCED_TO_STRAPI`.
    5. Automatically retries up to `max_task_retries` if the worker crashes or times out.

    Returns one of: 'skipped', 'completed', 'failed'.
    """
    paper_id = paper["paper_id"]
    pdf_path = paper["pdf_path"]
    title = paper.get("title") or paper_id

    logger.info("[FILE DISCOVERED] paper_id='%s' | title='%s' | file='%s'", paper_id, title[:70], pdf_path)

    try:
        file_hash = resolve_pdf_hash(
            pdf_source=pdf_path,
            strapi_hash=paper.get("strapi_hash"),
            compute_stream=config.compute_sha256_stream,
            timeout=config.strapi_timeout_seconds,
        )
    except Exception as exc:
        logger.error(
            "Failed to access PDF or compute fingerprint for paper_id='%s' (file='%s'): %s",
            paper_id,
            pdf_path,
            exc,
        )
        tracker.mark_as_failed(
            paper_id=paper_id,
            file_hash="",
            error_message=f"Fingerprint failed: {exc}",
            pdf_path=pdf_path,
        )
        return "failed"

    logger.info(
        "[HASH COMPUTED] paper_id='%s' | file='%s' | sha256=%s",
        paper_id,
        pdf_path,
        file_hash,
    )

    if tracker.is_already_processed(paper_id, file_hash, pdf_path=pdf_path):
        existing = tracker.get_record(paper_id)
        if (
            existing
            and existing.get("status") == PaperStatus.COMPLETED
            and existing.get("acknowledgment_text")
            and strapi_client is not None
            and is_http_url(pdf_path)
        ):
            synced_doc_id = strapi_client.sync_acknowledgment_by_pdf_url(
                pdf_path=pdf_path,
                acknowledgment_text=existing["acknowledgment_text"],
            )
            if synced_doc_id:
                tracker.mark_as_synced_to_strapi(paper_id)

        logger.info(
            "[SKIP] paper_id='%s' | file='%s' is already processed (hash=%s...).",
            paper_id,
            pdf_path,
            file_hash[:12],
        )
        return "skipped"

    while True:
        attempt = tracker.mark_as_queued(paper_id=paper_id, file_hash=file_hash, pdf_path=pdf_path)
        task_msg = TaskMessage(paper_id=paper_id, pdf_path=pdf_path, file_hash=file_hash)

        logger.info(
            "[DISPATCHING TASK] paper_id='%s' | file='%s' | attempt=%d/%d -> queue='%s'",
            paper_id,
            pdf_path,
            attempt,
            config.max_task_retries,
            config.tasks_queue,
        )
        queue.push_task(task_msg)

        logger.info(
            "[WAITING FOR RESULT] paper_id='%s' | file='%s' <- listening on queue='%s' (timeout=%ds)...",
            paper_id,
            pdf_path,
            config.results_queue,
            config.task_retry_timeout_seconds,
        )
        result = wait_for_paper_result(
            expected_paper_id=paper_id,
            queue=queue,
            tracker=tracker,
            timeout_seconds=config.task_retry_timeout_seconds,
            poll_interval=config.coordinator_result_poll_seconds,
            strapi_client=strapi_client,
        )

        if result is not None and result.status.value == "success":
            final_rec = tracker.get_record(paper_id)
            final_status = final_rec["status"] if final_rec else PaperStatus.COMPLETED
            ack_preview = (result.acknowledgment_text or "No acknowledgment found")[:100]
            logger.info(
                "[SAVED TO SQLITE DB] paper_id='%s' | file='%s' | status='%s' | confidence=%s | ack='%s'",
                paper_id,
                pdf_path,
                final_status,
                f"{result.confidence_score:.4f}" if result.confidence_score is not None else "None",
                ack_preview,
            )
            return "completed"

        if attempt >= config.max_task_retries:
            if result is None:
                tracker.mark_as_failed(
                    paper_id=paper_id,
                    file_hash=file_hash,
                    error_message=f"Worker timed out after {config.task_retry_timeout_seconds}s (attempt {attempt}/{config.max_task_retries})",
                    pdf_path=pdf_path,
                )
            logger.error(
                "Paper '%s' (file='%s') failed after %d/%d attempts.",
                paper_id,
                pdf_path,
                attempt,
                config.max_task_retries,
            )
            return "failed"

        logger.warning(
            "No valid response for paper_id='%s' (file='%s') on attempt %d/%d. Retrying...",
            paper_id,
            pdf_path,
            attempt,
            config.max_task_retries,
        )


def run_ack_sync(
    config: PipelineConfig = settings,
    override_pdf_urls: Optional[List[str]] = None,
    max_papers: Optional[int] = None,
    tracker: Optional[StateTracker] = None,
    queue: Optional[QueueManager] = None,
    strapi_client: Optional[StrapiAckClient] = None,
) -> Dict[str, int]:
    """
    Main synchronization job triggered by cron or CLI:
    1. Drains any leftover results in `results_queue` into SQLite3 (and Strapi).
    2. Syncs any previously `COMPLETED` SQLite records with acknowledgments to Strapi (`SYNCED_TO_STRAPI`).
    3. Re-queues any stale `QUEUED` tasks from interrupted runs.
    4. Iterates through candidate PDFs one by one (up to `max_papers` if > 0),
       dispatching to `worker_service` and persisting results into SQLite3 (`processed_papers.db`).
    """
    own_queue = queue is None
    active_tracker = tracker or StateTracker(
        db_path=config.state_db_path,
        retry_timeout_seconds=config.task_retry_timeout_seconds,
        max_retries=config.max_task_retries,
    )
    active_queue = queue or QueueManager(config)
    active_strapi = strapi_client or build_strapi_client(config)
    limit = max_papers if max_papers is not None else config.ack_max_papers_per_run

    stats: Dict[str, int] = {
        "drained_on_start": 0,
        "synced_to_strapi": 0,
        "scanned": 0,
        "completed": 0,
        "skipped": 0,
        "failed": 0,
    }

    try:
        stats["drained_on_start"] = drain_results_queue(
            queue=active_queue,
            tracker=active_tracker,
            strapi_client=active_strapi,
        )

        stats["synced_to_strapi"] = sync_pending_completed_to_strapi(
            tracker=active_tracker,
            strapi_client=active_strapi,
        )

        # First retry any stale QUEUED tasks left over from previous crashed runs
        stale_records = active_tracker.get_stale_queued_papers()
        for stale in stale_records:
            if limit > 0 and (stats["completed"] + stats["failed"]) >= limit:
                break
            if not stale.get("pdf_path"):
                continue
            logger.info(
                "Recovering stale QUEUED paper_id='%s' (file='%s')...",
                stale["paper_id"],
                stale["pdf_path"],
            )
            outcome = process_single_paper_with_retry(
                paper={
                    "paper_id": stale["paper_id"],
                    "title": stale["paper_id"],
                    "pdf_path": stale["pdf_path"],
                    "strapi_hash": None,
                },
                tracker=active_tracker,
                queue=active_queue,
                config=config,
                strapi_client=active_strapi,
            )
            stats["scanned"] += 1
            stats[outcome] += 1

        # Process candidate papers 1-by-1
        for paper in iter_candidate_papers(
            config=config,
            strapi_client=active_strapi,
            override_pdf_urls=override_pdf_urls,
        ):
            if limit > 0 and (stats["completed"] + stats["failed"]) >= limit:
                logger.info(
                    "Reached ACK_MAX_PAPERS_PER_RUN limit (%d processed papers). Stopping batch cleanly.",
                    limit,
                )
                break

            stats["scanned"] += 1
            outcome = process_single_paper_with_retry(
                paper=paper,
                tracker=active_tracker,
                queue=active_queue,
                config=config,
                strapi_client=active_strapi,
            )
            stats[outcome] += 1

        logger.info(
            "Sync completed: scanned=%d | completed=%d | skipped=%d | failed=%d | drained=%d -> Coordinator Python process exiting (returning to cron standby).",
            stats["scanned"],
            stats["completed"],
            stats["skipped"],
            stats["failed"],
            stats["drained_on_start"],
        )
        return stats
    finally:
        if own_queue:
            active_queue.close()
