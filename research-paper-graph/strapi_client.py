import os
import requests
import logging
from io import BytesIO
from difflib import SequenceMatcher

log = logging.getLogger(__name__)


class StrapiClient:
    def __init__(self, base_url, token):
        self.base_url = base_url.rstrip('/')
        self.api_url = f"{self.base_url}/api"
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        self.upload_headers = {
            "Authorization": f"Bearer {token}"
        }

        # Caches populated by load_existing_*()
        self._pub_by_oaid = {}    # openAlexId → documentId
        self._pub_by_doi = {}     # doi → documentId
        self._pub_by_title = {}   # normalised title → documentId
        self._person_by_name = {} # normalised name → { documentId, fullName }

    # ── Bulk pre-fetch for dedup ─────────────────────────────────────────────

    def _fetch_all_pages(self, endpoint, params=None):
        """Paginate through all entries in a Strapi collection."""
        results = []
        page = 1
        base_params = params or {}
        while True:
            paged = {**base_params, "pagination[page]": page, "pagination[pageSize]": 100}
            r = requests.get(f"{self.api_url}/{endpoint}", headers=self.headers, params=paged)
            r.raise_for_status()
            data = r.json().get("data", [])
            results.extend(data)
            meta = r.json().get("meta", {}).get("pagination", {})
            if not meta.get("pageCount") or page >= meta["pageCount"]:
                break
            page += 1
        return results

    def load_existing_publications(self):
        """Pre-fetch all publications for dedup lookups."""
        log.info("Loading existing publications from Strapi...")
        pubs = self._fetch_all_pages("publications", {
            "fields[0]": "openAlexId",
            "fields[1]": "title",
            "fields[2]": "doi",
            "fields[3]": "documentId",
        })
        for pub in pubs:
            attr = pub.get("attributes", pub)
            doc_id = pub.get("documentId") or pub.get("id")
            if attr.get("openAlexId"):
                self._pub_by_oaid[attr["openAlexId"]] = doc_id
            if attr.get("doi"):
                self._pub_by_doi[attr["doi"]] = doc_id
            if attr.get("title"):
                self._pub_by_title[attr["title"].lower().strip()] = doc_id
        log.info(f"  Loaded {len(pubs)} publications ({len(self._pub_by_oaid)} with openAlexId)")

    def load_existing_people(self):
        """Pre-fetch all Person entries for author matching."""
        log.info("Loading existing people from Strapi...")
        people = self._fetch_all_pages("people", {
            "fields[0]": "fullName",
            "fields[1]": "slug",
            "fields[2]": "documentId",
        })
        for person in people:
            attr = person.get("attributes", person)
            doc_id = person.get("documentId") or person.get("id")
            name = attr.get("fullName", "")
            if name:
                self._person_by_name[name.lower().strip()] = {
                    "documentId": doc_id,
                    "fullName": name,
                }
        log.info(f"  Loaded {len(self._person_by_name)} people")

    # ── Dedup lookup ─────────────────────────────────────────────────────────

    def find_existing_publication(self, openalex_id=None, doi=None, title=None):
        """
        Find an already-existing publication by openAlexId, DOI, or fuzzy title.
        Returns (documentId, match_type) or (None, None).
        """
        if openalex_id and openalex_id in self._pub_by_oaid:
            return self._pub_by_oaid[openalex_id], "openAlexId"

        if doi and doi in self._pub_by_doi:
            return self._pub_by_doi[doi], "doi"

        if title:
            norm = title.lower().strip()
            if norm in self._pub_by_title:
                return self._pub_by_title[norm], "title_exact"
            # Fuzzy fallback
            for existing_title, doc_id in self._pub_by_title.items():
                if SequenceMatcher(None, norm, existing_title).ratio() > 0.95:
                    return doc_id, "title_fuzzy"

        return None, None

    # ── Author matching ──────────────────────────────────────────────────────

    def match_authors(self, author_names):
        """
        Given a list of author name strings (from OpenAlex), return a list of
        Strapi Person documentIds for any that match existing people.
        """
        matched = []
        for name in (author_names or []):
            norm = name.lower().strip()
            if norm in self._person_by_name:
                matched.append(self._person_by_name[norm]["documentId"])
                continue
            # Try fuzzy
            for existing, info in self._person_by_name.items():
                if SequenceMatcher(None, norm, existing).ratio() > 0.90:
                    matched.append(info["documentId"])
                    break
        return matched

    # ── Upload ───────────────────────────────────────────────────────────────

    def upload_pdf(self, pdf_url, filename):
        """Downloads PDF from source and uploads to Strapi Media Library."""
        if not pdf_url:
            return None

        log.info(f"  Downloading PDF: {pdf_url}")
        try:
            pdf_resp = requests.get(pdf_url, timeout=15)
            pdf_resp.raise_for_status()
            files = {
                'files': (filename, BytesIO(pdf_resp.content), 'application/pdf')
            }
            upload_resp = requests.post(
                f"{self.api_url}/upload",
                headers=self.upload_headers,
                files=files,
            )
            upload_resp.raise_for_status()
            return upload_resp.json()[0]['id']
        except Exception as e:
            log.warning(f"  PDF download/upload failed: {e}")
            return None

    def create_publication(self, paper_data, author_ids=None):
        """Creates a publication entry in Strapi from processed paper data."""
        payload = {
            "title": paper_data["title"],
            "openAlexId": paper_data.get("openAlexId"),
            "doi": paper_data.get("doi"),
            "year": paper_data.get("year"),
            "cited_by": paper_data.get("cited_by", 0),
            "abstract": paper_data.get("abstract"),
            "topics": paper_data.get("topics"),
        }

        if paper_data.get("attachment"):
            payload["pdfFile"] = paper_data["attachment"]

        if author_ids:
            payload["authors"] = author_ids

        url = f"{self.api_url}/publications"
        try:
            r = requests.post(url, headers=self.headers, json={"data": payload})
            r.raise_for_status()
            created = r.json().get("data", {})
            doc_id = created.get("documentId") or created.get("id")
            # Update local cache
            if doc_id:
                if paper_data.get("openAlexId"):
                    self._pub_by_oaid[paper_data["openAlexId"]] = doc_id
                if paper_data.get("doi"):
                    self._pub_by_doi[paper_data["doi"]] = doc_id
                if paper_data.get("title"):
                    self._pub_by_title[paper_data["title"].lower().strip()] = doc_id
            return doc_id
        except requests.exceptions.RequestException as e:
            log.error(f"Failed to create publication '{paper_data.get('title', '?')}': {e}")
            return None

    def update_publication(self, doc_id, update_data):
        """Partial update of an existing publication."""
        url = f"{self.api_url}/publications/{doc_id}"
        try:
            r = requests.put(url, headers=self.headers, json={"data": update_data})
            r.raise_for_status()
            return True
        except requests.exceptions.RequestException as e:
            log.error(f"Failed to update publication {doc_id}: {e}")
            return False

    def get_publication_id_by_openalex(self, openalex_id):
        """Finds existing Strapi documentId for a given OpenAlex ID."""
        # Try cache first
        if openalex_id in self._pub_by_oaid:
            return self._pub_by_oaid[openalex_id]
        # Fall back to API
        params = {
            "filters[openAlexId][$eq]": openalex_id,
            "pagination[pageSize]": 1,
            "fields[0]": "documentId",
            "fields[1]": "id",
        }
        try:
            r = requests.get(
                f"{self.api_url}/publications", headers=self.headers, params=params
            )
            r.raise_for_status()
            data = r.json().get("data", [])
            if data:
                doc_id = data[0].get("documentId") or data[0].get("id")
                self._pub_by_oaid[openalex_id] = doc_id
                return doc_id
            return None
        except Exception:
            return None

    def create_graph_link(self, source_id, target_id, score, is_cross_cluster=False):
        """Creates a link relationship between two publications."""
        url = f"{self.api_url}/graph-links"
        payload = {
            "data": {
                "source": source_id,
                "target": target_id,
                "score": score,
                "isCrossCluster": is_cross_cluster,
            }
        }
        try:
            r = requests.post(url, headers=self.headers, json=payload)
            r.raise_for_status()
            return True
        except requests.exceptions.RequestException as e:
            log.error(f"Failed to link publications: {e}")
            return False
