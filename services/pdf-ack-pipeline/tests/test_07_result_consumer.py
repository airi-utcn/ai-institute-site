"""
Unit tests for result_consumer.py in coordinator_service.
Verifies:
- apply_result_message updates SQLite3 (SUCCESS -> COMPLETED, FAILED -> failed record)
- drain_results_queue drains multiple pending messages
- wait_for_paper_result waits for a specific paper and respects timeout
"""

import tempfile
import unittest
from pathlib import Path

from helpers import InMemoryQueueBridge
from coordinator_service.result_consumer import (
    apply_result_message,
    drain_results_queue,
    wait_for_paper_result,
)
from coordinator_service.state_tracker import PaperStatus, StateTracker
from shared.schemas import ResultMessage, TaskStatus


class TestResultConsumer(unittest.TestCase):
    def test_apply_result_success_and_failure(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            db_path = Path(tmp_dir) / "processed_papers.db"
            tracker = StateTracker(db_path=db_path)

            success_res = ResultMessage(
                paper_id="paper-succ",
                file_hash="hash-succ",
                status=TaskStatus.SUCCESS,
                acknowledgment_text="Thank you European Commission.",
                confidence_score=0.94,
            )
            apply_result_message(success_res, tracker)

            rec = tracker.get_record("paper-succ")
            self.assertIsNotNone(rec)
            self.assertEqual(rec["status"], PaperStatus.COMPLETED)
            self.assertAlmostEqual(rec["confidence_score"], 0.94, places=2)

            fail_res = ResultMessage(
                paper_id="paper-fail",
                file_hash="hash-fail",
                status=TaskStatus.FAILED,
                error_message="Encrypted PDF document",
            )
            apply_result_message(fail_res, tracker)

            rec_fail = tracker.get_record("paper-fail")
            self.assertIsNotNone(rec_fail)
            self.assertEqual(rec_fail["status"], PaperStatus.FAILED)
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
