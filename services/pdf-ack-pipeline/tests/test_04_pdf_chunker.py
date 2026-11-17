"""
Unit tests for PDF chunker, candidate page selection, text normalization,
and in-memory URL loading in worker_service/src/pdf_chunker.py.
"""

import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import httpx

from helpers import create_sample_pdf_file
from worker_service.src.pdf_chunker import (
    clean_paragraph,
    extract_candidate_chunks,
    get_target_page_indices,
)


class TestPdfChunker(unittest.TestCase):
    def test_clean_paragraph_hyphen_rejoin_and_whitespace(self) -> None:
        raw = "This is a trans-\nformer based architec-\nture for nat-\nural language.\n\n"
        cleaned = clean_paragraph(raw)
        self.assertEqual(
            cleaned,
            "This is a transformer based architecture for natural language.",
        )

    def test_get_target_page_indices(self) -> None:
        # 1 page -> index [0]
        self.assertEqual(get_target_page_indices(1), [0])

        # 3 pages -> first page and tail 33% (ceil(3 * 0.33) = 1 page -> page 2)
        self.assertEqual(get_target_page_indices(3), [0, 2])

        # 10 pages -> first page and ceil(10 * 0.33) = 4 pages (6, 7, 8, 9)
        self.assertEqual(get_target_page_indices(10), [0, 6, 7, 8, 9])

        # Percentage as integer (33) treated as 0.33
        self.assertEqual(get_target_page_indices(10, tail_percentage=33.0), [0, 6, 7, 8, 9])

        # Empty
        self.assertEqual(get_target_page_indices(0), [])

    def test_extract_candidate_chunks_from_local_pdf(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            pdf_path = Path(tmp_dir) / "sample_doc.pdf"
            create_sample_pdf_file(
                pdf_path,
                ack_text="We thank the reviewers for valuable feedback and Horizon 2020.",
                num_pages=3,
                include_funding_footnote=True,
            )

            chunks = extract_candidate_chunks(pdf_path)
            self.assertGreaterEqual(len(chunks), 2)

            all_text = " ".join(chunks)
            self.assertIn("Funding footnote", all_text)
            self.assertIn("Horizon 2020", all_text)

    def test_extract_candidate_chunks_from_url_in_ram(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            pdf_path = Path(tmp_dir) / "temp.pdf"
            create_sample_pdf_file(
                pdf_path,
                ack_text="Supported by grant UEFISCDI-2024.",
                num_pages=2,
            )
            raw_pdf_bytes = pdf_path.read_bytes()

        def mock_handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(200, content=raw_pdf_bytes)

        transport = httpx.MockTransport(mock_handler)
        mock_client = httpx.Client(transport=transport)
        with patch("worker_service.src.pdf_chunker.httpx.get", side_effect=mock_client.get):
            chunks = extract_candidate_chunks("https://example.org/remote_paper.pdf")
            self.assertGreaterEqual(len(chunks), 1)
            all_text = " ".join(chunks)
            self.assertIn("UEFISCDI-2024", all_text)

    def test_missing_file_raises(self) -> None:
        with self.assertRaises(FileNotFoundError):
            extract_candidate_chunks(Path("non_existent_file_12345.pdf"))


if __name__ == "__main__":
    unittest.main()
