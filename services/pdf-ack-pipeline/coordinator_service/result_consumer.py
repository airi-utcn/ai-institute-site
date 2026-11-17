import logging
import sys
import time
from pathlib import Path
from typing import Optional

PIPELINE_ROOT = Path(__file__).resolve().parent.parent
if str(PIPELINE_ROOT) not in sys.path:
    sys.path.insert(0, str(PIPELINE_ROOT))

from shared.config import settings
from shared.queue_manager import QueueManager
from shared.schemas import ResultMessage, TaskStatus
from state_tracker import StateTracker
from utils import StrapiAckClient, is_http_url

logger = logging.getLogger(__name__)


def apply_result_message(
    result: ResultMessage,
    tracker: StateTracker,
    strapi_client: Optional[StrapiAckClient] = None,
) -> None:
    """
    Applies a single ResultMessage from Queue 2 (`results_queue`):
    1. First saves the outcome in SQLite3 (`processed_papers.db`) with status='COMPLETED' (or 'FAILED').
    2. If `acknowledgment_text` is present and `strapi_client` is provided, matches the publication
       in Strapi by its PDF link (`pdf_path`) and sends `PUT /api/publications/{documentId}`.
    3. Once Strapi confirms, updates the SQLite3 record status to 'SYNCED_TO_STRAPI'.
    """
    if result.status == TaskStatus.SUCCESS:
        tracker.mark_as_completed(
            paper_id=result.paper_id,
            file_hash=result.file_hash,
            ack_text=result.acknowledgment_text,
            score=result.confidence_score,
            pdf_path=result.pdf_path,
        )

        ack_text = (result.acknowledgment_text or "").strip()
        if ack_text and strapi_client is not None:
            resolved_pdf_path = result.pdf_path
            if not resolved_pdf_path:
                record = tracker.get_record(result.paper_id)
                resolved_pdf_path = (record or {}).get("pdf_path", "")

            if resolved_pdf_path and is_http_url(resolved_pdf_path):
                synced_doc_id = strapi_client.sync_acknowledgment_by_pdf_url(
                    pdf_path=resolved_pdf_path,
                    acknowledgment_text=ack_text,
                )
                if synced_doc_id:
                    tracker.mark_as_synced_to_strapi(result.paper_id)
    else:
        tracker.mark_as_failed(
            paper_id=result.paper_id,
            file_hash=result.file_hash,
            error_message=result.error_message,
            pdf_path=result.pdf_path,
        )


def drain_results_queue(
    queue: QueueManager,
    tracker: StateTracker,
    strapi_client: Optional[StrapiAckClient] = None,
) -> int:
    """
    Drains all currently available messages in `results_queue` without blocking,
    saves them into SQLite3, and syncs extracted acknowledgments to Strapi.
    Returns the number of results processed.
    """
    processed_count = 0
    while True:
        result = queue.pop_result()
        if result is None:
            break
        apply_result_message(result=result, tracker=tracker, strapi_client=strapi_client)
        processed_count += 1
    return processed_count


def wait_for_paper_result(
    expected_paper_id: str,
    queue: QueueManager,
    tracker: StateTracker,
    timeout_seconds: Optional[int] = None,
    poll_interval: Optional[float] = None,
    strapi_client: Optional[StrapiAckClient] = None,
) -> Optional[ResultMessage]:
    """
    Waits for `expected_paper_id` to arrive on `results_queue` (Queue 2) within `timeout_seconds`,
    persists the outcome in SQLite3 first, and syncs to Strapi if an acknowledgment was extracted.
    Returns the `ResultMessage` if received in time, or `None` on timeout.
    """
    timeout = timeout_seconds if timeout_seconds is not None else settings.task_retry_timeout_seconds
    interval = poll_interval if poll_interval is not None else settings.coordinator_result_poll_seconds
    deadline = time.monotonic() + max(1.0, float(timeout))

    while time.monotonic() < deadline:
        result = queue.pop_result()
        if result is None:
            time.sleep(interval)
            continue

        apply_result_message(result=result, tracker=tracker, strapi_client=strapi_client)
        if result.paper_id == expected_paper_id:
            return result

    return None
