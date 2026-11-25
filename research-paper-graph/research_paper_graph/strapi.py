import ipaddress
import logging
import socket
import time
from datetime import datetime, timezone
from difflib import SequenceMatcher
from io import BytesIO
from urllib.parse import quote, urljoin, urlparse

import requests

from .import_scope import out_of_scope_reason
from .utils import (
    normalize_doi,
    normalize_openalex_id,
    normalize_person_name,
    normalize_title,
    slugify,
)

log = logging.getLogger(__name__)

MAX_PDF_BYTES = 10 * 1024 * 1024
PDF_USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"
)
RETRY_STATUS = {429, 500, 502, 503, 504}
MESO_SLUG_PREFIX = "sc-"


def _validate_public_https_url(url: str) -> None:
    """Reject anything that is not HTTPS or does not resolve to a public IP."""
    try:
        parsed = urlparse(url)
        port = parsed.port or 443
    except ValueError as exc:
        raise ValueError(f"Invalid PDF URL: {url}") from exc

    if parsed.scheme != "https" or not parsed.hostname:
        raise ValueError(f"PDF URL must be an absolute https URL: {url}")

    try:
        addresses = {
            info[4][0]
            for info in socket.getaddrinfo(
                parsed.hostname, port, type=socket.SOCK_STREAM
            )
        }
    except socket.gaierror as exc:
        raise ValueError(f"Could not resolve PDF host: {parsed.hostname}") from exc

    if not addresses:
        raise ValueError(f"PDF host did not resolve: {parsed.hostname}")

    for address in addresses:
        try:
            ip = ipaddress.ip_address(address)
        except ValueError as exc:
            raise ValueError(
                f"PDF host {parsed.hostname} returned an invalid address {address}"
            ) from exc
        if not ip.is_global:
            raise ValueError(
                f"PDF host {parsed.hostname} resolves to non-public address {address}"
            )


def _download_pdf(url: str, *, max_bytes=MAX_PDF_BYTES, timeout=30.0, retries=2) -> bytes:
    """Download a PDF without following redirects into private networks."""
    if url.startswith("http://"):
        # Most repositories serve the same object over TLS; the public-URL
        # validation intentionally rejects plain HTTP.
        url = "https://" + url[len("http://") :]

    last_error = None
    for attempt in range(retries + 1):
        try:
            return _download_pdf_once(url, max_bytes=max_bytes, timeout=timeout)
        except ValueError:
            raise
        except requests.exceptions.RequestException as exc:
            last_error = exc
            if attempt >= retries:
                break
            time.sleep(0.5 * (2**attempt))
    if last_error is not None:
        raise last_error
    raise ValueError("PDF download failed")


def _download_pdf_once(url: str, *, max_bytes: int, timeout: float) -> bytes:
    current = url
    for _ in range(5):
        _validate_public_https_url(current)
        with requests.get(
            current,
            timeout=timeout,
            allow_redirects=False,
            stream=True,
            headers={
                "User-Agent": PDF_USER_AGENT,
                "Accept": "application/pdf,application/octet-stream,*/*",
            },
            # Do not let HTTP(S)_PROXY in the environment bypass the IP check.
            proxies={"http": None, "https": None},
        ) as response:
            if response.is_redirect:
                location = response.headers.get("location")
                if not location:
                    raise ValueError("PDF redirect has no Location header")
                current = urljoin(current, location)
                if current.startswith("http://"):
                    current = "https://" + current[len("http://") :]
                continue

            response.raise_for_status()

            chunks = []
            total = 0
            for chunk in response.iter_content(chunk_size=64 * 1024):
                if not chunk:
                    continue
                total += len(chunk)
                if total > max_bytes:
                    raise ValueError(f"PDF is larger than the {max_bytes // (1024 * 1024)} MB limit")
                chunks.append(chunk)

            content = b"".join(chunks)
            if not content.startswith(b"%PDF-"):
                raise ValueError("Downloaded content is not a PDF")

            return content

    raise ValueError("Too many redirects while downloading the PDF")


class StrapiClient:
    def __init__(self, base_url, token, *, timeout=60.0, retries=2, pdf_max_bytes=MAX_PDF_BYTES):
        self.base_url = base_url.rstrip("/")
        self.api_url = f"{self.base_url}/api"
        self.timeout = float(timeout or 60.0)
        self.retries = max(0, int(retries or 0))
        self.pdf_max_bytes = int(pdf_max_bytes or MAX_PDF_BYTES)
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }
        self.upload_headers = {
            "Authorization": f"Bearer {token}",
        }

        self._pub_by_oaid = {}
        self._pub_by_doi = {}
        self._pub_by_title = {}
        self._pub_title_duplicates = set()
        self._pub_source_kind = {}
        self._pub_slug = {}
        self._pub_published = {}
        self._pub_graph_eligible = {}
        self._pub_has_pdf = {}
        self._pub_records = {}
        self._graph_exclusions = []
        self._person_by_name = {}
        self._person_by_oaid = {}
        self.last_error = None

    def _request(self, method, url, **kwargs):
        """Perform an HTTP request with a timeout and bounded retries."""
        kwargs.setdefault("timeout", self.timeout)
        last_response = None
        for attempt in range(self.retries + 1):
            response = requests.request(method, url, **kwargs)
            if response.status_code not in RETRY_STATUS or attempt >= self.retries:
                return response
            last_response = response
            retry_after = response.headers.get("Retry-After")
            delay = float(retry_after) if retry_after and retry_after.isdigit() else 0.5 * (2**attempt)
            log.warning(
                "Strapi %s %s returned %s; retrying in %.1fs (%s/%s)",
                method,
                url,
                response.status_code,
                delay,
                attempt + 1,
                self.retries,
            )
            time.sleep(delay)
        return last_response

    def _response_error(self, response):
        return {
            "status_code": getattr(response, "status_code", None),
            "error": (getattr(response, "text", "") or "")[:2000],
        }

    def _normalize_source_kind(self, source_kind):
        if source_kind in {"openAlexAutomated", "openalex", "merged"}:
            return "openAlexAutomated"
        return "manual"

    def build_publication_slug(self, paper_data):
        title = paper_data.get("title") or ""
        slug = slugify(title)
        if slug:
            return slug

        openalex_id = str(paper_data.get("openAlexId") or "")
        fallback = openalex_id.rstrip("/").split("/")[-1] if openalex_id else ""
        fallback_slug = slugify(fallback)
        return fallback_slug or f"publication-{int(datetime.now(timezone.utc).timestamp())}"

    def _build_pdf_filename(self, paper_data):
        title_slug = slugify(paper_data.get("title") or "")
        if title_slug:
            return f"{title_slug}.pdf"

        openalex_id = str(paper_data.get("openAlexId") or "")
        fallback = openalex_id.rstrip("/").split("/")[-1] if openalex_id else ""
        fallback_slug = slugify(fallback)
        return f"{fallback_slug or 'publication'}.pdf"

    def _empty_pdf_result(self):
        return {
            "attempted": False,
            "direct_build": False,
            "unpaywall_requested": False,
            "resolved": False,
            "downloaded": False,
            "uploaded": False,
            "attachment_id": None,
            "pdf_url": None,
            "pdf_source": None,
        }

    def _build_pdf_url_from_doi(self, doi):
        """Build a direct PDF URL from DOI patterns we can resolve deterministically.

        arXiv DOIs are a special case: Unpaywall often does not return url_for_pdf for them,
        but the arXiv identifier is embedded in the DOI suffix, so we can synthesize the
        canonical PDF URL directly.
        """
        normalized_doi = normalize_doi(doi)
        if not normalized_doi:
            return None

        doi_lower = normalized_doi.lower()
        if doi_lower.startswith("10.48550/arxiv."):
            arxiv_id = normalized_doi.split("arxiv.", 1)[1].strip().lower()
            if arxiv_id:
                return f"https://arxiv.org/pdf/{arxiv_id}.pdf"

        return None

    def has_publication_pdf(self, document_id):
        return bool(self._pub_has_pdf.get(document_id))

    def build_import_create_payload(self, paper_data, author_ids=None, attachment_id=None):
        """Build the create payload for a new imported publication.

        This only sets machine-managed fields plus safe defaults for imported records.
        """
        payload = self._build_machine_owned_payload(paper_data)
        payload.update(
            {
                "slug": self.build_publication_slug(paper_data),
                "sourceKind": "openAlexAutomated",
                "graphEligible": True,
                "publishedAt": self._utc_now(),
            }
        )

        if attachment_id:
            payload["pdfFile"] = attachment_id

        if author_ids:
            payload["authors"] = author_ids

        return payload

    def build_import_update_payload(self, paper_data, author_ids=None):
        """Build the update payload for an existing publication.

        Updates are restricted to machine-managed import fields so editorial data is preserved.
        """
        payload = self._build_machine_owned_payload(paper_data)
        if author_ids is not None:
            payload["authors"] = author_ids
        return payload

    def _build_machine_owned_payload(self, paper_data):
        imported_at = self._utc_now()
        openalex_id = normalize_openalex_id(paper_data.get("openAlexId"))
        doi = normalize_doi(paper_data.get("doi"))
        return {
            "title": paper_data["title"],
            "openAlexId": openalex_id or None,
            "doi": doi or None,
            "year": paper_data.get("year"),
            "cited_by": paper_data.get("cited_by", 0),
            "abstract": paper_data.get("abstract"),
            "topics": paper_data.get("topics"),
            "kind": paper_data.get("kind"),
            "lastImportedAt": imported_at,
            "rawImportMetadata": self._build_raw_import_metadata(paper_data, imported_at),
        }

    def _build_raw_import_metadata(self, paper_data, imported_at):
        return {
            "source": "openAlexAutomated",
            "sourceId": normalize_openalex_id(paper_data.get("openAlexId")) or None,
            "authors": paper_data.get("authors") or [],
            "pdfUrl": paper_data.get("pdf_url"),
            "importedAt": imported_at,
        }

    def _utc_now(self):
        return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    def _fetch_all_pages(self, endpoint, params=None):
        """Paginate through all entries in a Strapi collection."""
        results = []
        seen = set()
        page = 1
        expected_total = 0
        empty_retries = 0
        base_params = params or {}
        while True:
            paged = {**base_params, "pagination[page]": page, "pagination[pageSize]": 100}
            response = self._request(
                "GET", f"{self.api_url}/{endpoint}", headers=self.headers, params=paged
            )
            if not response.ok:
                log.error(
                    "Failed to fetch %s page %s: %s %s",
                    endpoint,
                    page,
                    response.status_code,
                    response.text[:1000],
                )
            response.raise_for_status()
            payload = response.json()
            data = payload.get("data", []) or []
            meta = payload.get("meta", {}).get("pagination", {})

            # A concurrent rebuild can make pageCount/total shrink between
            # requests. Keep the largest total seen and stop on an empty page
            # instead of trusting a possibly stale pageCount.
            total = meta.get("total")
            if isinstance(total, int) and total > expected_total:
                expected_total = total

            if not data:
                if expected_total > len(results) and empty_retries < 3:
                    empty_retries += 1
                    time.sleep(0.15 * empty_retries)
                    continue
                break

            empty_retries = 0
            for row in data:
                key = row.get("documentId") if isinstance(row, dict) else None
                if key is not None:
                    if key in seen:
                        continue
                    seen.add(key)
                results.append(row)

            if expected_total and len(results) >= expected_total:
                break
            page += 1
        return results

    def _remember_title(self, normalized_title, document_id):
        if not normalized_title:
            return
        existing = self._pub_by_title.get(normalized_title)
        if existing and existing != document_id:
            self._pub_title_duplicates.add(normalized_title)
            log.warning(
                "Duplicate publication title detected: %r (%s and %s); updates may be ambiguous",
                normalized_title,
                existing,
                document_id,
            )
            return
        self._pub_by_title[normalized_title] = document_id

    def _extract_relation_items(self, relation_value):
        """Normalize Strapi relation payloads across flattened and nested response shapes."""
        if not relation_value:
            return []
        if isinstance(relation_value, list):
            return relation_value
        if isinstance(relation_value, dict):
            data = relation_value.get("data")
            if isinstance(data, list):
                return data
            if data:
                return [data]
            # Strapi v5 commonly returns populated relations as a flattened object
            # (no `data` wrapper). Treat the object itself as the related entity.
            if any(key in relation_value for key in ("id", "documentId", "attributes")):
                return [relation_value]
        # Some Strapi v5 responses may return a relation as a raw ID.
        if isinstance(relation_value, (int, float)):
            relation_id = int(relation_value)
            return [{"id": relation_id}] if relation_id else []
        if isinstance(relation_value, str):
            stripped = relation_value.strip()
            if stripped.isdigit():
                relation_id = int(stripped)
                return [{"id": relation_id}] if relation_id else []
        return []

    def _extract_blocks_text(self, value):
        """Flatten rich text blocks into plain text for embedding input."""
        parts = []

        def walk(node):
            if isinstance(node, str):
                text = node.strip()
                if text:
                    parts.append(text)
                return
            if isinstance(node, dict):
                text = node.get("text")
                if isinstance(text, str):
                    trimmed = text.strip()
                    if trimmed:
                        parts.append(trimmed)
                for child in node.values():
                    walk(child)
                return
            if isinstance(node, list):
                for item in node:
                    walk(item)

        walk(value)
        return " ".join(parts).strip()

    def load_existing_publications(self):
        """Pre-fetch all publications, including drafts, for dedup lookups.

        Strapi returns only published rows by default. Drafts must participate in
        dedup too: otherwise an editorial unpublish is invisible to the sync, the
        importer tries to re-create the work, and the create-conflict path can
        update (and republish) the draft. ``status=all`` returns one draft-shaped
        row per document, so a separate published-id query supplies the state.
        """
        log.info("Loading existing publications from Strapi...")
        publications = self._fetch_all_pages(
            "publications",
            {
                "status": "all",
                "fields[0]": "openAlexId",
                "fields[1]": "title",
                "fields[2]": "doi",
                "fields[3]": "documentId",
                "fields[4]": "sourceKind",
                "fields[5]": "slug",
                "fields[6]": "publishedAt",
                "fields[7]": "graphEligible",
                "fields[8]": "kind",
                "fields[9]": "abstract",
                "populate[pdfFile][fields][0]": "id",
            },
        )
        published = self._fetch_all_pages(
            "publications",
            {
                "status": "published",
                "fields[0]": "documentId",
            },
        )
        published_ids = {
            row.get("documentId") or row.get("id")
            for row in published
            if row.get("documentId") or row.get("id")
        }

        self._pub_by_oaid.clear()
        self._pub_by_doi.clear()
        self._pub_by_title.clear()
        self._pub_title_duplicates.clear()
        self._pub_source_kind.clear()
        self._pub_slug.clear()
        self._pub_published.clear()
        self._pub_graph_eligible.clear()
        self._pub_has_pdf.clear()
        self._pub_records.clear()

        for publication in publications:
            attributes = publication.get("attributes", publication)
            document_id = publication.get("documentId") or publication.get("id")
            self._pub_source_kind[document_id] = self._normalize_source_kind(attributes.get("sourceKind"))
            self._pub_slug[document_id] = attributes.get("slug") or ""
            self._pub_published[document_id] = document_id in published_ids
            self._pub_graph_eligible[document_id] = bool(attributes.get("graphEligible"))
            self._pub_has_pdf[document_id] = bool(self._extract_relation_items(attributes.get("pdfFile")))
            normalized_oaid = normalize_openalex_id(attributes.get("openAlexId"))
            normalized_doi = normalize_doi(attributes.get("doi"))
            normalized_title = normalize_title(attributes.get("title"))
            self._pub_records[document_id] = {
                "openAlexId": normalized_oaid,
                "doi": normalized_doi,
                "title": normalized_title,
                "rawTitle": attributes.get("title"),
                "kind": attributes.get("kind"),
                "abstract": attributes.get("abstract"),
            }
            if normalized_oaid:
                self._pub_by_oaid[normalized_oaid] = document_id
            if normalized_doi:
                self._pub_by_doi[normalized_doi] = document_id
            self._remember_title(normalized_title, document_id)
        log.info(
            "  Loaded %s publications (%s published, %s with openAlexId, %s duplicate titles)",
            len(publications),
            len(published_ids),
            len(self._pub_by_oaid),
            len(self._pub_title_duplicates),
        )

    def load_graph_exclusions(self):
        """Load active GraphExclusion records, tolerating a not-yet-migrated Strapi."""
        try:
            rows = self._fetch_all_pages(
                "graph-exclusions",
                {
                    "filters[isActive][$eq]": "true",
                    "fields[0]": "documentId",
                    "fields[1]": "label",
                    "fields[2]": "openAlexId",
                    "fields[3]": "doi",
                    "fields[4]": "title",
                    "fields[5]": "scope",
                    "fields[6]": "isActive",
                },
            )
        except Exception as exc:  # pragma: no cover - depends on deployment state
            status = getattr(getattr(exc, "response", None), "status_code", None)
            if status == 404:
                log.warning(
                    "GraphExclusion content type is not deployed yet; continuing without exclusions"
                )
            else:
                log.warning("Could not load graph exclusions: %s", exc)
            self._graph_exclusions = []
            return []

        exclusions = []
        for row in rows:
            attributes = row.get("attributes", row)
            if attributes.get("isActive") is False:
                continue
            exclusion = {
                "documentId": row.get("documentId") or row.get("id"),
                "label": attributes.get("label") or "",
                "openAlexId": normalize_openalex_id(attributes.get("openAlexId")),
                "doi": normalize_doi(attributes.get("doi")),
                "title": normalize_title(attributes.get("title")),
                "scope": "hideEverywhere"
                if attributes.get("scope") == "hideEverywhere"
                else "graphOnly",
            }
            if not (exclusion["openAlexId"] or exclusion["doi"] or exclusion["title"]):
                log.warning(
                    "Graph exclusion %r has no OpenAlex ID, DOI, or title; ignoring",
                    exclusion["label"] or exclusion["documentId"],
                )
                continue
            exclusions.append(exclusion)

        self._graph_exclusions = exclusions
        log.info("Loaded %s active graph exclusion(s)", len(exclusions))
        return exclusions

    def match_graph_exclusion(self, *, openalex_id=None, doi=None, title=None):
        """Return the first active exclusion matching a publication's identity keys."""
        normalized_oaid = normalize_openalex_id(openalex_id)
        normalized_doi = normalize_doi(doi)
        normalized_title = normalize_title(title)

        for exclusion in self._graph_exclusions:
            if exclusion["openAlexId"] and normalized_oaid == exclusion["openAlexId"]:
                return exclusion
            if exclusion["doi"] and normalized_doi == exclusion["doi"]:
                return exclusion
            if exclusion["title"] and normalized_title == exclusion["title"]:
                return exclusion
        return None

    def apply_graph_exclusions(self):
        """Apply exclusions to existing publications before fetching or rebuilding."""
        stats = {"matched": 0, "graph_updated": 0, "unpublished": 0, "failed": 0}
        if not self._graph_exclusions:
            return stats

        if not self._pub_records:
            self.load_existing_publications()

        matched = {}
        for exclusion in self._graph_exclusions:
            for document_id, record in self._pub_records.items():
                if exclusion["openAlexId"] and record.get("openAlexId") == exclusion["openAlexId"]:
                    matched.setdefault(document_id, exclusion)
                elif exclusion["doi"] and record.get("doi") == exclusion["doi"]:
                    matched.setdefault(document_id, exclusion)
                elif exclusion["title"] and record.get("title") == exclusion["title"]:
                    matched.setdefault(document_id, exclusion)

        for document_id, exclusion in matched.items():
            stats["matched"] += 1

            # Update first, then unpublish. A REST PUT on a draft-and-publish
            # entry republishes it, so unpublishing before the graph flag update
            # silently put hidden records back on the public site.
            if self._pub_graph_eligible.get(document_id):
                if self.update_publication(document_id, {"graphEligible": False}):
                    stats["graph_updated"] += 1
                    self._pub_graph_eligible[document_id] = False
                else:
                    stats["failed"] += 1

            if (
                exclusion["scope"] == "hideEverywhere"
                and self._pub_published.get(document_id)
            ):
                if self.unpublish_publication(document_id):
                    stats["unpublished"] += 1
                else:
                    stats["failed"] += 1

        log.info(
            "Graph exclusions: %s matched, %s removed from graph, %s unpublished, %s failed",
            stats["matched"],
            stats["graph_updated"],
            stats["unpublished"],
            stats["failed"],
        )
        return stats

    def apply_import_scope(self, allowed_types=None, abstract_required_types=None):
        """Remove automated records that no longer belong in the publication graph.

        This is the durable counterpart to the import filter: when a previous
        run imported book front matter or a work type that is now out of scope,
        the record is taken off the public site and out of the graph instead of
        lingering until someone cleans it by hand.
        """
        stats = {
            "checked": 0,
            "out_of_scope": 0,
            "already_clean": 0,
            "graph_updated": 0,
            "unpublished": 0,
            "failed": 0,
        }

        if not self._pub_records:
            self.load_existing_publications()

        for document_id, record in self._pub_records.items():
            if self._pub_source_kind.get(document_id) != "openAlexAutomated":
                continue
            stats["checked"] += 1

            openalex_id = record.get("openAlexId") or ""
            doi = record.get("doi") or ""
            title = record.get("rawTitle") or record.get("title") or ""
            if self.match_graph_exclusion(
                openalex_id=openalex_id,
                doi=doi,
                title=title,
            ):
                # Explicit editorial exclusions win; they have their own scope.
                continue

            paper = {
                "title": title,
                "kind": record.get("kind"),
                "abstract": record.get("abstract"),
            }
            reason = out_of_scope_reason(
                paper,
                allowed_types=allowed_types,
                abstract_required_types=abstract_required_types,
            )
            if not reason:
                continue

            needs_graph_update = bool(self._pub_graph_eligible.get(document_id))
            needs_unpublish = bool(self._pub_published.get(document_id))
            if not needs_graph_update and not needs_unpublish:
                stats["already_clean"] += 1
                continue

            stats["out_of_scope"] += 1
            log.info(
                "  Out of import scope (%s): %s",
                reason,
                (title or document_id)[:80],
            )

            # Update first, then unpublish (see apply_graph_exclusions): a PUT
            # republishes the entry, so the reverse order made the cleanup a
            # no-op on the public site.
            if self._pub_graph_eligible.get(document_id):
                if self.update_publication(document_id, {"graphEligible": False}):
                    stats["graph_updated"] += 1
                    self._pub_graph_eligible[document_id] = False
                else:
                    stats["failed"] += 1

            if self._pub_published.get(document_id):
                if self.unpublish_publication(document_id):
                    stats["unpublished"] += 1
                    self._pub_published[document_id] = False
                else:
                    stats["failed"] += 1

        log.info(
            "Import scope: %s automated records checked, %s out of scope, "
            "%s already clean, %s removed from graph, %s unpublished, %s failed",
            stats["checked"],
            stats["out_of_scope"],
            stats["already_clean"],
            stats["graph_updated"],
            stats["unpublished"],
            stats["failed"],
        )
        return stats

    def load_graph_eligible_publications(self):
        """Load all graph-eligible publications in a graph-builder friendly shape."""
        log.info("Loading graph-eligible publications from Strapi...")
        publications = self._fetch_all_pages(
            "publications",
            {
                "filters[graphEligible][$eq]": "true",
                "fields[0]": "documentId",
                "fields[1]": "title",
                "fields[2]": "openAlexId",
                "fields[3]": "doi",
                "fields[4]": "year",
                "fields[5]": "cited_by",
                "fields[6]": "abstract",
                "fields[7]": "topics",
                "fields[8]": "embedding",
                "fields[9]": "embeddingModel",
                "fields[10]": "embeddingSourceHash",
                "fields[11]": "sourceKind",
                "fields[12]": "metadata",
                "populate[authors][fields][0]": "fullName",
                "populate[pdfFile][fields][0]": "id",
            },
        )

        graph_publications = []
        publication_map = {}

        for publication in publications:
            attributes = publication.get("attributes", publication)
            document_id = publication.get("documentId") or publication.get("id")
            if self.match_graph_exclusion(
                openalex_id=attributes.get("openAlexId"),
                doi=attributes.get("doi"),
                title=attributes.get("title"),
            ):
                log.debug("  Skipping excluded publication: %s", attributes.get("title"))
                continue
            graph_id = attributes.get("openAlexId") or f"publication:{document_id}"

            authors = []
            author_data = self._extract_relation_items(attributes.get("authors"))
            for author in author_data:
                author_attributes = author.get("attributes", author)
                full_name = author_attributes.get("fullName")
                if full_name:
                    authors.append(full_name)

            graph_publications.append(
                {
                    "graphId": graph_id,
                    "documentId": document_id,
                    "openAlexId": attributes.get("openAlexId"),
                    "title": attributes.get("title"),
                    "doi": attributes.get("doi"),
                    "year": attributes.get("year"),
                    "cited_by": attributes.get("cited_by", 0),
                    "abstract": attributes.get("abstract"),
                    "topics": attributes.get("topics") or [],
                    "authors": authors,
                    "embedding": attributes.get("embedding"),
                    "embeddingModel": attributes.get("embeddingModel"),
                    "embeddingSourceHash": attributes.get("embeddingSourceHash"),
                    "metadata": attributes.get("metadata") if isinstance(attributes.get("metadata"), dict) else {},
                }
            )
            publication_map[graph_id] = document_id

        log.info(f"  Loaded {len(graph_publications)} graph-eligible publications")
        return graph_publications, publication_map

    def load_graph_macros(self):
        """Load graph macro records for assignment scoring."""
        log.info("Loading graph macros from Strapi...")
        macros = self._fetch_all_pages(
            "graph-macros",
            {
                "fields[0]": "documentId",
                "fields[1]": "name",
                "fields[2]": "slug",
                "fields[3]": "keywords",
                "fields[4]": "description",
                "fields[5]": "isActive",
                "fields[6]": "sortOrder",
            },
        )

        graph_macros = []
        for macro in macros:
            attributes = macro.get("attributes", macro)
            document_id = macro.get("documentId") or macro.get("id")
            if not document_id:
                continue
            graph_macros.append(
                {
                    "documentId": document_id,
                    "name": attributes.get("name") or "",
                    "slug": attributes.get("slug") or "",
                    "keywords": attributes.get("keywords") or "",
                    "description": self._extract_blocks_text(attributes.get("description")),
                    "isActive": attributes.get("isActive", True),
                    "sortOrder": attributes.get("sortOrder"),
                }
            )

        graph_macros.sort(key=lambda macro: (macro.get("name") or "").lower())
        log.info(f"  Loaded {len(graph_macros)} graph macros")
        return graph_macros

    def load_graph_mesos(self):
        """Load graph meso records for assignment mapping."""
        log.info("Loading graph mesos from Strapi...")
        mesos = self._fetch_all_pages(
            "graph-mesos",
            {
                "fields[0]": "documentId",
                "fields[1]": "name",
                "fields[2]": "slug",
                "fields[3]": "keywords",
                "fields[4]": "description",
                "fields[5]": "isActive",
                "fields[6]": "sortOrder",
                "fields[7]": "publishedAt",
                "populate[macro][fields][0]": "documentId",
                "populate[macro][fields][1]": "id",
            },
        )

        graph_mesos = []
        for meso in mesos:
            attributes = meso.get("attributes", meso)
            document_id = meso.get("documentId") or meso.get("id")
            if not document_id:
                continue
            macro_data = self._extract_relation_items(attributes.get("macro"))
            macro_id = None
            if macro_data:
                macro_id = macro_data[0].get("documentId") or macro_data[0].get("id")
            graph_mesos.append(
                {
                    "documentId": document_id,
                    "name": attributes.get("name") or "",
                    "slug": attributes.get("slug") or "",
                    "keywords": attributes.get("keywords") or "",
                    "description": self._extract_blocks_text(attributes.get("description")),
                    "isActive": attributes.get("isActive", True),
                    "sortOrder": attributes.get("sortOrder"),
                    "publishedAt": attributes.get("publishedAt"),
                    "macro": macro_id,
                }
            )

        graph_mesos.sort(key=lambda meso: (meso.get("slug") or "").lower())
        log.info(f"  Loaded {len(graph_mesos)} graph mesos")
        return graph_mesos

    def get_publication_source_kind(self, document_id):
        return self._pub_source_kind.get(document_id)

    def get_publication_slug(self, document_id):
        return self._pub_slug.get(document_id) or ""

    def is_publication_published(self, document_id):
        return bool(self._pub_published.get(document_id))

    def _openalex_author_key(self, value):
        normalized = normalize_openalex_id(value)
        if not normalized:
            return ""
        return normalized.rstrip("/").split("/")[-1]

    def load_existing_people(self):
        """Pre-fetch all Person entries for author matching."""
        log.info("Loading existing people from Strapi...")
        people = self._fetch_all_pages(
            "people",
            {
                "fields[0]": "fullName",
                "fields[1]": "firstName",
                "fields[2]": "lastName",
                "fields[3]": "slug",
                "fields[4]": "documentId",
                "fields[5]": "openAlexAuthorId",
                "fields[6]": "orcid",
            },
        )
        for person in people:
            attributes = person.get("attributes", person)
            document_id = person.get("documentId") or person.get("id")
            name = attributes.get("fullName", "") or " ".join(
                value
                for value in (attributes.get("firstName"), attributes.get("lastName"))
                if value
            )
            info = {
                "documentId": document_id,
                "fullName": name,
                "openAlexAuthorId": attributes.get("openAlexAuthorId") or "",
                "orcid": attributes.get("orcid") or "",
            }
            normalized_name = normalize_person_name(name)
            if normalized_name:
                self._person_by_name[normalized_name] = info
            author_key = self._openalex_author_key(attributes.get("openAlexAuthorId"))
            if author_key:
                self._person_by_oaid[author_key] = info
        log.info(
            "  Loaded %s people (%s with OpenAlex author ids)",
            len(self._person_by_name),
            len(self._person_by_oaid),
        )

    def load_import_people(self):
        """Load Strapi people that can be used as author import seeds."""
        log.info("Loading importable people from Strapi...")
        people = self._fetch_all_pages(
            "people",
            {
                "fields[0]": "fullName",
                "fields[1]": "firstName",
                "fields[2]": "lastName",
                "fields[3]": "documentId",
                "fields[4]": "slug",
                "fields[5]": "type",
                "fields[6]": "importEligible",
                "fields[7]": "openAlexAuthorId",
                "fields[8]": "orcid",
            },
        )

        import_people = []
        for person in people:
            attributes = person.get("attributes", person)
            import_eligible = attributes.get("importEligible")
            if import_eligible is not True:
                continue

            document_id = person.get("documentId") or person.get("id")
            full_name = (attributes.get("fullName") or "").strip()
            if not full_name:
                first = (attributes.get("firstName") or "").strip()
                last = (attributes.get("lastName") or "").strip()
                full_name = f"{first} {last}".strip()

            if not full_name or not document_id:
                continue
            import_people.append(
                {
                    "documentId": document_id,
                    "fullName": full_name,
                    "slug": attributes.get("slug"),
                    "type": attributes.get("type"),
                    "openAlexAuthorId": attributes.get("openAlexAuthorId") or "",
                    "orcid": attributes.get("orcid") or "",
                }
            )

        import_people.sort(key=lambda person: person["fullName"].lower())
        log.info(f"  Loaded {len(import_people)} importable people")
        return import_people

    def update_person_author_id(self, document_id, author_id, orcid=None):
        """Persist a resolved OpenAlex author id so the next run does not re-search.

        Person records are draft-and-publish with required ``bio``/``portrait``
        fields, and some imported rows have a null draft bio.  A partial PUT then
        fails validation before it ever reaches our field, so fetch the current
        values and include them in the update.
        """
        current = self._request(
            "GET",
            f"{self.api_url}/people/{document_id}",
            headers=self.headers,
            params={
                "fields[0]": "bio",
                "fields[1]": "publishedAt",
                "populate[portrait][fields][0]": "id",
            },
        )
        payload = {"openAlexAuthorId": author_id}
        if orcid:
            payload["orcid"] = orcid
        status = None
        if current.ok:
            attrs = current.json().get("data") or {}
            attrs = attrs.get("attributes", attrs)
            if attrs.get("bio") is None:
                payload["bio"] = ""
            portrait = self._extract_relation_items(attrs.get("portrait"))
            if portrait:
                payload["portrait"] = portrait[0].get("id")
            else:
                log.warning(
                    "Skipping author-id pin for person %s: portrait is required by the schema but missing",
                    document_id,
                )
                return False
            if attrs.get("publishedAt"):
                status = "published"
        return self.update_person(document_id, payload, status=status)

    def update_person(self, document_id, payload, status=None):
        url = f"{self.api_url}/people/{document_id}"
        if status:
            url = f"{url}?status={status}"
        response = self._request(
            "PUT",
            url,
            headers=self.headers,
            json={"data": payload},
        )
        if not response.ok:
            log.error(
                "Failed to update person %s: %s %s",
                document_id,
                response.status_code,
                response.text[:1000],
            )
            return False
        return True

    def load_publication_author_ids(self, document_id):
        """Load current author relations for a publication so imports can merge additively."""
        try:
            response = self._request(
                "GET",
                f"{self.api_url}/publications/{document_id}",
                headers=self.headers,
                params={
                    "populate[authors][fields][0]": "documentId",
                    "populate[authors][fields][1]": "id",
                    "populate[pdfFile][fields][0]": "id",
                },
            )
            response.raise_for_status()
            data = response.json().get("data", {})
            attributes = data.get("attributes", data)
            self._pub_has_pdf[document_id] = bool(self._extract_relation_items(attributes.get("pdfFile")))
            author_data = self._extract_relation_items(attributes.get("authors"))
            author_ids = []
            for author in author_data:
                author_id = author.get("documentId") or author.get("id")
                if author_id:
                    author_ids.append(author_id)
            return author_ids
        except requests.exceptions.RequestException as exc:
            log.warning(f"Failed to load authors for publication {document_id}: {exc}")
            return []

    def merge_publication_author_ids(self, document_id, imported_author_ids):
        """Merge imported author matches with existing curated author relations."""
        if not imported_author_ids:
            return None

        existing_author_ids = self.load_publication_author_ids(document_id)
        merged_author_ids = list(dict.fromkeys([*existing_author_ids, *imported_author_ids]))
        return merged_author_ids

    def find_existing_publication(self, openalex_id=None, doi=None, title=None):
        """Find an existing publication by OpenAlex ID, DOI, or fuzzy title."""
        normalized_oaid = normalize_openalex_id(openalex_id)
        normalized_doi = normalize_doi(doi)
        normalized_title = normalize_title(title)

        if normalized_oaid and normalized_oaid in self._pub_by_oaid:
            return self._pub_by_oaid[normalized_oaid], "openAlexId"

        if normalized_doi and normalized_doi in self._pub_by_doi:
            return self._pub_by_doi[normalized_doi], "doi"

        if normalized_title:
            if normalized_title in self._pub_title_duplicates:
                log.warning(
                    "Title %r matches multiple publications; reusing the first match",
                    normalized_title,
                )
            if normalized_title in self._pub_by_title:
                return self._pub_by_title[normalized_title], "title_exact"
            for existing_title, document_id in self._pub_by_title.items():
                if SequenceMatcher(None, normalized_title, existing_title).ratio() > 0.95:
                    return document_id, "title_fuzzy"

        return None, None

    def find_publication_remote(self, openalex_id=None, doi=None, title=None):
        """Look up a publication directly from Strapi, bypassing the local cache.

        Used when a create races another sync (or a draft is invisible to the
        cached snapshot): the record may already exist even though our in-memory
        index did not contain it yet.
        """
        candidates = []
        normalized_oaid = normalize_openalex_id(openalex_id)
        normalized_doi = normalize_doi(doi)
        normalized_title = normalize_title(title)
        if normalized_oaid:
            candidates.append(("openAlexId", normalized_oaid))
        if normalized_doi:
            candidates.append(("doi", normalized_doi))
        if normalized_title:
            candidates.append(("title", title))

        for field, value in candidates:
            for status in (None, "draft"):
                params = {
                    f"filters[{field}][$eq]": value,
                    "pagination[pageSize]": 5,
                    "fields[0]": "documentId",
                    "fields[1]": "openAlexId",
                    "fields[2]": "doi",
                    "fields[3]": "title",
                    "fields[4]": "sourceKind",
                    "fields[5]": "slug",
                    "fields[6]": "publishedAt",
                    "fields[7]": "graphEligible",
                }
                if status:
                    params["status"] = status
                response = self._request(
                    "GET",
                    f"{self.api_url}/publications",
                    headers=self.headers,
                    params=params,
                )
                if not response.ok:
                    continue
                rows = response.json().get("data") or []
                for row in rows:
                    attributes = row.get("attributes", row)
                    document_id = row.get("documentId") or row.get("id")
                    if document_id:
                        self._remember_remote_publication(document_id, attributes)
                        log.info(
                            "  Found existing publication remotely by %s%s",
                            field,
                            " (draft)" if status else "",
                        )
                        return document_id
        return None

    def _remember_remote_publication(self, document_id, attributes):
        """Cache a publication discovered outside the bulk snapshot."""
        self._pub_source_kind[document_id] = self._normalize_source_kind(attributes.get("sourceKind"))
        self._pub_slug[document_id] = attributes.get("slug") or ""
        self._pub_published[document_id] = bool(attributes.get("publishedAt"))
        self._pub_graph_eligible[document_id] = bool(attributes.get("graphEligible"))
        normalized_oaid = normalize_openalex_id(attributes.get("openAlexId"))
        normalized_doi = normalize_doi(attributes.get("doi"))
        normalized_title = normalize_title(attributes.get("title"))
        if normalized_oaid:
            self._pub_by_oaid[normalized_oaid] = document_id
        if normalized_doi:
            self._pub_by_doi[normalized_doi] = document_id
        if normalized_title:
            self._remember_title(normalized_title, document_id)

    def match_authors(self, author_names, author_ids=None):
        """Map imported authors to Person ids, preferring OpenAlex author ids."""
        matched = []
        names = list(author_names or [])
        ids = list(author_ids or [])
        paired = list(zip(ids, names))
        if len(names) > len(ids):
            paired.extend((None, name) for name in names[len(ids):])
        paired.extend((raw_id, None) for raw_id in ids[len(names):])

        for raw_id, name in paired:
            if raw_id:
                author_key = self._openalex_author_key(raw_id)
                info = self._person_by_oaid.get(author_key)
                if info:
                    # An OpenAlex id is authoritative; do not also fuzzy-match
                    # this author's name to a different person record.
                    matched.append(info["documentId"])
                    continue

            normalized_name = normalize_person_name(name)
            if not normalized_name:
                continue

            info = self._person_by_name.get(normalized_name)
            if info:
                matched.append(info["documentId"])
                continue

            tokens = set(normalized_name.split())
            best = None
            best_ratio = 0.0
            subset_match = None
            for existing_name, candidate in self._person_by_name.items():
                candidate_tokens = set(existing_name.split())
                if min(len(tokens), len(candidate_tokens)) >= 2 and (
                    tokens <= candidate_tokens or candidate_tokens <= tokens
                ):
                    subset_match = candidate
                    break
                ratio = SequenceMatcher(None, normalized_name, existing_name).ratio()
                if ratio > best_ratio:
                    best_ratio = ratio
                    best = candidate

            if subset_match is not None:
                matched.append(subset_match["documentId"])
            elif best is not None and best_ratio >= 0.92:
                matched.append(best["documentId"])
            elif best is not None and best_ratio >= 0.88:
                log.debug(
                    "Ambiguous author match: %r ~ %r (%.2f)",
                    name,
                    best.get("fullName"),
                    best_ratio,
                )

        return list(dict.fromkeys(matched))

    def upload_pdf_from_openalex(self, paper_data, filename):
        """Download a PDF URL from OpenAlex or synthesize from DOI, then upload to Strapi media library.
        
        Tries two sources:
        1. Direct OpenAlex open_access.oa_url
        2. arXiv DOI pattern synthesis
        
        Returns None if neither is available.
        """
        result = self._empty_pdf_result()
        result["attempted"] = True

        # Try OpenAlex direct URL first
        oa_url = paper_data.get("pdf_url")
        if oa_url:
            result["resolved"] = True
            result["pdf_url"] = oa_url
            result["pdf_source"] = "openalex"
            log.info(f"  Found PDF URL from OpenAlex: {oa_url}")
        else:
            # Try arXiv pattern synthesis
            doi = paper_data.get("doi")
            if doi:
                direct_pdf_url = self._build_pdf_url_from_doi(normalize_doi(doi))
                if direct_pdf_url:
                    result["resolved"] = True
                    result["pdf_url"] = direct_pdf_url
                    result["pdf_source"] = "arxiv_doi_pattern"
                    log.info(f"  Built direct PDF URL from arXiv pattern: {direct_pdf_url}")

        # If no PDF URL was found, return empty result
        if not result.get("resolved"):
            log.info(f"  No PDF URL available (no OpenAlex URL and not an arXiv paper)")
            return result

        # Download and upload the PDF
        try:
            pdf_content = _download_pdf(
                result["pdf_url"],
                max_bytes=self.pdf_max_bytes,
                timeout=max(30.0, self.timeout / 2),
            )
            result["downloaded"] = True

            files = {
                "files": (filename, BytesIO(pdf_content), "application/pdf"),
            }
            upload_response = self._request(
                "POST",
                f"{self.api_url}/upload",
                headers=self.upload_headers,
                files=files,
            )
            upload_response.raise_for_status()
            uploaded_file = upload_response.json()[0]
            attachment_id = uploaded_file["id"]
            result["uploaded"] = True
            result["attachment_id"] = attachment_id
            log.info(f"  Uploaded PDF to Strapi media library: {attachment_id}")
            return result
        except Exception as exc:
            result["error"] = str(exc)
            log.warning(f"  PDF download/upload failed: {exc}")
            return result

    def delete_media(self, attachment_id):
        """Delete an orphaned media file after a failed publication write."""
        if not attachment_id:
            return True
        response = self._request(
            "DELETE",
            f"{self.api_url}/upload/files/{attachment_id}",
            headers=self.upload_headers,
        )
        if not response.ok:
            log.warning(
                "  Failed to clean up media %s: %s %s",
                attachment_id,
                response.status_code,
                response.text[:500],
            )
            return False
        return True

    def ensure_publication_pdf(self, paper_data, *, existing_document_id=None):
        """Ensure a publication has a PDF attachment, skipping work when one already exists."""
        if existing_document_id and self.has_publication_pdf(existing_document_id):
            return self._empty_pdf_result()

        return self.upload_pdf_from_openalex(
            paper_data,
            self._build_pdf_filename(paper_data),
        )

    def create_publication(self, paper_data, author_ids=None, attachment_id=None):
        """Create a publication entry in Strapi from a processed paper."""
        payload = self.build_import_create_payload(
            paper_data,
            author_ids=author_ids,
            attachment_id=attachment_id,
        )

        response = self._request(
            "POST",
            f"{self.api_url}/publications",
            headers=self.headers,
            json={"data": payload},
        )
        self.last_error = None
        if not response.ok:
            self.last_error = self._response_error(response)
            log.error(
                "Failed to create publication '%s': %s %s",
                paper_data.get("title", "?"),
                response.status_code,
                response.text[:2000],
            )
            return {
                "document_id": None,
                "error": self.last_error,
            }

        created = response.json().get("data", {})
        document_id = created.get("documentId") or created.get("id")
        if document_id:
            self._pub_source_kind[document_id] = "openAlexAutomated"
            self._pub_slug[document_id] = payload.get("slug") or ""
            self._pub_published[document_id] = bool(payload.get("publishedAt"))
            if attachment_id:
                self._pub_has_pdf[document_id] = True
            normalized_oaid = normalize_openalex_id(paper_data.get("openAlexId"))
            normalized_doi = normalize_doi(paper_data.get("doi"))
            normalized_title = normalize_title(paper_data.get("title"))
            if normalized_oaid:
                self._pub_by_oaid[normalized_oaid] = document_id
            if normalized_doi:
                self._pub_by_doi[normalized_doi] = document_id
            self._remember_title(normalized_title, document_id)
        else:
            self.last_error = {"status_code": response.status_code, "error": "Response did not contain a document id"}
            log.error(
                "Created publication without a document id: %s",
                response.text[:1000],
            )
        return {
            "document_id": document_id,
            "error": self.last_error,
        }

    def unpublish_publication(self, document_id):
        """Unpublish a document through the custom content API route."""
        response = self._request(
            "POST",
            f"{self.api_url}/publications/{document_id}/unpublish",
            headers=self.headers,
            json={},
        )
        if not response.ok:
            self.last_error = self._response_error(response)
            log.error(
                "Failed to unpublish publication %s: %s %s",
                document_id,
                response.status_code,
                response.text[:1000],
            )
            return False
        self._pub_published[document_id] = False
        return True

    def update_publication(self, document_id, update_data):
        """Partial update of an existing publication.

        A 400 usually means a Strapi uniqueness check rejected the machine-owned
        title or an author relation.  Retry without the conflicting field so the
        rest of the machine metadata still lands, and report the partial update.
        """
        self.last_error = None
        attempts = [("full", update_data)]
        if "title" in update_data:
            attempts.append(("without_title", {k: v for k, v in update_data.items() if k != "title"}))
        if "authors" in update_data:
            attempts.append(("without_title_authors", {
                k: v for k, v in update_data.items() if k not in {"title", "authors"}
            }))

        last_response = None
        for label, payload in attempts:
            # A plain REST PUT republishes a draft-and-publish entry. Keep an
            # editorially unpublished record draft, while published records still
            # update their public version with the new metadata.
            params = {"status": "draft"} if self._pub_published.get(document_id) is False else None
            response = self._request(
                "PUT",
                f"{self.api_url}/publications/{document_id}",
                headers=self.headers,
                params=params,
                json={"data": payload},
            )
            last_response = response
            if response.ok:
                if label != "full":
                    log.warning(
                        "  Publication %s updated with fallback (%s) after a rejected field",
                        document_id,
                        label,
                    )
                if "sourceKind" in payload:
                    self._pub_source_kind[document_id] = self._normalize_source_kind(payload.get("sourceKind"))
                if "slug" in payload:
                    self._pub_slug[document_id] = payload.get("slug") or ""
                if "publishedAt" in payload:
                    self._pub_published[document_id] = bool(payload.get("publishedAt"))
                if "graphEligible" in payload:
                    self._pub_graph_eligible[document_id] = bool(payload.get("graphEligible"))
                if "pdfFile" in payload:
                    self._pub_has_pdf[document_id] = bool(payload.get("pdfFile"))
                return True
            if response.status_code != 400:
                break

        self.last_error = self._response_error(last_response)
        log.error(
            "Failed to update publication %s: %s %s",
            document_id,
            getattr(last_response, "status_code", "?"),
            getattr(last_response, "text", "")[:2000],
        )
        return False

    def build_graph_metadata_payload(
        self,
        embedding_payload=None,
        community_id=None,
        community_label=None,
        secondary_clusters=None,
        topic_superclusters=None,
        existing_metadata=None,
        indexed_at=None,
        clear_missing=False,
    ):
        """Build a publication patch for graph-derived metadata only."""
        payload = {"lastGraphIndexedAt": indexed_at} if indexed_at else {}

        if embedding_payload:
            payload.update(embedding_payload)
        elif clear_missing:
            payload.update(
                {
                    "embedding": None,
                    "embeddingModel": None,
                    "embeddingUpdatedAt": None,
                    "embeddingSourceHash": None,
                }
            )

        if community_id is not None:
            payload["community"] = community_id
            payload["communityLabel"] = community_label
        elif clear_missing:
            payload["community"] = None
            payload["communityLabel"] = None

        if secondary_clusters is not None:
            payload["secondaryClusters"] = secondary_clusters
        elif clear_missing:
            payload["secondaryClusters"] = None

        base_metadata = existing_metadata if isinstance(existing_metadata, dict) else {}
        metadata = dict(base_metadata)
        graph_metadata = metadata.get("graph")
        if not isinstance(graph_metadata, dict):
            graph_metadata = {}

        has_existing_topic_superclusters = "topicSuperclusters" in graph_metadata
        if topic_superclusters and topic_superclusters.get("ids"):
            graph_metadata["topicSuperclusters"] = topic_superclusters
        elif clear_missing and has_existing_topic_superclusters:
            graph_metadata.pop("topicSuperclusters", None)

        if graph_metadata:
            metadata["graph"] = graph_metadata
            payload["metadata"] = metadata
        elif clear_missing and "graph" in metadata:
            metadata.pop("graph", None)
            payload["metadata"] = metadata or None

        return payload

    def get_publication_id_by_openalex(self, openalex_id):
        """Find an existing Strapi document ID for a given OpenAlex ID."""
        normalized_oaid = normalize_openalex_id(openalex_id)
        if normalized_oaid in self._pub_by_oaid:
            return self._pub_by_oaid[normalized_oaid]

        if not normalized_oaid:
            return None

        params = {
            "filters[openAlexId][$eq]": normalized_oaid,
            "pagination[pageSize]": 1,
            "fields[0]": "documentId",
            "fields[1]": "id",
            "fields[2]": "sourceKind",
            "fields[3]": "slug",
            "fields[4]": "publishedAt",
        }
        try:
            response = requests.get(f"{self.api_url}/publications", headers=self.headers, params=params)
            response.raise_for_status()
            data = response.json().get("data", [])
            if data:
                document_id = data[0].get("documentId") or data[0].get("id")
                attributes = data[0].get("attributes", data[0])
                self._pub_source_kind[document_id] = self._normalize_source_kind(attributes.get("sourceKind"))
                self._pub_slug[document_id] = attributes.get("slug") or ""
                self._pub_published[document_id] = bool(attributes.get("publishedAt"))
                self._pub_has_pdf[document_id] = bool(self._extract_relation_items(attributes.get("pdfFile")))
                self._pub_by_oaid[normalized_oaid] = document_id
                return document_id
            return None
        except Exception:
            return None

    def create_graph_link(self, source_id, target_id, score, is_cross_cluster=False):
        """Create a graph link relationship between two publications."""
        payload = {
            "data": {
                "source": source_id,
                "target": target_id,
                "score": score,
                "isCrossCluster": is_cross_cluster,
            }
        }
        response = self._request(
            "POST", f"{self.api_url}/graph-links", headers=self.headers, json=payload
        )
        if not response.ok:
            log.error(
                "Failed to link publications: %s %s",
                response.status_code,
                response.text[:1000],
            )
            return False
        return True

    def create_graph_meso(self, payload):
        """Create a graph meso entry."""
        if "publishedAt" not in payload:
            payload = {**payload, "publishedAt": self._utc_now()}
        response = self._request(
            "POST",
            f"{self.api_url}/graph-mesos",
            headers=self.headers,
            json={"data": payload},
        )
        if not response.ok:
            log.error(
                "Failed to create graph meso %r: %s %s",
                payload.get("name"),
                response.status_code,
                response.text[:1000],
            )
            return None
        created = response.json().get("data", {})
        return created.get("documentId") or created.get("id")

    def update_graph_meso(self, document_id, payload):
        """Update a graph meso entry."""
        response = self._request(
            "PUT",
            f"{self.api_url}/graph-mesos/{document_id}",
            headers=self.headers,
            json={"data": payload},
        )
        if not response.ok:
            log.error(
                "Failed to update graph meso %s: %s %s",
                document_id,
                response.status_code,
                response.text[:1000],
            )
            return False
        return True

    def delete_graph_meso(self, document_id):
        """Delete a pipeline-generated graph meso that is no longer used."""
        response = self._request(
            "DELETE",
            f"{self.api_url}/graph-mesos/{document_id}",
            headers=self.headers,
        )
        if not response.ok:
            log.error(
                "Failed to delete graph meso %s: %s %s",
                document_id,
                response.status_code,
                response.text[:500],
            )
            return False
        return True

    def prune_stale_mesos(self, keep_ids, logger=None):
        """Remove unused pipeline mesos so cluster churn does not leak rows."""
        log = logger or logging.getLogger("paper-sync")
        keep = set(keep_ids)
        mesos = self._fetch_all_pages(
            "graph-mesos",
            {
                "fields[0]": "documentId",
                "fields[1]": "slug",
                "fields[2]": "name",
                "fields[3]": "keywords",
                "populate[publications][fields][0]": "documentId",
                "populate[publicationsPrimary][fields][0]": "documentId",
            },
        )
        deleted = 0
        for meso in mesos:
            attrs = meso.get("attributes", meso)
            document_id = meso.get("documentId") or meso.get("id")
            slug = attrs.get("slug") or ""
            if not document_id or document_id in keep:
                continue
            # Older runs used a name-based slug and left those rows behind when
            # the pipeline switched to macro-scoped `sc-` slugs. They are still
            # pipeline-generated when `keywords` is set, so prune them too.
            if not slug.startswith(MESO_SLUG_PREFIX) and not (attrs.get("keywords") or "").strip():
                continue
            if self._extract_relation_items(attrs.get("publications")):
                continue
            if self._extract_relation_items(attrs.get("publicationsPrimary")):
                continue
            if self.delete_graph_meso(document_id):
                deleted += 1
        if deleted:
            log.info("Pruned %s stale graph mesos", deleted)
        return deleted

    def load_graph_link_ids(self):
        """Return the document ids of every current graph link."""
        graph_links = self._fetch_all_pages(
            "graph-links",
            {
                "fields[0]": "documentId",
                "fields[1]": "id",
            },
        )
        return [
            graph_link.get("documentId") or graph_link.get("id")
            for graph_link in graph_links
            if graph_link.get("documentId") or graph_link.get("id")
        ]

    def delete_graph_links(self, document_ids):
        """Delete graph links by document id and return the deleted count."""
        deleted = 0
        for document_id in document_ids:
            response = self._request(
                "DELETE", f"{self.api_url}/graph-links/{document_id}", headers=self.headers
            )
            if response.ok:
                deleted += 1
            else:
                log.error(
                    "Failed to delete graph link %s: %s %s",
                    document_id,
                    response.status_code,
                    response.text[:500],
                )
        return deleted

    def clear_graph_links(self):
        """Delete all existing graph links so derived graph state can be rebuilt cleanly."""
        deleted = self.delete_graph_links(self.load_graph_link_ids())
        log.info(f"Cleared {deleted} graph links")
        return deleted
