"""
Shared helpers, mock bridges, and test fixture generators for pdf-ack-pipeline tests.
"""

import sys
import tempfile
from collections import deque
from pathlib import Path
from typing import Any, Deque, Dict, List, Optional

import pymupdf

TESTS_DIR = Path(__file__).resolve().parent
PIPELINE_ROOT = TESTS_DIR.parent
COORDINATOR_DIR = PIPELINE_ROOT / "coordinator_service"
WORKER_DIR = PIPELINE_ROOT / "worker_service"

for path_entry in (str(PIPELINE_ROOT), str(COORDINATOR_DIR), str(WORKER_DIR)):
    if path_entry not in sys.path:
        sys.path.insert(0, path_entry)

from shared.config import PipelineConfig, load_config
from shared.schemas import ResultMessage, TaskMessage, TaskStatus
from state_tracker import StateTracker


def create_sample_pdf_file(
    target_path: Path,
    ack_text: Optional[str] = None,
    num_pages: int = 1,
    include_funding_footnote: bool = False,
    include_section_heading: str = "Acknowledgments",
) -> Path:
    """Creates a sample multi-page or single-page PDF on disk for testing."""
    target_path.parent.mkdir(parents=True, exist_ok=True)
    doc = pymupdf.open()

    first_page = doc.new_page()
    first_page_content = [
        "Deep Neural Architectures for Scientific Discovery",
        "Author One, Author Two - AI Research Institute",
        "Abstract: We present a novel method for representation learning across multi-modal datasets.",
        "1. Introduction",
        "Recent advances in transformer architectures have enabled rapid progress in natural language processing.",
    ]
    if include_funding_footnote:
        first_page_content.append(
            "* Funding footnote: This work was supported by UEFISCDI grant PN-III-P4-ID-PCE-2020-0001."
        )

    first_page.insert_textbox(
        pymupdf.Rect(50, 50, 550, 750),
        "\n\n".join(first_page_content),
        fontsize=11,
    )

    for p in range(1, num_pages - 1):
        middle_page = doc.new_page()
        middle_page.insert_textbox(
            pymupdf.Rect(50, 50, 550, 750),
            f"Section {p + 1}: Methodology and Experimental Setup\n\nContent for page {p + 1}.",
            fontsize=11,
        )

    if num_pages > 1:
        last_page = doc.new_page()
    else:
        last_page = first_page

    last_page_content = []
    if ack_text:
        last_page_content.append(include_section_heading)
        last_page_content.append(ack_text)
    last_page_content.append("References")
    last_page_content.append("[1] Vaswani et al., Attention Is All You Need, NeurIPS 2017.")

    if num_pages > 1:
        last_page.insert_textbox(
            pymupdf.Rect(50, 50, 550, 750),
            "\n\n".join(last_page_content),
            fontsize=11,
        )
    else:
        first_page.insert_textbox(
            pymupdf.Rect(50, 350, 550, 750),
            "\n\n".join(last_page_content),
            fontsize=11,
        )

    doc.save(str(target_path))
    doc.close()
    return target_path


class InMemoryQueueBridge:
    """
    In-memory queue manager implementing QueueManager's exact interface
    (push_task, pop_task, push_result, pop_result, close).
    Supports simulation of worker drops/retries and custom handlers.
    """

    def __init__(
        self,
        worker_handler=None,
        auto_run_worker: bool = True,
        fail_first_n_attempts: int = 0,
    ) -> None:
        self.tasks_queue: Deque[TaskMessage] = deque()
        self.results_queue: Deque[ResultMessage] = deque()
        self.worker_handler = worker_handler
        self.auto_run_worker = auto_run_worker
        self.fail_first_n_attempts = fail_first_n_attempts
        self.attempts_made = 0

    def push_task(self, task: TaskMessage) -> None:
        self.tasks_queue.append(task)
        self.attempts_made += 1

        if not self.auto_run_worker:
            return

        if self.attempts_made <= self.fail_first_n_attempts:
            self.tasks_queue.popleft()
            return

        popped = self.pop_task()
        if popped is not None and self.worker_handler is not None:
            result = self.worker_handler(popped)
            if result is not None:
                self.push_result(result)

    def pop_task(self) -> Optional[TaskMessage]:
        return self.tasks_queue.popleft() if self.tasks_queue else None

    def push_result(self, result: ResultMessage) -> None:
        self.results_queue.append(result)

    def pop_result(self) -> Optional[ResultMessage]:
        return self.results_queue.popleft() if self.results_queue else None

    def close(self) -> None:
        pass


def make_test_config(
    temp_dir: Path,
    max_papers: int = 0,
    retry_timeout: int = 1,
    max_retries: int = 2,
    test_urls: tuple = (),
) -> PipelineConfig:
    """Returns an isolated PipelineConfig pointing to a temporary directory."""
    base = load_config()
    db_path = temp_dir / "state" / "processed_papers.db"
    db_path.parent.mkdir(parents=True, exist_ok=True)
    pdf_dir = temp_dir / "pdfs"
    pdf_dir.mkdir(parents=True, exist_ok=True)

    return PipelineConfig(
        **{
            **base.__dict__,
            "pdf_storage_dir": pdf_dir,
            "state_db_path": db_path,
            "task_retry_timeout_seconds": retry_timeout,
            "max_task_retries": max_retries,
            "coordinator_result_poll_seconds": 0.1,
            "ack_max_papers_per_run": max_papers,
            "ack_test_pdf_urls": test_urls,
        }
    )
