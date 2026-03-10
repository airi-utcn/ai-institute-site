import glob
import json
import logging
import os
import sys

from . import openalex as oaf


def fetch_papers(args, prompt=input, logger=None):
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

        works = oaf.get_institution_works(inst_id)
        papers = [oaf.process_work(work) for work in works]
        return papers, name.replace(" ", "_")

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

        works = oaf.get_author_works(author_id)
        papers = [oaf.process_work(work) for work in works]
        return papers, name.replace(" ", "_")

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