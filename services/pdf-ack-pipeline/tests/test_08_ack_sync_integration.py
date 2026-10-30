"""
Integration tests for the coordinator sync flow (ack_sync.py).
Tests the complete pipeline using in-memory queues:
- 1-by-1 paper dispatch
- Worker crash simulation and automatic retry
- Permanent failure after max retries
- ACK_MAX_PAPERS_PER_RUN batch limit stopping cleanly
- Stale QUEUED task recovery on startup
- Skipping already processed papers on second run
- Full SQLite (COMPLETED) -> Strapi PUT by PDF link -> SQLite (SYNCED_TO_STRAPI) flow
"""

import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

from helpers import InMemoryQueueBridge, create_sample_pdf_file, make_test_config
from coordinator_service.ack_sync import run_ack_sync
from coordinator_service.state_tracker import PaperStatus, StateTracker
from shared.schemas import ResultMessage, TaskMessage, TaskStatus


def mock_worker_success(task: TaskMessage) -> ResultMessage:
    return ResultMessage(
        paper_id=task.paper_id,
        pdf_path=task.pdf_path,
        file_hash=task.file_hash,
        status=TaskStatus.SUCCESS,
        acknowledgment_text="Acknowledging support from National Research Grant 999.",
        confidence_score=0.92,
    )


class TestAckSyncIntegration(unittest.TestCase):
    def test_sync_with_auto_retry_and_skip(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_path = Path(tmp_dir)
            cfg = make_test_config(tmp_path, max_papers=0, retry_timeout=1, max_retries=3)

            pdf_path = cfg.pdf_storage_dir / "paper_alpha.pdf"
            create_sample_pdf_file(pdf_path, ack_text="Grant 999 support")

            tracker = StateTracker(
                db_path=cfg.state_db_path,
                retry_timeout_seconds=cfg.task_retry_timeout_seconds,
                max_retries=cfg.max_task_retries,
            )

            # Drop first attempt, succeed on second attempt
            bridge = InMemoryQueueBridge(
                worker_handler=mock_worker_success,
                auto_run_worker=True,
                fail_first_n_attempts=1,
            )

            # 1st run: should retry and succeed
            stats1 = run_ack_sync(config=cfg, tracker=tracker, queue=bridge)
            self.assertEqual(stats1["completed"], 1)
            self.assertEqual(stats1["skipped"], 0)
            self.assertEqual(stats1["failed"], 0)
            self.assertEqual(bridge.attempts_made, 2)

            # Check DB
            rec = tracker.get_record("paper_alpha")
            self.assertIsNotNone(rec)
            self.assertEqual(rec["status"], PaperStatus.COMPLETED)

            # 2nd run: should be skipped
            stats2 = run_ack_sync(config=cfg, tracker=tracker, queue=bridge)
            self.assertEqual(stats2["completed"], 0)
            self.assertEqual(stats2["skipped"], 1)
            self.assertEqual(bridge.attempts_made, 2)  # No new queue publish

    def test_sync_url_saves_to_sqlite_then_strapi_and_marks_synced(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_path = Path(tmp_dir)
            pdf_url = "https://airi.utcluj.ro/strapi/uploads/paper_horizon.pdf"
            cfg = make_test_config(
                tmp_path,
                max_papers=0,
                retry_timeout=1,
                max_retries=2,
                test_urls=(pdf_url,),
            )

            tracker = StateTracker(db_path=cfg.state_db_path)
            bridge = InMemoryQueueBridge(worker_handler=mock_worker_success)

            mock_strapi = MagicMock()
            mock_strapi.sync_acknowledgment_by_pdf_url.return_value = "real-strapi-doc-id"

            with patch("coordinator_service.ack_sync.resolve_pdf_hash", return_value="sha256-horizon-123"):
                stats = run_ack_sync(
                    config=cfg,
                    tracker=tracker,
                    queue=bridge,
                    strapi_client=mock_strapi,
                )

            self.assertEqual(stats["completed"], 1)
            mock_strapi.sync_acknowledgment_by_pdf_url.assert_called_once_with(
                pdf_path=pdf_url,
                acknowledgment_text="Acknowledging support from National Research Grant 999.",
            )

            records = tracker.list_all()
            self.assertEqual(len(records), 1)
            self.assertEqual(records[0]["pdf_path"], pdf_url)
            self.assertEqual(records[0]["status"], PaperStatus.SYNCED_TO_STRAPI)

    def test_sync_max_papers_limit(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_path = Path(tmp_dir)
            # Limit to 2 papers per run
            cfg = make_test_config(tmp_path, max_papers=2)

            for i in range(4):
                p = cfg.pdf_storage_dir / f"paper_{i:02d}.pdf"
                create_sample_pdf_file(p, ack_text=f"Ack {i}")

            tracker = StateTracker(db_path=cfg.state_db_path)
            bridge = InMemoryQueueBridge(worker_handler=mock_worker_success)

            # First run processes exactly 2 papers
            stats1 = run_ack_sync(config=cfg, tracker=tracker, queue=bridge)
            self.assertEqual(stats1["completed"], 2)

            # Second run processes the remaining 2 papers
            stats2 = run_ack_sync(config=cfg, tracker=tracker, queue=bridge)
            self.assertEqual(stats2["completed"], 2)
            self.assertEqual(stats2["skipped"], 2)

            self.assertEqual(len(tracker.list_all()), 4)

    def test_stale_queued_recovery(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_path = Path(tmp_dir)
            cfg = make_test_config(tmp_path, max_papers=0, retry_timeout=0)

            pdf_path = cfg.pdf_storage_dir / "interrupted.pdf"
            create_sample_pdf_file(pdf_path, ack_text="Ack interrupted")

            tracker = StateTracker(db_path=cfg.state_db_path, retry_timeout_seconds=0)
            # Insert a stale QUEUED record simulating a crash mid-run
            tracker.mark_as_queued("interrupted", "dummy_hash", str(pdf_path))

            bridge = InMemoryQueueBridge(worker_handler=mock_worker_success)
            stats = run_ack_sync(config=cfg, tracker=tracker, queue=bridge)

            self.assertEqual(stats["completed"], 1)
            rec = tracker.get_record("interrupted")
            self.assertEqual(rec["status"], PaperStatus.COMPLETED)


if __name__ == "__main__":
    unittest.main()
