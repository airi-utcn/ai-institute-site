"""
Unit tests for result_consumer.py in coordinator_service.
Verifies:
- apply_result_message saves to SQLite3 first (COMPLETED), then syncs to Strapi via PDF link
  and promotes SQLite3 status to SYNCED_TO_STRAPI when acknowledgment_text is present
- Papers without acknowledgment_text remain COMPLETED in SQLite3 without calling Strapi PUT
- drain_results_queue drains multiple pending messages
- wait_for_paper_result waits for a specific paper and respects timeout
"""

import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock

from helpers import InMemoryQueueBridge
from coordinator_service.result_consumer import (
    apply_result_message,
    drain_results_queue,
    wait_for_paper_result,
)
from coordinator_service.state_tracker import PaperStatus, StateTracker
from shared.schemas import ResultMessage, TaskStatus


class TestResultConsumer(unittest.TestCase):
    def test_apply_result_success_syncs_to_strapi_and_confirms_in_sqlite(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            db_path = Path(tmp_dir) / "processed_papers.db"
            tracker = StateTracker(db_path=db_path)

            mock_strapi = MagicMock()
            mock_strapi.sync_acknowledgment_by_pdf_url.return_value = "strapi-doc-123"

            # 1. Paper WITH acknowledgment -> saved in SQLite, sent to Strapi by pdf_path, confirmed as SYNCED_TO_STRAPI
            success_res = ResultMessage(
                paper_id="test-hashed-id-999",
                pdf_path="https://airi.utcluj.ro/strapi/uploads/succ.pdf",
                file_hash="hash-succ",
                status=TaskStatus.SUCCESS,
                acknowledgment_text="Thank you European Commission.",
                confidence_score=0.94,
            )
            apply_result_message(success_res, tracker, strapi_client=mock_strapi)

            mock_strapi.sync_acknowledgment_by_pdf_url.assert_called_once_with(
                pdf_path="https://airi.utcluj.ro/strapi/uploads/succ.pdf",
                acknowledgment_text="Thank you European Commission.",
            )
            rec = tracker.get_record("test-hashed-id-999")
            self.assertIsNotNone(rec)
            self.assertEqual(rec["status"], PaperStatus.SYNCED_TO_STRAPI)
            self.assertEqual(rec["pdf_path"], "https://airi.utcluj.ro/strapi/uploads/succ.pdf")
            self.assertAlmostEqual(rec["confidence_score"], 0.94, places=2)

            # 2. Paper WITHOUT acknowledgment -> stays COMPLETED in SQLite, no Strapi call made
            mock_strapi.reset_mock()
            no_ack_res = ResultMessage(
                paper_id="paper-no-ack",
                pdf_path="https://airi.utcluj.ro/strapi/uploads/no_ack.pdf",
                file_hash="hash-no-ack",
                status=TaskStatus.SUCCESS,
                acknowledgment_text=None,
                confidence_score=None,
            )
            apply_result_message(no_ack_res, tracker, strapi_client=mock_strapi)
            mock_strapi.sync_acknowledgment_by_pdf_url.assert_not_called()
            rec_no_ack = tracker.get_record("paper-no-ack")
            self.assertEqual(rec_no_ack["status"], PaperStatus.COMPLETED)

            # 3. Failed paper -> marked FAILED
            fail_res = ResultMessage(
                paper_id="paper-fail",
                pdf_path="https://airi.utcluj.ro/strapi/uploads/fail.pdf",
                file_hash="hash-fail",
                status=TaskStatus.FAILED,
                error_message="Encrypted PDF document",
            )
            apply_result_message(fail_res, tracker, strapi_client=mock_strapi)

            rec_fail = tracker.get_record("paper-fail")
            self.assertIsNotNone(rec_fail)
            self.assertEqual(rec_fail["status"], PaperStatus.FAILED)
            self.assertEqual(rec_fail["pdf_path"], "https://airi.utcluj.ro/strapi/uploads/fail.pdf")
            self.assertEqual(rec_fail["error_message"], "Encrypted PDF document")

    def test_drain_results_queue(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            db_path = Path(tmp_dir) / "processed_papers.db"
            tracker = StateTracker(db_path=db_path)
            bridge = InMemoryQueueBridge(auto_run_worker=False)

            for i in range(3):
                bridge.push_result(
                    ResultMessage(
                        paper_id=f"paper-{i}",
                        file_hash=f"hash-{i}",
                        status=TaskStatus.SUCCESS,
                        acknowledgment_text=f"Ack {i}",
                        confidence_score=0.9,
                    )
                )

            drained = drain_results_queue(bridge, tracker)
            self.assertEqual(drained, 3)
            self.assertEqual(len(tracker.list_all()), 3)

    def test_wait_for_paper_result_timeout(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            db_path = Path(tmp_dir) / "processed_papers.db"
            tracker = StateTracker(db_path=db_path)
            bridge = InMemoryQueueBridge(auto_run_worker=False)

            # Looking for p99 which is not in queue; should return None after timeout
            res = wait_for_paper_result(
                expected_paper_id="p99",
                queue=bridge,
                tracker=tracker,
                timeout_seconds=0.2,
                poll_interval=0.05,
            )
            self.assertIsNone(res)


if __name__ == "__main__":
    unittest.main()
