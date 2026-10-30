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


def extract_pdf_url_suffix(pdf_path: str) -> Optional[str]:
    """
    Extracts the canonical `/uploads/...` suffix (or filename) from a full PDF URL or path
    so a publication can be matched reliably in Strapi by its `pdfFile.url`.
    """
    if not pdf_path or not str(pdf_path).strip():
        return None
    raw = str(pdf_path).strip()
    parsed = urlparse(raw)
    path_part = parsed.path if parsed.scheme in ("http", "https") else raw.replace("\\", "/")
    path_part = path_part.strip()
    if "/uploads/" in path_part:
        return "/uploads/" + path_part.split("/uploads/", 1)[1].lstrip("/")
    if path_part.endswith(".pdf"):
        return "/" + path_part.lstrip("/")
    return None


class StrapiAckClient:
    """
    Handles read/write communication with Strapi for the acknowledgment pipeline.
    - Discovers publications that have a `pdfFile` attachment.
    - Finds a publication by matching its `pdfFile.url` against `pdf_path`.
    - Updates `acknowledgment` via `PUT /api/publications/{documentId}`.
    """

    def __init__(
        self,
        api_base_url: str,
        token: Optional[str] = None,
        media_base_url: Optional[str] = None,
        page_size: int = 100,
        timeout: int = 30,
        transport: Optional[httpx.BaseTransport] = None,
    ) -> None:
        raw_api = normalize_base_url(api_base_url)
        self.api_url = raw_api if raw_api.endswith("/api") else f"{raw_api}/api"
        base_origin = self.api_url[:-4] if self.api_url.endswith("/api") else self.api_url
        self.media_base_url = normalize_base_url(media_base_url) if media_base_url else base_origin
        self.page_size = max(1, min(int(page_size or 100), 100))
        self.timeout = float(max(1, int(timeout)))
        self.transport = transport

        clean_token = (token or "").strip()
        self.headers: Dict[str, str] = {
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        if clean_token:
            self.headers["Authorization"] = f"Bearer {clean_token}"

        self._doc_id_by_pdf_url: Dict[str, str] = {}
        self._doc_id_by_pdf_suffix: Dict[str, str] = {}

    def _client_kwargs(self) -> Dict[str, Any]:
        kwargs: Dict[str, Any] = {
            "timeout": self.timeout,
            "follow_redirects": True,
        }
        if self.transport is not None:
            kwargs["transport"] = self.transport
        return kwargs

    def _cache_publication_pdf_mapping(self, document_id: str, pdf_url: str) -> None:
        """Indexes documentId by full URL, suffix and filename for fast in-memory lookup."""
        if not document_id or not pdf_url:
            return
        clean_url = str(pdf_url).strip()
        self._doc_id_by_pdf_url[clean_url] = document_id
        suffix = extract_pdf_url_suffix(clean_url)
        if suffix:
            self._doc_id_by_pdf_suffix[suffix] = document_id
            filename = suffix.rstrip("/").split("/")[-1]
            if filename:
                self._doc_id_by_pdf_suffix[filename] = document_id

    def iter_publications_with_pdfs(self) -> Iterator[Dict[str, Any]]:
        """
        Paginates through `/api/publications` and yields publications that have a PDF URL
        one by one so no bulk PDF data is held in memory.
        """
        page = 1

        with httpx.Client(**self._client_kwargs()) as client:
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

                    self._cache_publication_pdf_mapping(document_id, pdf_url)

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

    def find_publication_by_pdf_url(self, pdf_path: str) -> Optional[str]:
        """
        Finds the Strapi publication `documentId` that owns the given `pdf_path` link:
        1. Checks the in-memory mapping populated during `iter_publications_with_pdfs()`.
        2. Queries Strapi `GET /api/publications` filtering by `pdfFile.url` suffix (`$endsWith`).
        """
        if not pdf_path or not str(pdf_path).strip():
            return None

        clean_path = str(pdf_path).strip()
        if clean_path in self._doc_id_by_pdf_url:
            return self._doc_id_by_pdf_url[clean_path]

        suffix = extract_pdf_url_suffix(clean_path)
        if suffix and suffix in self._doc_id_by_pdf_suffix:
            return self._doc_id_by_pdf_suffix[suffix]

        filename = suffix.rstrip("/").split("/")[-1] if suffix else clean_path.rstrip("/").split("/")[-1]
        if filename and filename in self._doc_id_by_pdf_suffix:
            return self._doc_id_by_pdf_suffix[filename]

        filter_candidates: List[str] = []
        if suffix:
            filter_candidates.append(suffix)
        if filename and filename != suffix:
            filter_candidates.append(filename)

        with httpx.Client(**self._client_kwargs()) as client:
            for candidate in filter_candidates:
                try:
                    params = {
                        "filters[pdfFile][url][$endsWith]": candidate,
                        "pagination[pageSize]": 1,
                        "fields[0]": "documentId",
                    }
                    response = client.get(
                        f"{self.api_url}/publications",
                        headers=self.headers,
                        params=params,
                        follow_redirects=True,
                    )
                    if response.status_code == 200:
                        data = response.json().get("data") or []
                        if data:
                            matched_entry = data[0]
                            doc_id = str(matched_entry.get("documentId") or matched_entry.get("id") or "").strip()
                            if doc_id:
                                self._cache_publication_pdf_mapping(doc_id, clean_path)
                                return doc_id
                except Exception as exc:
                    logger.debug("Strapi lookup by filter failed for candidate '%s': %s", candidate, exc)

        return None

    def update_publication_acknowledgment(self, document_id: str, acknowledgment_text: str) -> bool:
        """Sends `PUT /api/publications/{documentId}` with the extracted acknowledgment text."""
        if not document_id or not str(document_id).strip():
            logger.warning("Cannot update acknowledgment: document_id is empty.")
            return False

        clean_id = str(document_id).strip()
        payload = {"data": {"acknowledgment": acknowledgment_text or ""}}
        url = f"{self.api_url}/publications/{clean_id}"

        with httpx.Client(**self._client_kwargs()) as client:
            try:
                response = client.put(url, headers=self.headers, json=payload, follow_redirects=True)
                response.raise_for_status()
                logger.info(
                    "[STRAPI UPDATED] documentId='%s' | acknowledgment saved (%d chars).",
                    clean_id,
                    len(acknowledgment_text or ""),
                )
                return True
            except httpx.HTTPStatusError as http_err:
                logger.error(
                    "Strapi PUT %s failed with HTTP %d: %s",
                    url,
                    http_err.response.status_code,
                    http_err.response.text[:200],
                )
                return False
            except Exception as exc:
                logger.error("Strapi PUT %s connection error: %s", url, exc)
                return False

    def sync_acknowledgment_by_pdf_url(
        self,
        pdf_path: str,
        acknowledgment_text: str,
        fallback_document_id: Optional[str] = None,
    ) -> Optional[str]:
        """Looks up the publication owning `pdf_path` and updates its acknowledgment."""
        target_doc_id = self.find_publication_by_pdf_url(pdf_path) or fallback_document_id
        if not target_doc_id:
            logger.warning("Could not match any Strapi publication for PDF link: '%s'", pdf_path)
            return None

        ok = self.update_publication_acknowledgment(target_doc_id, acknowledgment_text)
        return target_doc_id if ok else None
