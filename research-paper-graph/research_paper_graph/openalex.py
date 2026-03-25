import json
import logging
import os
import re
import time

import requests

log = logging.getLogger(__name__)

BASE_URL = "https://api.openalex.org"


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

    response = requests.get(f"{BASE_URL}/authors", params=params)
    response.raise_for_status()
    data = response.json()

    if data["results"]:
        author = data["results"][0]
        log.info(f"Found author: {author['display_name']} ({author['id']})")
        return author["id"]

    log.warning("No author found.")
    return None


def get_author_papers(author_id, *, cache_path=None, use_cache=False, refresh_cache=False):
    """Retrieve processed papers for a given author, optionally resuming from cache."""
    return _get_processed_works(
        f"author.id:{author_id},is_oa:true",
        description=f"author {author_id}",
        per_page=50,
        pause_seconds=0.2,
        cache_path=cache_path,
        use_cache=use_cache,
        refresh_cache=refresh_cache,
    )


def find_institution_id(institution_name):
    """Search for an institution and return its OpenAlex ID."""
    params = {"search": institution_name, "per-page": 5}
    response = requests.get(f"{BASE_URL}/institutions", params=params)
    response.raise_for_status()
    results = response.json().get("results", [])

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
        response = requests.get(f"{BASE_URL}/authors", params=params)
        response.raise_for_status()
        data = response.json()

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


def get_institution_papers(institution_id, *, cache_path=None, use_cache=False, refresh_cache=False):
    """Retrieve processed papers for an institution, optionally resuming from cache."""
    return _get_processed_works(
        f"institutions.id:{institution_id},is_oa:true",
        description=f"institution {institution_id}",
        per_page=200,
        pause_seconds=0.1,
        cache_path=cache_path,
        use_cache=use_cache,
        refresh_cache=refresh_cache,
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
    cache_path=None,
    use_cache=False,
    refresh_cache=False,
):
    papers = []
    cursor = "*"
    total_count = "?"

    if cache_path and refresh_cache and os.path.exists(cache_path):
        os.remove(cache_path)

    cached_state = _load_fetch_cache(cache_path) if cache_path and os.path.exists(cache_path) else None
    if cached_state and not refresh_cache:
        cached_papers = cached_state.get("papers", [])
        if cached_state.get("completed"):
            if use_cache:
                log.info(f"Using completed fetch cache for {description}: {cache_path}")
                return cached_papers
            log.info(f"Fetch cache exists for {description} but cache reuse is disabled; refetching.")
        elif use_cache:
            papers = cached_papers
            cursor = cached_state.get("next_cursor") or "*"
            total_count = cached_state.get("total_count", "?")
            log.info(f"Resuming fetch cache for {description}: {len(papers)} papers already cached")
        else:
            log.info(f"Incomplete fetch cache exists for {description} but cache reuse is disabled; refetching.")

    # Not explicit, but lazy fetching is working. Look above at the elif use_cache, we reuse the cursor from there and resume fetching where we left off

    log.info(f"Fetching works for {description}...")
    while True:
        params = {
            "filter": filter_expression,
            "per-page": per_page,
            "cursor": cursor,
        }
        response = requests.get(f"{BASE_URL}/works", params=params)
        response.raise_for_status()
        data = response.json()

        page_papers = [process_work(work) for work in data["results"]]
        papers.extend(page_papers)
        next_cursor = data.get("meta", {}).get("next_cursor")
        total_count = data.get("meta", {}).get("count", total_count)

        _write_fetch_cache(
            cache_path,
            {
                "version": 1,
                "description": description,
                "papers": papers,
                "next_cursor": next_cursor,
                "completed": not bool(next_cursor),
                "total_count": total_count,
            },
        )

        if not next_cursor:
            break

        cursor = next_cursor
        if len(papers) % 1000 < per_page:
            log.info(f"  ... {len(papers)} / {total_count} works fetched")
        time.sleep(pause_seconds)

    log.info(f"Collected {len(papers)} works total.")
    return papers


def _load_fetch_cache(cache_path):
    with open(cache_path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def _write_fetch_cache(cache_path, payload):
    if not cache_path:
        return
    cache_dir = os.path.dirname(cache_path)
    if cache_dir:
        os.makedirs(cache_dir, exist_ok=True)
    tmp_path = f"{cache_path}.tmp"
    with open(tmp_path, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2)
    os.replace(tmp_path, cache_path)