import logging
import re
import time
from urllib.parse import urlparse

import requests

log = logging.getLogger(__name__)

BASE_URL = "https://api.openalex.org"

_API_KEY = ""
_MAILTO = ""
_TIMEOUT = 30.0
_RETRIES = 3
_RETRY_STATUS = {429, 500, 502, 503, 504}


def configure(api_key, mailto="", timeout=30.0, retries=3):
    """Configure OpenAlex authentication and HTTP behaviour."""
    global _API_KEY, _MAILTO, _TIMEOUT, _RETRIES
    _API_KEY = (api_key or "").strip()
    _MAILTO = (mailto or "").strip()
    _TIMEOUT = float(timeout or 30.0)
    _RETRIES = max(1, int(retries or 1))


def _headers():
    headers = {
        "User-Agent": "airi-paper-sync/1.0"
        + (f" (mailto:{_MAILTO})" if _MAILTO else "")
    }
    if _API_KEY:
        headers["Authorization"] = f"Bearer {_API_KEY}"
    return headers


def _get(endpoint, params):
    """GET an OpenAlex endpoint with a timeout and bounded retries."""
    params = dict(params or {})
    if _MAILTO:
        params.setdefault("mailto", _MAILTO)

    last_error = None
    for attempt in range(_RETRIES):
        try:
            response = requests.get(
                f"{BASE_URL}{endpoint}",
                params=params,
                headers=_headers(),
                timeout=_TIMEOUT,
            )
            if response.status_code in _RETRY_STATUS and attempt < _RETRIES - 1:
                retry_after = response.headers.get("Retry-After")
                delay = float(retry_after) if retry_after and retry_after.isdigit() else 0.5 * (2**attempt)
                log.warning(
                    "OpenAlex %s returned %s; retrying in %.1fs (%s/%s)",
                    endpoint,
                    response.status_code,
                    delay,
                    attempt + 1,
                    _RETRIES,
                )
                time.sleep(delay)
                continue
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as exc:
            last_error = exc
            if attempt >= _RETRIES - 1:
                break
            delay = 0.5 * (2**attempt)
            log.warning(
                "OpenAlex %s request failed (%s); retrying in %.1fs (%s/%s)",
                endpoint,
                exc,
                delay,
                attempt + 1,
                _RETRIES,
            )
            time.sleep(delay)

    raise RuntimeError(f"OpenAlex request failed after {_RETRIES} attempts: {last_error}")


def normalize_text(text):
    """Strip newlines, collapse whitespace and trim."""
    if not text:
        return None
    text = re.sub(r"[\n\r\t]+", " ", text)
    text = re.sub(r" +", " ", text)
    text = text.replace("\\n", "")
    return text.strip()


def _normalized_name(value):
    return re.sub(r"[^a-z0-9]+", " ", (value or "").lower()).strip()


def find_author_candidates(author_name, institution_id=None):
    """Return OpenAlex author candidates for a display name.

    When an institution id is supplied the search is restricted to authors whose
    last known institutions include it.  The old ``display_name.search`` filter
    silently returned no results and was never actually passed by callers.
    """
    params = {
        "search": author_name,
        "per-page": 10,
    }
    if institution_id:
        params["filter"] = f"last_known_institutions.id:{institution_id}"

    data = _get("/authors", params)
    return data.get("results") or []


def find_author_id(author_name, institution_id=None):
    """Search for an author by name and optional institution id."""
    candidates = find_author_candidates(author_name, institution_id=institution_id)
    if not candidates:
        log.warning("No author found for '%s'%s", author_name, f" at {institution_id}" if institution_id else "")
        return None

    target = _normalized_name(author_name)
    exact = [
        candidate
        for candidate in candidates
        if _normalized_name(candidate.get("display_name")) == target
    ]
    chosen = (exact or candidates)[0]
    log.info(
        "Found author: %s (%s, works=%s, institutions=%s)",
        chosen.get("display_name"),
        chosen.get("id"),
        chosen.get("works_count"),
        [item.get("display_name") for item in (chosen.get("last_known_institutions") or [])][:3],
    )
    if len(candidates) > 1:
        log.info(
            "  other candidates: %s",
            [
                f"{item.get('display_name')} ({item.get('id')})"
                for item in candidates[1:4]
            ],
        )
    return chosen.get("id")


def get_author_papers(author_id, oa_only=False):
    """Retrieve works for an author, keeping metadata even when no OA PDF exists."""
    filters = [f"author.id:{author_id}", "is_paratext:false"]
    if oa_only:
        filters.append("is_oa:true")
    return _get_processed_works(
        ",".join(filters),
        description=f"author {author_id}",
        per_page=200,
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


def get_institution_papers(institution_id, oa_only=False):
    """Retrieve works for an institution."""
    filters = [f"institutions.id:{institution_id}", "is_paratext:false"]
    if oa_only:
        filters.append("is_oa:true")
    return _get_processed_works(
        ",".join(filters),
        description=f"institution {institution_id}",
        per_page=200,
        pause_seconds=0.1,
    )


def _type_name(value):
    if not value:
        return None
    return str(value).rstrip("/").split("/")[-1]


def process_work(work):
    """Extract the fields used by the import and graph pipeline."""
    abstract_text = _inverted_to_text(work.get("abstract_inverted_index"))

    topics = []
    for topic in work.get("topics", [])[:5]:
        if topic.get("display_name"):
            topics.append(topic["display_name"])

    authors = []
    author_ids = []
    for authorship in work.get("authorships", []):
        author = authorship.get("author", {}) or {}
        if author.get("display_name"):
            authors.append(author["display_name"])
        if author.get("id"):
            author_ids.append(author["id"])

    return {
        "openAlexId": work.get("id"),
        "title": normalize_text(work.get("title")),
        "doi": work.get("doi"),
        "year": work.get("publication_year"),
        "cited_by": work.get("cited_by_count"),
        "abstract": normalize_text(abstract_text),
        "topics": topics,
        "authors": authors,
        "authorIds": author_ids,
        "kind": _type_name(work.get("type")),
        "isParatext": bool(work.get("is_paratext")),
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


def _pdf_candidate(location):
    if not location:
        return None
    for key in ("pdf_url", "landing_page_url"):
        value = location.get(key)
        if value:
            return value
    return None


def _extract_pdf_url(work):
    """Pick the best known PDF/landing URL from an OpenAlex work.

    ``open_access.oa_url`` is often a publisher landing page (or a bot-blocked
    URL), so prefer explicit PDF locations first, then the best OA location.
    """
    candidates = []
    for key in ("best_oa_location", "primary_location"):
        candidates.append(_pdf_candidate(work.get(key)))
    for location in work.get("locations") or []:
        candidates.append(_pdf_candidate(location))
    candidates.append((work.get("open_access") or {}).get("oa_url"))

    for candidate in candidates:
        if not candidate:
            continue
        parsed = urlparse(candidate)
        if parsed.scheme in {"http", "https"}:
            return candidate
    return None


def _get_processed_works(
    filter_expression,
    *,
    description,
    per_page,
    pause_seconds,
):
    """Fetch works from OpenAlex API with cursor paging support."""
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
