"""
Integration tests for worker_service lifecycle and batch loop (worker_service/main.py).
Verifies:
- Worker process_task returns SUCCESS or FAILED with clean exception handling
- Worker loop exits cleanly when max_papers limit is reached
- Worker loop exits after worker_idle_exit_seconds when the queue is empty
"""

import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

from helpers import create_sample_pdf_file
from shared.schemas import ResultMessage, TaskMessage, TaskStatus
from worker_service.main import process_task, run_worker


class _LoopGuard(BaseException):
    """
    Raised by the mocked queue after too many polls. It bypasses the worker's
    `except Exception` retry handler, so a broken exit condition fails the test
    instead of hanging it forever.
    """


class TestWorkerLoop(unittest.TestCase):
    def test_process_task_success_and_fallback(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            pdf_path = Path(tmp_dir) / "doc.pdf"
            create_sample_pdf_file(pdf_path, ack_text="Supported by grant ABC.")

            mock_extractor = MagicMock()
            mock_extractor.extract.return_value = [
                {"text": "Supported by grant ABC.", "confidence": 0.88}
            ]

            task = TaskMessage(paper_id="doc-1", pdf_path=str(pdf_path), file_hash="hash-1")
            res = process_task(task, mock_extractor)

            self.assertEqual(res.status, TaskStatus.SUCCESS)
            self.assertEqual(res.acknowledgment_text, "Supported by grant ABC.")
            self.assertAlmostEqual(res.confidence_score, 0.88, places=2)

    def test_process_task_no_acknowledgment_found(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            pdf_path = Path(tmp_dir) / "doc.pdf"
            create_sample_pdf_file(pdf_path, ack_text=None)

            mock_extractor = MagicMock()
            mock_extractor.extract.return_value = []

            task = TaskMessage(paper_id="doc-2", pdf_path=str(pdf_path), file_hash="hash-2")
            res = process_task(task, mock_extractor)

            # A PDF without acknowledgments is still a successful run, just with no text
            self.assertEqual(res.status, TaskStatus.SUCCESS)
            self.assertIsNone(res.acknowledgment_text)
            self.assertIsNone(res.confidence_score)

    def test_process_task_handles_corrupt_file_cleanly(self) -> None:
        mock_extractor = MagicMock()
        task = TaskMessage(paper_id="bad", pdf_path="missing_file.pdf", file_hash="bad_hash")

        # Capture the expected error log instead of letting the traceback spam the console
        with self.assertLogs("worker_service", level="ERROR") as captured:
            res = process_task(task, mock_extractor)

        self.assertEqual(res.status, TaskStatus.FAILED)
        self.assertIn("PDF file not found", res.error_message)
        self.assertTrue(any("paper_id='bad'" in line for line in captured.output))
        mock_extractor.extract.assert_not_called()

    @patch("worker_service.main.time.sleep", return_value=None)
    @patch("worker_service.main.SemanticExtractor")
    @patch("worker_service.main.QueueManager")
    def test_worker_exits_on_max_papers_limit(self, mock_qm_cls, mock_ext_cls, _sleep) -> None:
        mock_qm = MagicMock()
        mock_qm_cls.return_value = mock_qm

        # 3 tasks available, then an empty queue, then a hard guard so nothing can hang
        tasks = [
            TaskMessage(paper_id=f"p{i}", pdf_path="doc.pdf", file_hash=f"h{i}")
            for i in range(3)
        ]
        mock_qm.pop_task.side_effect = tasks + [None] * 50 + [_LoopGuard()]

        with patch("worker_service.main.process_task") as mock_proc:
            mock_proc.return_value = ResultMessage(
                paper_id="p", file_hash="h", status=TaskStatus.SUCCESS
            )
            processed = run_worker(max_papers=2, idle_exit_seconds=0.01)

        # Must stop after exactly 2 tasks, leaving the 3rd in the queue
        self.assertEqual(processed, 2)
        self.assertEqual(mock_qm.push_result.call_count, 2)
        self.assertEqual(mock_qm.pop_task.call_count, 2)
        mock_qm.close.assert_called_once()

    @patch("worker_service.main.SemanticExtractor")
    @patch("worker_service.main.QueueManager")
    def test_worker_exits_on_idle_timeout(self, mock_qm_cls, mock_ext_cls) -> None:
        mock_qm = MagicMock()
        mock_qm_cls.return_value = mock_qm
        # Empty queue; the guard fires after ~200 polls (~10s) if idle exit is broken
        mock_qm.pop_task.side_effect = [None] * 200 + [_LoopGuard()]

        with patch("worker_service.main.settings") as mock_settings:
            mock_settings.worker_poll_interval_seconds = 0.05
            processed = run_worker(max_papers=0, idle_exit_seconds=0.1)

        self.assertEqual(processed, 0)
        self.assertLess(mock_qm.pop_task.call_count, 20)
        mock_qm.push_result.assert_not_called()
        mock_qm.close.assert_called_once()


if __name__ == "__main__":
    unittest.main()
