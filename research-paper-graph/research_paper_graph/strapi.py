import logging
from datetime import datetime, timezone
from difflib import SequenceMatcher
from io import BytesIO

import requests

log = logging.getLogger(__name__)


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
        self._person_by_name = {}

    def build_import_create_payload(self, paper_data, author_ids=None, attachment_id=None):
        """Build the create payload for a new imported publication.

        This only sets machine-managed fields plus safe defaults for imported records.
        """
        payload = self._build_machine_owned_payload(paper_data)
        payload.update(
            {
                "sourceKind": "openalex",
                "verificationStatus": "imported",
                "graphEligible": True,
                "listingEligible": False,
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
        return {
            "title": paper_data["title"],
            "openAlexId": paper_data.get("openAlexId"),
            "doi": paper_data.get("doi"),
            "year": paper_data.get("year"),
            "cited_by": paper_data.get("cited_by", 0),
            "abstract": paper_data.get("abstract"),
            "topics": paper_data.get("topics"),
            "lastImportedAt": imported_at,
            "rawImportMetadata": self._build_raw_import_metadata(paper_data, imported_at),
        }

    def _build_raw_import_metadata(self, paper_data, imported_at):
        return {
            "source": "openalex",
            "sourceId": paper_data.get("openAlexId"),
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
        return []

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
            },
        )
        for publication in publications:
            attributes = publication.get("attributes", publication)
            document_id = publication.get("documentId") or publication.get("id")
            if attributes.get("openAlexId"):
                self._pub_by_oaid[attributes["openAlexId"]] = document_id
            if attributes.get("doi"):
                self._pub_by_doi[attributes["doi"]] = document_id
            if attributes.get("title"):
                self._pub_by_title[attributes["title"].lower().strip()] = document_id
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
                "populate[authors][fields][0]": "fullName",
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
                }
            )
            publication_map[graph_id] = document_id

        log.info(f"  Loaded {len(graph_publications)} graph-eligible publications")
        return graph_publications, publication_map

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

    def load_publication_author_ids(self, document_id):
        """Load current author relations for a publication so imports can merge additively."""
        try:
            response = requests.get(
                f"{self.api_url}/publications/{document_id}",
                headers=self.headers,
                params={
                    "populate[authors][fields][0]": "documentId",
                    "populate[authors][fields][1]": "id",
                },
            )
            response.raise_for_status()
            data = response.json().get("data", {})
            attributes = data.get("attributes", data)
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
        if openalex_id and openalex_id in self._pub_by_oaid:
            return self._pub_by_oaid[openalex_id], "openAlexId"

        if doi and doi in self._pub_by_doi:
            return self._pub_by_doi[doi], "doi"

        if title:
            normalized_title = title.lower().strip()
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

    def upload_pdf(self, pdf_url, filename):
        """Download a PDF and upload it to the Strapi media library."""
        if not pdf_url:
            return None

        log.info(f"  Downloading PDF: {pdf_url}")
        try:
            pdf_response = requests.get(pdf_url, timeout=15)
            pdf_response.raise_for_status()
            files = {
                "files": (filename, BytesIO(pdf_response.content), "application/pdf"),
            }
            upload_response = requests.post(
                f"{self.api_url}/upload",
                headers=self.upload_headers,
                files=files,
            )
            upload_response.raise_for_status()
            return upload_response.json()[0]["id"]
        except Exception as exc:
            log.warning(f"  PDF download/upload failed: {exc}")
            return None

    def create_publication(self, paper_data, author_ids=None):
        """Create a publication entry in Strapi from a processed paper."""
        payload = self.build_import_create_payload(
            paper_data,
            author_ids=author_ids,
            attachment_id=paper_data.get("attachment"),
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
                if paper_data.get("openAlexId"):
                    self._pub_by_oaid[paper_data["openAlexId"]] = document_id
                if paper_data.get("doi"):
                    self._pub_by_doi[paper_data["doi"]] = document_id
                if paper_data.get("title"):
                    self._pub_by_title[paper_data["title"].lower().strip()] = document_id
            return document_id
        except requests.exceptions.RequestException as exc:
            log.error(f"Failed to create publication '{paper_data.get('title', '?')}': {exc}")
            return None

    def update_publication(self, document_id, update_data):
        """Partial update of an existing publication."""
        try:
            response = requests.put(
                f"{self.api_url}/publications/{document_id}",
                headers=self.headers,
                json={"data": update_data},
            )
            response.raise_for_status()
            return True
        except requests.exceptions.RequestException as exc:
            log.error(f"Failed to update publication {document_id}: {exc}")
            return False

    def build_graph_metadata_payload(
        self,
        embedding_payload=None,
        community_id=None,
        community_label=None,
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

        return payload

    def get_publication_id_by_openalex(self, openalex_id):
        """Find an existing Strapi document ID for a given OpenAlex ID."""
        if openalex_id in self._pub_by_oaid:
            return self._pub_by_oaid[openalex_id]

        params = {
            "filters[openAlexId][$eq]": openalex_id,
            "pagination[pageSize]": 1,
            "fields[0]": "documentId",
            "fields[1]": "id",
        }
        try:
            response = requests.get(f"{self.api_url}/publications", headers=self.headers, params=params)
            response.raise_for_status()
            data = response.json().get("data", [])
            if data:
                document_id = data[0].get("documentId") or data[0].get("id")
                self._pub_by_oaid[openalex_id] = document_id
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