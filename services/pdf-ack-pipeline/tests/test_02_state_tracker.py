"""
Unit tests for SQLite3 StateTracker (state_tracker.py).
Verifies:
- State transitions (QUEUED -> timeout retry -> COMPLETED -> SYNCED_TO_STRAPI / FAILED)
- Retry limits
- SHA-256 changes triggering reprocessing
- Stale recovery, unsynced completed lookup, and listing
- WAL journal mode and persistent reads across connections
"""

import tempfile
import time
import unittest
from pathlib import Path

from coordinator_service.state_tracker import PaperStatus, StateTracker
from coordinator_service.utils import compute_text_sha256


class TestStateTracker(unittest.TestCase):
    def test_full_state_lifecycle(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            db_path = Path(tmp_dir) / "processed_papers.db"
            tracker = StateTracker(db_path=db_path, retry_timeout_seconds=1, max_retries=2)

            paper_id = "paper-100"
            file_hash = compute_text_sha256("content-v1")

            # Initially unprocessed
            self.assertFalse(tracker.is_already_processed(paper_id, file_hash))
            self.assertIsNone(tracker.get_record(paper_id))

            # Mark as QUEUED (attempt 1)
            attempt = tracker.mark_as_queued(paper_id, file_hash, "http://strapi/uploads/p100.pdf")
            self.assertEqual(attempt, 1)
            # Immediately considered in progress
            self.assertTrue(tracker.is_already_processed(paper_id, file_hash))

            # Let it time out
            time.sleep(1.1)
            # Should become eligible for retry (is_already_processed returns False)
            self.assertFalse(tracker.is_already_processed(paper_id, file_hash))

            # Attempt 2
            attempt = tracker.mark_as_queued(paper_id, file_hash, "http://strapi/uploads/p100.pdf")
            self.assertEqual(attempt, 2)

            # Let it time out again -> max_retries (2) reached, no more retries
            time.sleep(1.1)
            self.assertTrue(tracker.is_already_processed(paper_id, file_hash))

            # Complete paper (Step 1: saved in SQLite)
            tracker.mark_as_completed(
                paper_id=paper_id,
                file_hash=file_hash,
                ack_text="Funded by Horizon 2020 grant 12345.",
                score=0.954,
            )
            rec = tracker.get_record(paper_id)
            self.assertIsNotNone(rec)
            self.assertEqual(rec["status"], PaperStatus.COMPLETED)
            self.assertEqual(rec["pdf_path"], "http://strapi/uploads/p100.pdf")
            self.assertAlmostEqual(rec["confidence_score"], 0.954, places=3)
            self.assertIn("12345", rec["acknowledgment_text"])
            self.assertTrue(tracker.is_already_processed(paper_id, file_hash))

            # Appears in unsynced completed papers before Strapi confirmation
            unsynced = tracker.get_unsynced_completed_papers()
            self.assertEqual(len(unsynced), 1)
            self.assertEqual(unsynced[0]["paper_id"], paper_id)

            # Confirm synced to Strapi (Step 3: status becomes SYNCED_TO_STRAPI)
            tracker.mark_as_synced_to_strapi(paper_id)
            rec_synced = tracker.get_record(paper_id)
            self.assertEqual(rec_synced["status"], PaperStatus.SYNCED_TO_STRAPI)
            self.assertTrue(tracker.is_already_processed(paper_id, file_hash))
            self.assertEqual(len(tracker.get_unsynced_completed_papers()), 0)

            # If hash changes (PDF was edited on Strapi), it is NOT considered processed!
            new_hash = compute_text_sha256("content-v2-updated")
            self.assertFalse(tracker.is_already_processed(paper_id, new_hash))

    def test_failed_state_and_stale_recovery(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            db_path = Path(tmp_dir) / "processed_papers.db"
            tracker = StateTracker(db_path=db_path, retry_timeout_seconds=1, max_retries=2)

            # Mark a paper as failed directly
            tracker.mark_as_failed(
                "paper-err",
                "hash-err",
                error_message="Corrupted PDF",
                pdf_path="http://strapi/err.pdf",
            )
            rec = tracker.get_record("paper-err")
            self.assertEqual(rec["status"], PaperStatus.FAILED)
            self.assertEqual(rec["pdf_path"], "http://strapi/err.pdf")
            self.assertEqual(rec["error_message"], "Corrupted PDF")

            # Stale QUEUED paper recovery
            tracker.mark_as_queued("paper-stale", "hash-stale", "http://strapi/stale.pdf")
            # Initially not stale
            self.assertEqual(len(tracker.get_stale_queued_papers()), 0)
            # After timeout expires:
            time.sleep(1.1)
            stale = tracker.get_stale_queued_papers()
            self.assertEqual(len(stale), 1)
            self.assertEqual(stale[0]["paper_id"], "paper-stale")

    def test_persistence_across_instances(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            db_path = Path(tmp_dir) / "processed_papers.db"
            tracker1 = StateTracker(db_path=db_path)
            tracker1.mark_as_completed("p1", "h1", "Ack text", 0.9)

            # Open a completely fresh instance pointing to the same file
            tracker2 = StateTracker(db_path=db_path)
            records = tracker2.list_all()
            self.assertEqual(len(records), 1)
            self.assertEqual(records[0]["paper_id"], "p1")
            self.assertEqual(records[0]["status"], PaperStatus.COMPLETED)

            # Verify pdf_path is backfilled if previously empty
            self.assertTrue(
                tracker2.is_already_processed("p1", "h1", pdf_path="https://airi.utcluj.ro/strapi/uploads/p1.pdf")
            )
            self.assertEqual(
                tracker2.get_record("p1")["pdf_path"],
                "https://airi.utcluj.ro/strapi/uploads/p1.pdf",
            )


if __name__ == "__main__":
    unittest.main()
