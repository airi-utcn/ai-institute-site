"""
Unit tests for StrapiAckClient in coordinator_service/utils.py.
Verifies:
- Correct pagination over Strapi v4 and v5 payloads
- Automatic skipping of publications without PDFs
- Matching a publication in Strapi by its PDF link (`pdf_path` / `pdfFile.url`)
- Updating the `acknowledgment` field on the matched Strapi publication (`PUT /api/publications/{documentId}`)
"""

import json
import unittest
from typing import Any, Dict, List

import httpx

from coordinator_service.utils import StrapiAckClient, extract_pdf_url_suffix


class TestStrapiClient(unittest.TestCase):
    def test_pagination_and_pdf_filtering(self) -> None:
        methods_called: List[str] = []

        def mock_handler(request: httpx.Request) -> httpx.Response:
            methods_called.append(request.method)
            url = str(request.url)
            if "pagination%5Bpage%5D=1" in url or "page=1" in url:
                data = {
                    "data": [
                        {
                            "documentId": "doc-str-1",
                            "title": "Paper with PDF",
                            "pdfFile": {"url": "/uploads/p1.pdf", "hash": "h1"},
                        },
                        {
                            "documentId": "doc-str-2",
                            "title": "Paper without PDF",
                            "pdfFile": None,
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
                            "documentId": "doc-str-3",
                            "title": "Second Page Paper",
                            "pdfFile": {"url": "/uploads/p3.pdf", "hash": "h3"},
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

        self.assertEqual(methods_called, ["GET", "GET"])
        self.assertEqual(len(papers), 2)
        self.assertEqual(papers[0]["paper_id"], "doc-str-1")
        self.assertEqual(papers[0]["pdf_path"], "https://airi.utcluj.ro/strapi/uploads/p1.pdf")
        self.assertEqual(papers[1]["paper_id"], "doc-str-3")

    def test_find_by_pdf_url_and_update_acknowledgment(self) -> None:
        put_calls: List[Dict[str, Any]] = []

        def mock_handler(request: httpx.Request) -> httpx.Response:
            url = str(request.url)
            if request.method == "GET" and "filters%5BpdfFile%5D%5Burl%5D%5B%24endsWith%5D=" in url:
                return httpx.Response(
                    200,
                    json={
                        "data": [
                            {
                                "documentId": "strapi-doc-xyz987",
                                "title": "Matched By PDF Link",
                                "pdfFile": {"url": "/uploads/horizon_paper_abc.pdf"},
                            }
                        ]
                    },
                )
            if request.method == "PUT" and url.endswith("/api/publications/strapi-doc-xyz987"):
                body = json.loads(request.content.decode("utf-8"))
                put_calls.append({"url": url, "body": body, "auth": request.headers.get("Authorization")})
                return httpx.Response(200, json={"data": {"documentId": "strapi-doc-xyz987"}})

            return httpx.Response(404, json={"error": "Not found"})

        transport = httpx.MockTransport(mock_handler)
        client = StrapiAckClient(
            api_base_url="https://airi.utcluj.ro/strapi",
            token="secret-api-token",
            media_base_url="https://airi.utcluj.ro/strapi",
            transport=transport,
        )

        self.assertEqual(
            extract_pdf_url_suffix("https://airi.utcluj.ro/strapi/uploads/horizon_paper_abc.pdf"),
            "/uploads/horizon_paper_abc.pdf",
        )

        # Even when SQLite had a hashed test paper_id, StrapiAckClient finds the publication by its PDF link
        matched_doc_id = client.sync_acknowledgment_by_pdf_url(
            pdf_path="https://airi.utcluj.ro/strapi/uploads/horizon_paper_abc.pdf",
            acknowledgment_text="This work was funded by Horizon Europe grant 101136216.",
        )

        self.assertEqual(matched_doc_id, "strapi-doc-xyz987")
        self.assertEqual(len(put_calls), 1)
        self.assertEqual(put_calls[0]["auth"], "Bearer secret-api-token")
        self.assertEqual(
            put_calls[0]["body"],
            {"data": {"acknowledgment": "This work was funded by Horizon Europe grant 101136216."}},
        )


if __name__ == "__main__":
    unittest.main()
