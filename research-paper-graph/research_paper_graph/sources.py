import logging
import sys

from . import openalex as oaf
from .strapi import StrapiClient
from .utils import normalize_doi, normalize_openalex_id, normalize_title, slugify


def fetch_papers(institution=None, person=None, settings=None, logger=None):
    """Fetch papers from the configured source and return (papers, label)."""
    log = logger or logging.getLogger("paper-sync")

    # Dispatch based on which source parameter is provided
    institution_name = (institution or "").strip()
    person_name = (person or "").strip()

    # Institution mode: fetch papers for a specific institution
    if institution_name:
        inst_id = oaf.find_institution_id(institution_name)
        if not inst_id:
            log.error(f"Institution '{institution_name}' not found in OpenAlex")
            sys.exit(1)

        label = institution_name.replace(" ", "_")
        papers = oaf.get_institution_papers(inst_id)
        papers = _dedupe_papers(papers)
        return papers, label

    # Person mode: fetch papers for a specific person by name
    if person_name:
        author_id = oaf.find_author_id(person_name)
        if not author_id:
            log.error(f"Author '{person_name}' not found in OpenAlex")
            sys.exit(1)

        label = slugify(person_name)
        papers = oaf.get_author_papers(author_id)
        papers = _dedupe_papers(papers)
        return papers, label

    # Default: Strapi-people mode - fetch papers for all people in Strapi
    if not settings:
        log.error("Runtime settings are required for Strapi people sync")
        sys.exit(1)

    strapi = StrapiClient(settings.strapi_api_url, settings.strapi_token)
    people = strapi.load_import_people()
    if not people:
        log.error("No people found in Strapi for author-based import")
        sys.exit(1)

    papers_by_key = {}
    total_people = len(people)

    for index, person in enumerate(people, start=1):
        person_name = person["fullName"]
        person_id = person["documentId"]
        person_label = slugify(person_name)
        log.info(f"Fetching papers for Strapi person {index}/{total_people}: {person_name}")
        author_id = oaf.find_author_id(person_name)
        if not author_id:
            log.warning(f"Skipping Strapi person with no OpenAlex match: {person_name}")
            continue

        person_papers = oaf.get_author_papers(author_id)

        for paper in person_papers:
            _merge_seed_paper(papers_by_key, paper, person)

    papers = list(papers_by_key.values())
    log.info(f"Collected {len(papers)} unique papers across {total_people} Strapi people")
    return papers, "strapi_people"


def _merge_seed_paper(papers_by_key, paper, person):
    paper_key = paper.get("openAlexId") or paper.get("doi") or (paper.get("title") or "").lower().strip()
    if not paper_key:
        return

    existing = papers_by_key.get(paper_key)
    if not existing:
        merged = dict(paper)
        merged["seedPersonIds"] = [person["documentId"]]
        merged["seedPersonNames"] = [person["fullName"]]
        papers_by_key[paper_key] = merged
        return

    existing["seedPersonIds"] = _merge_unique(existing.get("seedPersonIds", []), [person["documentId"]])
    existing["seedPersonNames"] = _merge_unique(existing.get("seedPersonNames", []), [person["fullName"]])
    existing["authors"] = _merge_unique(existing.get("authors", []), paper.get("authors", []))
    existing["topics"] = _merge_unique(existing.get("topics", []), paper.get("topics", []))

    if not existing.get("abstract") and paper.get("abstract"):
        existing["abstract"] = paper["abstract"]
    if not existing.get("doi") and paper.get("doi"):
        existing["doi"] = paper["doi"]
    if not existing.get("pdf_url") and paper.get("pdf_url"):
        existing["pdf_url"] = paper["pdf_url"]
    if not existing.get("year") and paper.get("year"):
        existing["year"] = paper["year"]
    existing["cited_by"] = max(existing.get("cited_by") or 0, paper.get("cited_by") or 0)


def _merge_unique(existing_values, new_values):
    """Merges two lists of values, ensuring uniqueness with list comprehension. Preserves order with seen set."""
    merged = []
    seen = set()
    for value in [*(existing_values or []), *(new_values or [])]: # '*' is the unpacking operator. Without it, you would have nested lists.  
        if not value:
            continue
        if value in seen:
            continue
        seen.add(value)
        merged.append(value)
    return merged

def _paper_key(paper):
    return (
        normalize_openalex_id(paper.get("openAlexId"))
        or normalize_doi(paper.get("doi"))
        or normalize_title(paper.get("title"))
    )


def _dedupe_papers(papers):
    """Merge duplicate paper records deterministically for idempotent upserts."""
    merged_by_key = {}
    for paper in papers or []:
        key = _paper_key(paper)
        if not key:
            continue

        existing = merged_by_key.get(key)
        if not existing:
            merged_by_key[key] = dict(paper)
            continue

        existing["authors"] = _merge_unique(existing.get("authors", []), paper.get("authors", []))
        existing["topics"] = _merge_unique(existing.get("topics", []), paper.get("topics", []))

        if not existing.get("abstract") and paper.get("abstract"):
            existing["abstract"] = paper["abstract"]
        if not existing.get("doi") and paper.get("doi"):
            existing["doi"] = paper["doi"]
        if not existing.get("openAlexId") and paper.get("openAlexId"):
            existing["openAlexId"] = paper["openAlexId"]
        if not existing.get("pdf_url") and paper.get("pdf_url"):
            existing["pdf_url"] = paper["pdf_url"]
        if not existing.get("year") and paper.get("year"):
            existing["year"] = paper["year"]
        existing["cited_by"] = max(existing.get("cited_by") or 0, paper.get("cited_by") or 0)

    return list(merged_by_key.values())