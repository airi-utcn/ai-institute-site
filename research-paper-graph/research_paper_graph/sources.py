import logging
import os
import re
import sys

from . import openalex as oaf
from .strapi import StrapiClient


def fetch_papers(args, logger=None, settings=None):
    """Fetch papers from the configured source and return (papers, label)."""
    log = logger or logging.getLogger("paper-sync")

    if getattr(args, "mode", None) == "institution":
        institution_name = (getattr(args, "institution", None) or "").strip()
        if not institution_name:
            log.error("--institution is required for mode=institution")
            sys.exit(1)

        inst_id = oaf.find_institution_id(institution_name)
        if not inst_id:
            log.error(f"Institution '{institution_name}' not found in OpenAlex")
            sys.exit(1)

        label = institution_name.replace(" ", "_")
        cache_path = _resolve_fetch_cache_path(args, f"institution_{label}")
        papers = oaf.get_institution_papers(
            inst_id,
            cache_path=cache_path,
            use_cache=args.use_fetch_cache,
            refresh_cache=args.refresh_fetch_cache,
        )
        papers = _dedupe_papers(papers)
        return papers, label

    if getattr(args, "mode", None) == "person":
        person_name = (getattr(args, "person", None) or "").strip()
        if not person_name:
            log.error("--person is required for person mode")
            sys.exit(1)

        author_id = oaf.find_author_id(person_name)
        if not author_id:
            log.error(f"Author '{person_name}' not found in OpenAlex")
            sys.exit(1)

        label = _slugify(person_name)
        cache_path = _resolve_fetch_cache_path(args, f"person_{label}")
        papers = oaf.get_author_papers(
            author_id,
            cache_path=cache_path,
            use_cache=args.use_fetch_cache,
            refresh_cache=args.refresh_fetch_cache,
        )
        papers = _dedupe_papers(papers)
        return papers, label

    if getattr(args, "mode", None) != "strapi-people":
        log.error("Unsupported --mode. Allowed values: strapi-people, institution, person")
        sys.exit(1)

    if not settings:
        log.error("Runtime settings are required for Strapi people sync")
        sys.exit(1)

    # strapi-people mode is strict: no source selector parameters allowed.
    if (getattr(args, "institution", None) or "").strip():
        log.error("--institution is only valid when --mode institution")
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
        person_label = _slugify(person_name)
        cache_path = _resolve_fetch_cache_path(args, f"person_{person_label}_{person_id}")

        log.info(f"Fetching papers for Strapi person {index}/{total_people}: {person_name}")
        author_id = oaf.find_author_id(person_name)
        if not author_id:
            log.warning(f"Skipping Strapi person with no OpenAlex match: {person_name}")
            continue

        person_papers = oaf.get_author_papers(
            author_id,
            cache_path=cache_path,
            use_cache=args.use_fetch_cache,
            refresh_cache=args.refresh_fetch_cache,
        )

        for paper in person_papers:
            _merge_seed_paper(papers_by_key, paper, person)

    papers = list(papers_by_key.values())
    log.info(f"Collected {len(papers)} unique papers across {total_people} Strapi people")
    return papers, "strapi_people"


def _resolve_fetch_cache_path(args, cache_key):
    override_path = getattr(args, "fetch_cache_file", None)
    if override_path:
        if getattr(args, "mode", None) == "strapi-people":
            base_dir = os.path.dirname(override_path)
            filename = os.path.basename(override_path)
            stem, extension = os.path.splitext(filename)
            extension = extension or ".json"
            derived_name = f"{stem}_{cache_key}{extension}"
            return os.path.join(base_dir, derived_name) if base_dir else derived_name
        return override_path
    return os.path.join("outputs", "fetch-cache", f"{cache_key}.json")


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
    merged = []
    seen = set()
    for value in [*(existing_values or []), *(new_values or [])]:
        if not value:
            continue
        if value in seen:
            continue
        seen.add(value)
        merged.append(value)
    return merged


def _slugify(value):
    normalized = re.sub(r"[^a-zA-Z0-9]+", "_", value.strip())
    return normalized.strip("_") or "person"


def _normalize_openalex_id(value):
    raw = str(value or "").strip()
    return raw.rstrip("/") if raw else ""


def _normalize_doi(value):
    raw = str(value or "").strip().lower()
    if not raw:
        return ""
    return re.sub(r"^https?://(dx\.)?doi\.org/", "", raw)


def _normalize_title(value):
    raw = str(value or "").strip().lower()
    return re.sub(r"\s+", " ", raw)


def _paper_key(paper):
    return (
        _normalize_openalex_id(paper.get("openAlexId"))
        or _normalize_doi(paper.get("doi"))
        or _normalize_title(paper.get("title"))
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