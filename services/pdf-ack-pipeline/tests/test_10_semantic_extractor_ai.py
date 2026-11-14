"""
AI model integration test using real Bi-Encoder + Cross-Encoder models.
Tests extraction on realistic generated academic PDF layouts:
1. EU Horizon Europe grant acknowledgment
2. Romanian national research grant (UEFISCDI)
3. First-page funding footnote
4. Paper without any acknowledgment (must return None, no false positives)

This test loads real Transformer models and runs inference.
To enable: set RUN_AI_TESTS=1
"""

import os
import tempfile
import unittest
from pathlib import Path

from helpers import create_sample_pdf_file
from worker_service.src.pdf_chunker import extract_candidate_chunks
from worker_service.src.semantic_extractor import SemanticExtractor

RUN_AI = os.getenv("RUN_AI_TESTS", "").lower() in {"1", "true", "yes"}


@unittest.skipUnless(RUN_AI, "Skipping real AI inference test (set RUN_AI_TESTS=1 to run)")
class TestSemanticExtractorAI(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.extractor = SemanticExtractor()

    def test_extract_eu_horizon_grant(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            pdf_path = Path(tmp_dir) / "eu_grant.pdf"
            ack_text = (
                "This research was supported by the European Union under Horizon Europe "
                "grant agreement No. 101120657 (Project AI-HEALTH)."
            )
            create_sample_pdf_file(pdf_path, ack_text=ack_text, num_pages=2)

            chunks = extract_candidate_chunks(pdf_path)
            results = self.extractor.extract(chunks, threshold=0.55)

            self.assertGreaterEqual(len(results), 1)
            self.assertIn("101120657", results[0]["text"])
            self.assertGreaterEqual(float(results[0]["confidence"]), 0.70)

    def test_extract_uefiscdi_national_grant(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            pdf_path = Path(tmp_dir) / "ro_grant.pdf"
            ack_text = (
                "This work was supported by a grant of the Ministry of Research, "
                "Innovation and Digitization, CNCS - UEFISCDI, project number PN-III-P4-ID-PCE-2020-0001."
            )
            create_sample_pdf_file(pdf_path, ack_text=ack_text, num_pages=2)

            chunks = extract_candidate_chunks(pdf_path)
            results = self.extractor.extract(chunks, threshold=0.55)

            self.assertGreaterEqual(len(results), 1)
            self.assertIn("UEFISCDI", results[0]["text"])
            self.assertGreaterEqual(float(results[0]["confidence"]), 0.70)

    def test_extract_first_page_funding_footnote(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            pdf_path = Path(tmp_dir) / "footnote.pdf"
            create_sample_pdf_file(
                pdf_path,
                ack_text=None,
                num_pages=3,
                include_funding_footnote=True,
            )

            chunks = extract_candidate_chunks(pdf_path)
            results = self.extractor.extract(
                chunks,
                threshold=0.50,
                bi_threshold=0.20,
                top_k=8,
            )

            self.assertGreaterEqual(len(results), 1)
            self.assertIn("UEFISCDI", results[0]["text"])

    def test_no_acknowledgment_returns_empty(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            pdf_path = Path(tmp_dir) / "no_ack.pdf"
            create_sample_pdf_file(
                pdf_path,
                ack_text=None,
                num_pages=2,
                include_funding_footnote=False,
            )

            chunks = extract_candidate_chunks(pdf_path)
            results = self.extractor.extract(chunks, threshold=0.55)
            self.assertEqual(len(results), 0)


if __name__ == "__main__":
    unittest.main()
