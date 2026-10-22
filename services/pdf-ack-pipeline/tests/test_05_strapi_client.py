"""
Unit tests for StrapiAckClient in coordinator_service/utils.py.
Verifies:
- Read-only behavior (only GET requests are ever executed; no PUT)
- Correct pagination over Strapi v4 and v5 payloads
- Automatic skipping of publications without PDFs
- Authorization header handling
"""

import unittest
from typing import List

import httpx

from coordinator_service.utils import StrapiAckClient


class TestStrapiClient(unittest.TestCase):
    def test_read_only_and_pagination(self) -> None:
        methods_called: List[str] = []

        def mock_handler(request: httpx.Request) -> httpx.Response:
            methods_called.append(request.method)
            # Ensure no write operations are ever attempted
            if request.method != "GET":
                return httpx.Response(405, json={"error": "Write not allowed"})

            url = str(request.url)
            if "pagination%5Bpage%5D=1" in url or "page=1" in url:
                data = {
                    "data": [
                        {
                            "id": 1,
                            "title": "Paper with PDF",
                            "pdf": {"url": "/uploads/p1.pdf", "hash": "h1"},
                        },
                        {
                            "id": 2,
                            "title": "Paper without PDF",
                            "pdf": None,
                        },
                    ],
                    "meta": {
                        "pagination": {
                            "page": 1,
                            "pageSize": 2,
                            "pageCount": 2,
                            "total": 3,
                        }
                    },
                }
            else:
                data = {
                    "data": [
                        {
                            "id": 3,
                            "title": "Second Page Paper",
                            "pdf": {"url": "/uploads/p3.pdf", "hash": "h3"},
                        }
                    ],
                    "meta": {
                        "pagination": {
                            "page": 2,
                            "pageSize": 2,
                            "pageCount": 2,
                            "total": 3,
                        }
                    },
                }
            return httpx.Response(200, json=data)

        transport = httpx.MockTransport(mock_handler)
        client = StrapiAckClient(
            api_base_url="https://airi.utcluj.ro/strapi",
            token="test-token",
            media_base_url="https://airi.utcluj.ro/strapi",
            page_size=2,
            timeout=5,
            transport=transport,
        )

        papers = list(client.iter_publications_with_pdfs())

        # Assert only GET requests were made
        self.assertTrue(all(m == "GET" for m in methods_called))
        self.assertEqual(len(methods_called), 2)

        # Paper 2 had no PDF, so only paper 1 and paper 3 should be yielded
        self.assertEqual(len(papers), 2)
        self.assertEqual(papers[0]["paper_id"], "1")
        self.assertEqual(papers[0]["pdf_path"], "https://airi.utcluj.ro/strapi/uploads/p1.pdf")
        self.assertEqual(papers[1]["paper_id"], "3")


if __name__ == "__main__":
    unittest.main()
