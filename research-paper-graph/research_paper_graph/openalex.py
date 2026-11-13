import logging
import re
import time

import requests

log = logging.getLogger(__name__)

BASE_URL = "https://api.openalex.org"

_API_KEY = ""


def configure(api_key):
    """Set the optional OpenAlex API key used for subsequent requests."""
    global _API_KEY
    _API_KEY = (api_key or "").strip()


def _get(endpoint, params):
    """GET an OpenAlex endpoint, authenticating when an API key is configured."""
    headers = {}
    if _API_KEY:
        headers["Authorization"] = f"Bearer {_API_KEY}"

    response = requests.get(f"{BASE_URL}{endpoint}", params=params, headers=headers)
    response.raise_for_status()
    return response.json()


def normalize_text(text):
    """Strip newlines, collapse whitespace and trim."""
    if not text:
        return None
    text = re.sub(r"[\n\r\t]+", " ", text)
    text = re.sub(r" +", " ", text)
    text = text.replace("\\n", "")
    return text.strip()


def find_author_id(author_name, institution=None):
    """Search for an author by name and optional institution."""
    params = {
        "search": author_name,
        "per-page": 5,
    }
    if institution:
        params["filter"] = f"last_known_institution.display_name.search:{institution}"

    data = _get("/authors", params)

    if data["results"]:
        author = data["results"][0]
        log.info(f"Found author: {author['display_name']} ({author['id']})")
        return author["id"]

    log.warning("No author found.")
    return None


def get_author_papers(author_id):
    """Retrieve processed papers for a given author."""
    return _get_processed_works(
        f"author.id:{author_id},is_oa:true",
        description=f"author {author_id}",
        per_page=50,
        pause_seconds=0.2,
    )


def find_institution_id(institution_name):
    """Search for an institution and return its OpenAlex ID."""
    params = {"search": institution_name, "per-page": 5}
    results = _get("/institutions", params).get("results", [])

    if results:
        institution = results[0]
        log.info(f"Found institution: {institution['display_name']} ({institution['id']})")
        return institution["id"]

    log.warning(f"No institution found for '{institution_name}'")
    return None


def get_institution_authors(institution_id, min_works=3):
    """Retrieve all authors affiliated with an institution."""
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
        data = _get("/authors", params)

        for author in data["results"]:
            if author.get("works_count", 0) >= min_works:
                authors.append(
                    {
                        "id": author["id"],
                        "name": author["display_name"],
                        "works_count": author.get("works_count", 0),
                    }
                )

        cursor = data.get("meta", {}).get("next_cursor")
        if not cursor:
            break

        time.sleep(0.2)

    log.info(f"Found {len(authors)} authors (with >= {min_works} works)")
    return authors


def get_institution_papers(institution_id):
    """Retrieve processed papers for an institution."""
    return _get_processed_works(
        f"institutions.id:{institution_id},is_oa:true",
        description=f"institution {institution_id}",
        per_page=200,
        pause_seconds=0.1,
    )


def process_work(work):
    """Extract the fields used by the import and graph pipeline."""
    abstract_text = _inverted_to_text(work.get("abstract_inverted_index"))

    topics = []
    for topic in work.get("topics", [])[:3]:
        topics.append(topic["display_name"])

    authors = []
    for authorship in work.get("authorships", []):
        authors.append(authorship.get("author", {}).get("display_name"))

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


def _inverted_to_text(inverted):
    if not inverted:
        return None

    words = []
    for word, positions in inverted.items():
        for position in positions:
            if len(words) <= position:
                words.extend([None] * (position - len(words) + 1))
            words[position] = word

    return " ".join(word for word in words if word)


def _extract_pdf_url(work):
    if work.get("open_access", {}).get("oa_url"):
        return work["open_access"]["oa_url"]
    return None


def _get_processed_works(
    filter_expression,
    *,
    description,
    per_page,
    pause_seconds,
):
    """Fetch works from OpenAlex API with paging support."""
    papers = []
    cursor = "*"
    total_count = "?"

    log.info(f"Fetching works for {description}...")
    while True:
        params = {
            "filter": filter_expression,
            "per-page": per_page,
            "cursor": cursor,
        }
        data = _get("/works", params)

        page_papers = [process_work(work) for work in data["results"]]
        papers.extend(page_papers)
        next_cursor = data.get("meta", {}).get("next_cursor")
        total_count = data.get("meta", {}).get("count", total_count)

        if not next_cursor:
            break

        cursor = next_cursor
        if len(papers) % 1000 < per_page:
            log.info(f"  ... {len(papers)} / {total_count} works fetched")
        time.sleep(pause_seconds)

    log.info(f"Collected {len(papers)} works total.")
    return papers