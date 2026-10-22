import hashlib
import logging
from pathlib import Path
from typing import Any, Dict, Iterator, List, Optional, Union
from urllib.parse import urlparse

import httpx

logger = logging.getLogger(__name__)

HASH_CHUNK_SIZE = 65536  # 64 KB chunks for streaming SHA-256 without saving PDFs to disk


def normalize_base_url(url: Optional[str]) -> str:
    """Normalizes a base URL by stripping whitespace and trailing slashes."""
    if not url:
        return ""
    return str(url).strip().rstrip("/")


def is_http_url(source: Union[str, Path]) -> bool:
    """Returns True if the given source string is an HTTP or HTTPS URL."""
    if isinstance(source, Path):
        return False
    parsed = urlparse(str(source).strip())
    return parsed.scheme in ("http", "https")


def compute_bytes_sha256(data: bytes) -> str:
    """Computes the SHA-256 hex digest of an in-memory byte buffer."""
    return hashlib.sha256(data).hexdigest()


def compute_text_sha256(text: str) -> str:
    """Computes the SHA-256 hex digest of a UTF-8 string."""
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def compute_file_sha256(file_path: Union[str, Path]) -> str:
    """Computes the SHA-256 hex digest of a local file in 64 KB chunks."""
    path = Path(file_path)
    hasher = hashlib.sha256()
    with open(path, "rb") as handle:
        while True:
            chunk = handle.read(HASH_CHUNK_SIZE)
            if not chunk:
                break
            hasher.update(chunk)
    return hasher.hexdigest()


def compute_url_sha256(
    pdf_url: str,
    timeout: int = 30,
    headers: Optional[Dict[str, str]] = None,
) -> str:
    """
    Streams a remote PDF in 64 KB chunks in memory and returns its SHA-256 hex digest
    without writing any file to disk.
    """
    hasher = hashlib.sha256()
    with httpx.stream(
        "GET",
        pdf_url,
        headers=headers,
        follow_redirects=True,
        timeout=float(timeout),
    ) as response:
        response.raise_for_status()
        for chunk in response.iter_bytes(chunk_size=HASH_CHUNK_SIZE):
            if chunk:
                hasher.update(chunk)
    return hasher.hexdigest()


def resolve_pdf_hash(
    pdf_source: Union[str, Path],
    strapi_hash: Optional[str] = None,
    compute_stream: bool = True,
    timeout: int = 30,
) -> str:
    """
    Determines the fingerprint (SHA-256) of a PDF:
    - For local files: computes exact SHA-256 from file bytes.
    - For remote URLs: streams SHA-256 in memory if compute_stream=True;
      falls back to Strapi's media hash or URL digest if streaming is disabled.
    """
    if not is_http_url(pdf_source):
        return compute_file_sha256(pdf_source)

    url = str(pdf_source).strip()
    if compute_stream:
        return compute_url_sha256(url, timeout=timeout)

    if strapi_hash and str(strapi_hash).strip():
        return compute_text_sha256(str(strapi_hash).strip())

    return compute_text_sha256(url)


def resolve_media_url(media: Any, base_url: str) -> Optional[str]:
    """
    Extracts and normalizes a media file URL from Strapi v4 or v5 response payloads
    (mirrors `resolveMediaUrl` in `web/src/lib/strapi.js`).
    """
    if not media:
        return None

    clean_base = normalize_base_url(base_url)

    if isinstance(media, str):
        raw_url = media.strip()
        if not raw_url:
            return None
        if is_http_url(raw_url):
            return raw_url
        return f"{clean_base}{raw_url if raw_url.startswith('/') else f'/{raw_url}'}"

    data = media.get("data") if isinstance(media, dict) and "data" in media else media
    if isinstance(data, list):
        data = data[0] if data else None
    if not isinstance(data, dict):
        return None

    attrs = data.get("attributes") if isinstance(data.get("attributes"), dict) else data
    url = attrs.get("url")
    if not url or not isinstance(url, str):
        return None

    url = url.strip()
    if is_http_url(url):
        return url
    return f"{clean_base}{url if url.startswith('/') else f'/{url}'}"


def extract_media_hash(media: Any) -> Optional[str]:
    """Extracts the Strapi media `hash` field if present on `pdfFile`."""
    if not isinstance(media, dict):
        return None
    data = media.get("data") if "data" in media else media
    if isinstance(data, list):
        data = data[0] if data else None
    if not isinstance(data, dict):
        return None
    attrs = data.get("attributes") if isinstance(data.get("attributes"), dict) else data
    raw_hash = attrs.get("hash")
    return str(raw_hash).strip() if raw_hash else None


class StrapiAckClient:
    """
    Read-only Strapi API client for fetching publications with PDF attachments one by one.
    Modeled after `research-paper-graph/research_paper_graph/strapi.py` and `web/src/lib/strapi.js`.
    """

    def __init__(
        self,
        api_base_url: str,
        token: str = "",
        media_base_url: Optional[str] = None,
        page_size: int = 100,
        timeout: int = 30,
        transport: Optional[httpx.BaseTransport] = None,
    ) -> None:
        self.base_url = normalize_base_url(api_base_url)
        self.media_base_url = normalize_base_url(media_base_url or api_base_url)
        self.api_url = f"{self.base_url}/api"
        self.token = token.strip() if token else ""
        self.page_size = max(1, min(int(page_size or 100), 100))
        self.timeout = float(timeout)
        self.transport = transport

        self.headers: Dict[str, str] = {"Content-Type": "application/json"}
        if self.token:
            self.headers["Authorization"] = f"Bearer {self.token}"

    def iter_publications_with_pdfs(self) -> Iterator[Dict[str, Any]]:
        """
        Paginates through `/api/publications` and yields publications that have a PDF URL
        one by one so no bulk PDF data is held in memory.
        """
        page = 1
        client_kwargs = {"timeout": self.timeout}
        if self.transport is not None:
            client_kwargs["transport"] = self.transport

        with httpx.Client(**client_kwargs) as client:
            while True:
                params = {
                    "pagination[page]": page,
                    "pagination[pageSize]": self.page_size,
                    "fields[0]": "documentId",
                    "fields[1]": "title",
                    "fields[2]": "slug",
                    "populate[pdfFile][fields][0]": "name",
                    "populate[pdfFile][fields][1]": "url",
                    "populate[pdfFile][fields][2]": "hash",
                    "populate[pdfFile][fields][3]": "mime",
                    "populate[pdfFile][fields][4]": "size",
                }
                response = client.get(
                    f"{self.api_url}/publications",
                    headers=self.headers,
                    params=params,
                    follow_redirects=True,
                )
                response.raise_for_status()
                payload = response.json()
                entries: List[Dict[str, Any]] = payload.get("data") or []

                for entry in entries:
                    attrs = entry.get("attributes") if isinstance(entry.get("attributes"), dict) else entry
                    document_id = str(entry.get("documentId") or entry.get("id") or "").strip()
                    if not document_id:
                        continue

                    pdf_media = attrs.get("pdfFile") or attrs.get("pdf")
                    pdf_url = resolve_media_url(pdf_media, self.media_base_url)
                    if not pdf_url:
                        continue

                    yield {
                        "paper_id": document_id,
                        "title": attrs.get("title") or document_id,
                        "pdf_path": pdf_url,
                        "strapi_hash": extract_media_hash(pdf_media),
                    }

                meta = payload.get("meta", {}).get("pagination", {})
                page_count = meta.get("pageCount") or 0
                if not page_count or page >= page_count:
                    break
                page += 1
