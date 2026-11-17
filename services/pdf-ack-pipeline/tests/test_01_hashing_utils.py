"""
Unit tests for SHA-256 hash functions and Strapi media URL resolution in coordinator_service/utils.py.
"""

import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

import httpx

from helpers import PIPELINE_ROOT
from coordinator_service.utils import (
    compute_bytes_sha256,
    compute_file_sha256,
    compute_text_sha256,
    compute_url_sha256,
    resolve_media_url,
    resolve_pdf_hash,
)


class TestHashingUtils(unittest.TestCase):
    def test_bytes_and_text_hash(self) -> None:
        raw = b"hello acknowledgment pipeline"
        expected = compute_bytes_sha256(raw)
        self.assertEqual(len(expected), 64)
        self.assertEqual(compute_text_sha256("hello acknowledgment pipeline"), expected)

    def test_file_hash(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            sample_file = Path(tmp_dir) / "sample.bin"
            content = b"chunked file contents for sha256 testing" * 1024
            sample_file.write_bytes(content)
            expected = compute_bytes_sha256(content)
            self.assertEqual(compute_file_sha256(sample_file), expected)

    def test_url_streaming_hash_mocked(self) -> None:
        chunks = [b"chunk-1-data-", b"chunk-2-data-", b"chunk-3-data-end"]
        full_content = b"".join(chunks)
        expected_hash = compute_bytes_sha256(full_content)

        class MockStreamResponse:
            def raise_for_status(self):
                pass

            def iter_bytes(self, chunk_size=65536):
                for c in chunks:
                    yield c

            def __enter__(self):
                return self

            def __exit__(self, exc_type, exc_val, exc_tb):
                pass

        with patch("coordinator_service.utils.httpx.stream") as mock_stream:
            mock_stream.return_value = MockStreamResponse()
            computed = compute_url_sha256("https://airi.utcluj.ro/strapi/uploads/paper.pdf")
            self.assertEqual(computed, expected_hash)

    def test_resolve_pdf_hash_precedence(self) -> None:
        # If strapi_hash is provided, its text hash should be returned
        strapi_h = "precomputed_strapi_hash_value"
        hash_val = resolve_pdf_hash(
            pdf_source="https://airi.utcluj.ro/paper.pdf",
            strapi_hash=strapi_h,
            compute_stream=False,
        )
        self.assertEqual(hash_val, compute_text_sha256(strapi_h))

        # Local file computation
        with tempfile.TemporaryDirectory() as tmp_dir:
            f = Path(tmp_dir) / "test.pdf"
            f.write_bytes(b"%PDF-1.4 test")
            expected = compute_bytes_sha256(b"%PDF-1.4 test")
            self.assertEqual(resolve_pdf_hash(f), expected)

    def test_resolve_media_url_formats(self) -> None:
        base = "https://airi.utcluj.ro/strapi"

        # Strapi v5 flat dictionary
        v5 = {"url": "/uploads/paper1.pdf"}
        self.assertEqual(resolve_media_url(v5, base), f"{base}/uploads/paper1.pdf")

        # Strapi v4 nested structure: data.attributes.url
        v4 = {"data": {"attributes": {"url": "/uploads/paper2.pdf"}}}
        self.assertEqual(resolve_media_url(v4, base), f"{base}/uploads/paper2.pdf")

        # Direct string
        self.assertEqual(resolve_media_url("/uploads/p3.pdf", base), f"{base}/uploads/p3.pdf")

        # Absolute URL preserved
        self.assertEqual(
            resolve_media_url("https://external.org/doc.pdf", base),
            "https://external.org/doc.pdf",
        )

        # None / empty returns None
        self.assertIsNone(resolve_media_url(None, base))
        self.assertIsNone(resolve_media_url({}, base))


if __name__ == "__main__":
    unittest.main()
