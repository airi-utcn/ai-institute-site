import glob
import json
import logging
import os
import re
import sys

from . import openalex as oaf
from .strapi import StrapiClient


def fetch_papers(args, prompt=input, logger=None, settings=None):
    """Fetch papers based on the selected mode. Returns (papers, label)."""
    log = logger or logging.getLogger("paper-sync")

    if args.mode == "institution":
        name = args.institution
        if not name:
            if args.interactive:
                name = prompt("Enter institution name: ").strip()
            else:
                log.error("--institution is required for mode=institution")
                sys.exit(1)

        inst_id = oaf.find_institution_id(name)
        if not inst_id:
            log.error(f"Institution '{name}' not found in OpenAlex.")
            sys.exit(1)

        label = name.replace(" ", "_")
        cache_path = _resolve_fetch_cache_path(args, f"institution_{label}")
        papers = oaf.get_institution_papers(
            inst_id,
            cache_path=cache_path,
            use_cache=args.use_fetch_cache,
            refresh_cache=args.refresh_fetch_cache,
        )
        return papers, label

    if args.mode == "author":
        name = args.author
        institution = args.author_institution
        if not name:
            if args.interactive:
                name = prompt("Enter author name: ").strip()
                institution = prompt("Institution filter (optional, Enter to skip): ").strip() or None
            else:
                log.error("--author is required for mode=author")
                sys.exit(1)

        author_id = oaf.find_author_id(name, institution)
        if not author_id:
            log.error(f"Author '{name}' not found.")
            sys.exit(1)

        label = name.replace(" ", "_")
        if institution:
            label = f"{label}_{institution.replace(' ', '_')}"
        cache_path = _resolve_fetch_cache_path(args, f"author_{label}")
        papers = oaf.get_author_papers(
            author_id,
            cache_path=cache_path,
            use_cache=args.use_fetch_cache,
            refresh_cache=args.refresh_fetch_cache,
        )
        return papers, label

    if args.mode == "strapi-people":
        if not settings:
            log.error("Runtime settings are required for mode=strapi-people")
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
            author_id = oaf.find_author_id(person_name, args.author_institution)
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

    if args.mode == "file":
        path = args.file
        if not path:
            if args.interactive:
                files = glob.glob("outputs/*.json")
                if not files:
                    log.error("No JSON files in outputs/")
                    sys.exit(1)

                print("Local files:")
                for idx, file_path in enumerate(files):
                    print(f"  [{idx}] {file_path}")

                choice = prompt("Choose file index or enter path: ").strip()
                path = files[int(choice)] if choice.isdigit() else choice
            else:
                log.error("--file is required for mode=file")
                sys.exit(1)

        with open(path, "r", encoding="utf-8") as handle:
            papers = json.load(handle)

        label = os.path.splitext(os.path.basename(path))[0]
        log.info(f"Loaded {len(papers)} papers from {path}")
        return papers, label

    log.error(f"Unsupported mode: {args.mode}")
    sys.exit(1)


def _resolve_fetch_cache_path(args, cache_key):
    if getattr(args, "fetch_cache_file", None):
        return args.fetch_cache_file
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