import ipaddress
import logging
import socket
from datetime import datetime, timezone
from difflib import SequenceMatcher
from io import BytesIO
from urllib.parse import quote, urljoin, urlparse

import requests

from .utils import normalize_doi, normalize_openalex_id, normalize_title, slugify

log = logging.getLogger(__name__)

MAX_PDF_BYTES = 10 * 1024 * 1024


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


def _download_pdf(url: str) -> bytes:
    """Download a PDF without following redirects into private networks."""
    current = url
    for _ in range(4):
        _validate_public_https_url(current)
        with requests.get(
            current,
            timeout=15,
            allow_redirects=False,
            stream=True,
            # Do not let HTTP(S)_PROXY in the environment bypass the IP check.
            proxies={"http": None, "https": None},
        ) as response:
            if response.is_redirect:
                location = response.headers.get("location")
                if not location:
                    raise ValueError("PDF redirect has no Location header")
                current = urljoin(current, location)
                continue

            response.raise_for_status()

            chunks = []
            total = 0
            for chunk in response.iter_content(chunk_size=64 * 1024):
                if not chunk:
                    continue
                total += len(chunk)
                if total > MAX_PDF_BYTES:
                    raise ValueError("PDF is larger than the 10 MB limit")
                chunks.append(chunk)

            content = b"".join(chunks)
            if not content.startswith(b"%PDF-"):
                raise ValueError("Downloaded content is not a PDF")

            return content

    raise ValueError("Too many redirects while downloading the PDF")


class StrapiClient:
    def __init__(self, base_url, token):
        self.base_url = base_url.rstrip("/")
        self.api_url = f"{self.base_url}/api"
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
        self._pub_source_kind = {}
        self._pub_slug = {}
        self._pub_published = {}
        self._pub_has_pdf = {}
        self._person_by_name = {}

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
        page = 1
        base_params = params or {}
        while True:
            paged = {**base_params, "pagination[page]": page, "pagination[pageSize]": 100}
            response = requests.get(f"{self.api_url}/{endpoint}", headers=self.headers, params=paged)
            response.raise_for_status()
            payload = response.json()
            data = payload.get("data", [])
            results.extend(data)
            meta = payload.get("meta", {}).get("pagination", {})
            if not meta.get("pageCount") or page >= meta["pageCount"]:
                break
            page += 1
        return results

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
        """Pre-fetch all publications for dedup lookups."""
        log.info("Loading existing publications from Strapi...")
        publications = self._fetch_all_pages(
            "publications",
            {
                "fields[0]": "openAlexId",
                "fields[1]": "title",
                "fields[2]": "doi",
                "fields[3]": "documentId",
                "fields[4]": "sourceKind",
                "fields[5]": "slug",
                "fields[6]": "publishedAt",
                "populate[pdfFile][fields][0]": "id",
            },
        )
        for publication in publications:
            attributes = publication.get("attributes", publication)
            document_id = publication.get("documentId") or publication.get("id")
            self._pub_source_kind[document_id] = self._normalize_source_kind(attributes.get("sourceKind"))
            self._pub_slug[document_id] = attributes.get("slug") or ""
            self._pub_published[document_id] = bool(attributes.get("publishedAt"))
            self._pub_has_pdf[document_id] = bool(self._extract_relation_items(attributes.get("pdfFile")))
            normalized_oaid = normalize_openalex_id(attributes.get("openAlexId"))
            normalized_doi = normalize_doi(attributes.get("doi"))
            normalized_title = normalize_title(attributes.get("title"))
            if normalized_oaid:
                self._pub_by_oaid[normalized_oaid] = document_id
            if normalized_doi:
                self._pub_by_doi[normalized_doi] = document_id
            if normalized_title:
                self._pub_by_title[normalized_title] = document_id
        log.info(f"  Loaded {len(publications)} publications ({len(self._pub_by_oaid)} with openAlexId)")

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

    def load_existing_people(self):
        """Pre-fetch all Person entries for author matching."""
        log.info("Loading existing people from Strapi...")
        people = self._fetch_all_pages(
            "people",
            {
                "fields[0]": "fullName",
                "fields[1]": "slug",
                "fields[2]": "documentId",
            },
        )
        for person in people:
            attributes = person.get("attributes", person)
            document_id = person.get("documentId") or person.get("id")
            name = attributes.get("fullName", "")
            if name:
                self._person_by_name[name.lower().strip()] = {
                    "documentId": document_id,
                    "fullName": name,
                }
        log.info(f"  Loaded {len(self._person_by_name)} people")

    def load_import_people(self):
        """Load Strapi people that can be used as author import seeds."""
        log.info("Loading importable people from Strapi...")
        people = self._fetch_all_pages(
            "people",
            {
                "fields[0]": "firstName",
                "fields[1]": "lastName",
                "fields[2]": "documentId",
                "fields[3]": "slug",
                "fields[4]": "type",
                "fields[5]": "importEligible",
            },
        )

        import_people = []
        for person in people: 
            attributes = person.get("attributes", person)
            import_eligible = attributes.get("importEligible")
            if import_eligible is not True:
                continue

            document_id = person.get("documentId") or person.get("id")
            first = (attributes.get("firstName") or "").strip()
            last = (attributes.get("lastName") or "").strip()
            if first or last:
                full_name = (f"{first} {last}".strip())

            if not full_name or not document_id:
                continue
            import_people.append(
                {
                    "documentId": document_id,
                    "fullName": full_name,
                    "slug": attributes.get("slug"),
                    "type": attributes.get("type"),
                }
            )

        import_people.sort(key=lambda person: person["fullName"].lower())
        log.info(f"  Loaded {len(import_people)} importable people")
        return import_people

    def load_publication_author_ids(self, document_id):
        """Load current author relations for a publication so imports can merge additively."""
        try:
            response = requests.get(
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
            if normalized_title in self._pub_by_title:
                return self._pub_by_title[normalized_title], "title_exact"
            for existing_title, document_id in self._pub_by_title.items():
                if SequenceMatcher(None, normalized_title, existing_title).ratio() > 0.95:
                    return document_id, "title_fuzzy"

        return None, None

    def match_authors(self, author_names):
        """Map imported author names to existing Strapi Person document IDs."""
        matched = []
        for name in author_names or []:
            normalized_name = name.lower().strip()
            if normalized_name in self._person_by_name:
                matched.append(self._person_by_name[normalized_name]["documentId"])
                continue
            for existing_name, info in self._person_by_name.items():
                if SequenceMatcher(None, normalized_name, existing_name).ratio() > 0.90:
                    matched.append(info["documentId"])
                    break
        return matched

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
            pdf_content = _download_pdf(result["pdf_url"])
            result["downloaded"] = True

            files = {
                "files": (filename, BytesIO(pdf_content), "application/pdf"),
            }
            upload_response = requests.post(
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
            log.warning(f"  PDF download/upload failed: {exc}")
            return result

    def ensure_publication_pdf(self, paper_data, *, existing_document_id=None):
        """Ensure a publication has a PDF attachment, skipping work when one already exists."""
        if existing_document_id and self.has_publication_pdf(existing_document_id):
            return self._empty_pdf_result()

        return self.upload_pdf_from_openalex(
            paper_data,
            self._build_pdf_filename(paper_data),
        )

    def create_publication(self, paper_data, author_ids=None):
        """Create a publication entry in Strapi from a processed paper."""
        pdf_result = self.ensure_publication_pdf(paper_data)
        attachment_id = pdf_result.get("attachment_id")

        payload = self.build_import_create_payload(
            paper_data,
            author_ids=author_ids,
            attachment_id=attachment_id,
        )

        try:
            response = requests.post(
                f"{self.api_url}/publications",
                headers=self.headers,
                json={"data": payload},
            )
            response.raise_for_status()
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
                if normalized_title:
                    self._pub_by_title[normalized_title] = document_id
            return {
                "document_id": document_id,
                "pdf_result": pdf_result,
            }
        except requests.exceptions.RequestException as exc:
            log.error(f"Failed to create publication '{paper_data.get('title', '?')}': {exc}")
            return {
                "document_id": None,
                "pdf_result": pdf_result,
            }

    def update_publication(self, document_id, update_data):
        """Partial update of an existing publication."""
        try:
            response = requests.put(
                f"{self.api_url}/publications/{document_id}",
                headers=self.headers,
                json={"data": update_data},
            )
            response.raise_for_status()
            if "sourceKind" in update_data:
                self._pub_source_kind[document_id] = self._normalize_source_kind(update_data.get("sourceKind"))
            if "slug" in update_data:
                self._pub_slug[document_id] = update_data.get("slug") or ""
            if "publishedAt" in update_data:
                self._pub_published[document_id] = bool(update_data.get("publishedAt"))
            if "pdfFile" in update_data:
                self._pub_has_pdf[document_id] = bool(update_data.get("pdfFile"))
            return True
        except requests.exceptions.RequestException as exc:
            log.error(f"Failed to update publication {document_id}: {exc}")
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
        try:
            response = requests.post(
                f"{self.api_url}/graph-links",
                headers=self.headers,
                json=payload,
            )
            response.raise_for_status()
            return True
        except requests.exceptions.RequestException as exc:
            log.error(f"Failed to link publications: {exc}")
            return False

    def create_graph_meso(self, payload):
        """Create a graph meso entry."""
        if "publishedAt" not in payload:
            payload = {**payload, "publishedAt": self._utc_now()}
        try:
            response = requests.post(
                f"{self.api_url}/graph-mesos",
                headers=self.headers,
                json={"data": payload},
            )
            response.raise_for_status()
            created = response.json().get("data", {})
            return created.get("documentId") or created.get("id")
        except requests.exceptions.RequestException as exc:
            log.error(f"Failed to create graph meso: {exc}")
            return None

    def update_graph_meso(self, document_id, payload):
        """Update a graph meso entry."""
        try:
            response = requests.put(
                f"{self.api_url}/graph-mesos/{document_id}",
                headers=self.headers,
                json={"data": payload},
            )
            response.raise_for_status()
            return True
        except requests.exceptions.RequestException as exc:
            log.error(f"Failed to update graph meso {document_id}: {exc}")
            return False

    def clear_graph_links(self):
        """Delete all existing graph links so derived graph state can be rebuilt cleanly."""
        graph_links = self._fetch_all_pages(
            "graph-links",
            {
                "fields[0]": "documentId",
                "fields[1]": "id",
            },
        )

        deleted = 0
        for graph_link in graph_links:
            document_id = graph_link.get("documentId") or graph_link.get("id")
            try:
                response = requests.delete(f"{self.api_url}/graph-links/{document_id}", headers=self.headers)
                response.raise_for_status()
                deleted += 1
            except requests.exceptions.RequestException as exc:
                log.error(f"Failed to delete graph link {document_id}: {exc}")

        log.info(f"Cleared {deleted} graph links")
        return deleted