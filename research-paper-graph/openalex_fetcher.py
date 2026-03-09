import requests
import time
import re
import logging

log = logging.getLogger(__name__)

BASE_URL = "https://api.openalex.org"

def normalize_text(text):
    """Strip newlines, collapse whitespace and trim."""
    if not text:
        return None
    text = re.sub(r'[\n\r\t]+', ' ', text)
    text = re.sub(r' +', ' ', text)
    text = text.replace('\\n', '')
    return text.strip()

# ── Author-based fetching ────────────────────────────────────────────────────

def find_author_id(author_name, institution=None):
    """Search for an author by name (and optional institution)."""
    params = {
        "search": author_name,
        "per-page": 5
    }
    if institution:
        params["filter"] = f"last_known_institution.display_name.search:{institution}"

    r = requests.get(f"{BASE_URL}/authors", params=params)
    r.raise_for_status()
    data = r.json()

    if data["results"]:
        author = data["results"][0]
        log.info(f"Found author: {author['display_name']} ({author['id']})")
        return author["id"]
    else:
        log.warning("No author found.")
        return None

def get_author_works(author_id):
    """Retrieve all works for a given author."""
    works = []
    cursor = "*"

    log.info(f"Fetching works for author {author_id}...")
    while True:
        params = {
            "filter": f"author.id:{author_id},is_oa:true",
            "per-page": 50,
            "cursor": cursor
        }
        r = requests.get(f"{BASE_URL}/works", params=params)
        r.raise_for_status()
        data = r.json()

        works.extend(data["results"])
        cursor = data.get("meta", {}).get("next_cursor")

        if not cursor:
            break

        time.sleep(0.2)

    log.info(f"Collected {len(works)} works.")
    return works

# ── Institution-based fetching ───────────────────────────────────────────────

def find_institution_id(institution_name):
    """Search for an institution and return its OpenAlex ID."""
    params = {"search": institution_name, "per-page": 5}
    r = requests.get(f"{BASE_URL}/institutions", params=params)
    r.raise_for_status()
    results = r.json().get("results", [])

    if results:
        inst = results[0]
        log.info(f"Found institution: {inst['display_name']} ({inst['id']})")
        return inst["id"]
    else:
        log.warning(f"No institution found for '{institution_name}'")
        return None

def get_institution_authors(institution_id, min_works=3):
    """
    Retrieve all authors affiliated with an institution.
    Only returns authors with at least `min_works` works.
    """
    authors = []
    cursor = "*"

    log.info(f"Fetching authors for institution {institution_id}...")
    while True:
        params = {
            "filter": f"last_known_institutions.id:{institution_id}",
            "per-page": 50,
            "cursor": cursor,
            "sort": "works_count:desc",
        }
        r = requests.get(f"{BASE_URL}/authors", params=params)
        r.raise_for_status()
        data = r.json()

        for author in data["results"]:
            if author.get("works_count", 0) >= min_works:
                authors.append({
                    "id": author["id"],
                    "name": author["display_name"],
                    "works_count": author.get("works_count", 0),
                })

        cursor = data.get("meta", {}).get("next_cursor")
        if not cursor:
            break
        time.sleep(0.2)

    log.info(f"Found {len(authors)} authors (with >= {min_works} works)")
    return authors

def get_institution_works(institution_id):
    """
    Retrieve all open-access works from an institution directly.
    Much faster than per-author fetching and naturally deduplicated.
    """
    works = []
    cursor = "*"

    log.info(f"Fetching all works for institution {institution_id}...")
    while True:
        params = {
            "filter": f"institutions.id:{institution_id},is_oa:true",
            "per-page": 200,
            "cursor": cursor,
        }
        r = requests.get(f"{BASE_URL}/works", params=params)
        r.raise_for_status()
        data = r.json()

        works.extend(data["results"])
        cursor = data.get("meta", {}).get("next_cursor")
        count = data.get("meta", {}).get("count", "?")

        if not cursor:
            break

        if len(works) % 1000 < 200:
            log.info(f"  ... {len(works)} / {count} works fetched")
        time.sleep(0.1)

    log.info(f"Collected {len(works)} works total.")
    return works

# ── Work processing ──────────────────────────────────────────────────────────

def process_work(work):
    """Extract fields, including Topics and Authors for the graph."""
    abstract_text = _inverted_to_text(work.get("abstract_inverted_index"))

    topics = []
    for t in work.get("topics", [])[:3]:
        topics.append(t["display_name"])

    authors = []
    for a in work.get("authorships", []):
        authors.append(a.get("author", {}).get("display_name"))

    return {
        "openAlexId": work.get("id"),
        "title": normalize_text(work.get("title")),
        "doi": work.get("doi"),
        "year": work.get("publication_year"),
        "cited_by": work.get("cited_by_count"),
        "abstract": normalize_text(abstract_text),
        "topics": topics,
        "authors": authors,
        "pdf_url": _extract_pdf_url(work),
    }

# ── Internal helpers ─────────────────────────────────────────────────────────

def _inverted_to_text(inverted):
    """Convert OpenAlex's inverted-index abstracts into normal text."""
    if not inverted:
        return None

    words = []
    for word, positions in inverted.items():
        for pos in positions:
            if len(words) <= pos:
                words.extend([None] * (pos - len(words) + 1))
            words[pos] = word

    return " ".join(w for w in words if w)

def _extract_pdf_url(work):
    """Find the best Open Access PDF link."""
    if work.get("open_access", {}).get("oa_url"):
        return work["open_access"]["oa_url"]
    return None
