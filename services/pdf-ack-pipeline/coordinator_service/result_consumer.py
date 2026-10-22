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

logger = logging.getLogger(__name__)


def apply_result_message(
    result: ResultMessage,
    tracker: StateTracker,
) -> None:
    """
    Applies a single ResultMessage from Queue 2 (`results_queue`) and saves it
    directly into the SQLite3 database (`processed_papers.db`) via `StateTracker`.
    """
    if result.status == TaskStatus.SUCCESS:
        tracker.mark_as_completed(
            paper_id=result.paper_id,
            file_hash=result.file_hash,
            ack_text=result.acknowledgment_text,
            score=result.confidence_score,
        )
    else:
        tracker.mark_as_failed(
            paper_id=result.paper_id,
            file_hash=result.file_hash,
            error_message=result.error_message,
        )


def drain_results_queue(
    queue: QueueManager,
    tracker: StateTracker,
) -> int:
    """
    Drains all currently available messages in `results_queue` without blocking
    and saves them into SQLite3. Returns the number of results processed.
    """
    processed_count = 0
    while True:
        result = queue.pop_result()
        if result is None:
            break
        apply_result_message(result=result, tracker=tracker)
        processed_count += 1
    return processed_count


def wait_for_paper_result(
    expected_paper_id: str,
    queue: QueueManager,
    tracker: StateTracker,
    timeout_seconds: Optional[int] = None,
    poll_interval: Optional[float] = None,
) -> Optional[ResultMessage]:
    """
    Waits for `expected_paper_id` to arrive on `results_queue` (Queue 2) within `timeout_seconds`
    and persists the outcome in SQLite3.
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

        apply_result_message(result=result, tracker=tracker)
        if result.paper_id == expected_paper_id:
            return result

    return None
