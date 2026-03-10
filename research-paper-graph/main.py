#!/usr/bin/env python3
"""
Research Paper Graph — sync service.

Modes:
  institution  – Fetch all OA works for an institution
  author       – Fetch all OA works for a single author
  file         – Load previously‑saved JSON from outputs/

Run `python main.py --help` for usage.
"""

import os
import sys
import json
import glob
import argparse
import logging
from dotenv import load_dotenv

import strapi_client as sc
import openalex_fetcher as oaf
import graph_generator as gg

# ── Environment ──────────────────────────────────────────────────────────────

parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_file = os.path.join(parent_dir, ".env")
if os.path.exists(env_file):
    load_dotenv(env_file)

STRAPI_API_URL = os.getenv("STRAPI_URL", "http://localhost:1337")
STRAPI_TOKEN   = os.getenv("STRAPI_API_TOKEN", "")

GRAPH_SIMILARITY_THRESHOLD = float(os.getenv("GRAPH_SIMILARITY_THRESHOLD", "0.5"))
GRAPH_DUPLICATE_THRESHOLD  = float(os.getenv("GRAPH_DUPLICATE_THRESHOLD", "0.92"))
GRAPH_AI_MODEL             = os.getenv("GRAPH_AI_MODEL", "all-MiniLM-L6-v2")
GRAPH_TOP_K                = int(os.getenv("GRAPH_TOP_K", "20"))

log = logging.getLogger("paper-sync")

# ── CLI ──────────────────────────────────────────────────────────────────────

def build_parser():
    p = argparse.ArgumentParser(
        prog="paper-sync",
        description="Fetch academic papers, build similarity graph, upload to Strapi.",
    )
    p.add_argument(
        "--mode", choices=["institution", "author", "file"], default="institution",
        help="Source of papers (default: institution)",
    )
    p.add_argument("--institution", type=str, help="Institution name for mode=institution")
    p.add_argument("--author", type=str, help="Author name for mode=author")
    p.add_argument("--author-institution", type=str, help="Institution filter for author search")
    p.add_argument("--file", type=str, help="JSON file path for mode=file")

    p.add_argument("--skip-graph", action="store_true", help="Skip link generation")
    p.add_argument("--skip-upload", action="store_true", help="Skip Strapi upload")
    p.add_argument("--skip-communities", action="store_true", help="Skip community detection")
    p.add_argument("--update-existing", action="store_true", help="Update publications that already exist in Strapi")
    p.add_argument("--dry-run", action="store_true", help="Report what would happen without writing")
    p.add_argument("--upload-pdfs", action="store_true", help="Download and upload PDFs to Strapi")

    p.add_argument("--limit", type=int, default=100,
        help="Maximum number of papers to process (default: 100; 0 = unlimited)")

    p.add_argument("--similarity-threshold", type=float, default=None)
    p.add_argument("--duplicate-threshold", type=float, default=None)
    p.add_argument("--model", type=str, default=None)
    p.add_argument("--top-k", type=int, default=None)
    p.add_argument("--community-resolution", type=float, default=1.0, help="Louvain resolution (higher = more communities)")

    p.add_argument("--verbose", "-v", action="store_true")

    # Interactive mode (backwards compat)
    p.add_argument("--interactive", "-i", action="store_true", help="Run in interactive prompt mode (legacy)")

    return p

# ── Fetch logic ──────────────────────────────────────────────────────────────

def fetch_papers(args):
    """Fetch papers based on the selected mode. Returns (papers, label)."""
    if args.mode == "institution":
        name = args.institution
        if not name:
            if args.interactive:
                name = input("Enter institution name: ").strip()
            else:
                log.error("--institution is required for mode=institution")
                sys.exit(1)

        inst_id = oaf.find_institution_id(name)
        if not inst_id:
            log.error(f"Institution '{name}' not found in OpenAlex.")
            sys.exit(1)

        works = oaf.get_institution_works(inst_id)
        papers = [oaf.process_work(w) for w in works]
        return papers, name.replace(" ", "_")

    elif args.mode == "author":
        name = args.author
        inst = args.author_institution
        if not name:
            if args.interactive:
                name = input("Enter author name: ").strip()
                inst = input("Institution filter (optional, Enter to skip): ").strip() or None
            else:
                log.error("--author is required for mode=author")
                sys.exit(1)

        author_id = oaf.find_author_id(name, inst)
        if not author_id:
            log.error(f"Author '{name}' not found.")
            sys.exit(1)

        works = oaf.get_author_works(author_id)
        papers = [oaf.process_work(w) for w in works]
        return papers, name.replace(" ", "_")

    elif args.mode == "file":
        path = args.file
        if not path:
            if args.interactive:
                files = glob.glob("outputs/*.json")
                if not files:
                    log.error("No JSON files in outputs/")
                    sys.exit(1)
                print("Local files:")
                for idx, f in enumerate(files):
                    print(f"  [{idx}] {f}")
                choice = input("Choose file index or enter path: ").strip()
                path = files[int(choice)] if choice.isdigit() else choice
            else:
                log.error("--file is required for mode=file")
                sys.exit(1)

        with open(path, 'r', encoding='utf-8') as fh:
            papers = json.load(fh)
        label = os.path.splitext(os.path.basename(path))[0]
        log.info(f"Loaded {len(papers)} papers from {path}")
        return papers, label

# ── Main pipeline ────────────────────────────────────────────────────────────

def run(args):
    sim_thresh = args.similarity_threshold or GRAPH_SIMILARITY_THRESHOLD
    dup_thresh = args.duplicate_threshold or GRAPH_DUPLICATE_THRESHOLD
    model_name = args.model or GRAPH_AI_MODEL
    top_k      = args.top_k or GRAPH_TOP_K

    # ── 1. Fetch papers ──────────────────────────────────────────────────
    papers, label = fetch_papers(args)
    log.info(f"Fetched {len(papers)} papers ({label})")

    if args.limit and args.limit > 0 and len(papers) > args.limit:
        log.info(f"Limiting to {args.limit} papers (--limit {args.limit})")
        papers = papers[:args.limit]

    # Save local copy
    os.makedirs("outputs", exist_ok=True)
    out_path = f"outputs/papers_{label}.json"
    with open(out_path, "w") as f:
        json.dump(papers, f, indent=2)
    log.info(f"Saved to {out_path}")

    # ── 2. Generate links ────────────────────────────────────────────────
    all_links = []
    duplicate_ids = set()
    communities = {}
    community_labels = {}
    filtered_papers = []
    embeddings = None

    if not args.skip_graph:
        log.info(f"Generating links (threshold={sim_thresh}, dup={dup_thresh}, top_k={top_k})...")
        all_links, duplicate_ids, filtered_papers, embeddings = gg.generate_links(
            papers,
            similarity_threshold=sim_thresh,
            duplicate_threshold=dup_thresh,
            model_name=model_name,
            top_k=top_k,
        )

        # Save embeddings index for incremental updates
        index_path = f"outputs/index_{label}.json"
        if len(filtered_papers) > 0:
            gg.save_index(embeddings, filtered_papers, index_path)

        # ── 2b. Community detection ──────────────────────────────────────
        if not args.skip_communities and len(filtered_papers) > 2:
            clean_links = [l for l in all_links if not l['is_duplicate']]
            communities, community_labels = gg.detect_communities(
                filtered_papers, embeddings, clean_links,
                resolution=args.community_resolution,
            )
            # Save community data
            comm_path = f"outputs/communities_{label}.json"
            with open(comm_path, "w") as f:
                json.dump({
                    "assignments": communities,
                    "labels": community_labels,
                }, f, indent=2)
            log.info(f"Saved community data to {comm_path}")

    # Split into clean sets
    papers_to_upload = [p for p in papers if p['openAlexId'] not in duplicate_ids]
    links_to_upload  = [l for l in all_links if not l['is_duplicate']]
    skipped_papers   = len(papers) - len(papers_to_upload)

    log.info(f"Papers: {len(papers_to_upload)} to process, {skipped_papers} duplicates skipped")
    log.info(f"Links: {len(links_to_upload)} to upload")

    if args.dry_run:
        log.info("[DRY RUN] Would upload above papers and links. Exiting.")
        return

    if args.skip_upload:
        log.info("Skipping Strapi upload (--skip-upload).")
        return

    # ── 3. Upload to Strapi ──────────────────────────────────────────────
    strapi = sc.StrapiClient(STRAPI_API_URL, STRAPI_TOKEN)

    # Pre-load existing data for dedup
    strapi.load_existing_publications()
    strapi.load_existing_people()

    pub_map = {}  # openAlexId → Strapi documentId
    stats = {"created": 0, "updated": 0, "skipped": 0, "failed": 0}

    log.info(f"Uploading {len(papers_to_upload)} publications...")
    for paper in papers_to_upload:
        oa_id = paper.get("openAlexId")
        existing_id, match_type = strapi.find_existing_publication(
            openalex_id=oa_id,
            doi=paper.get("doi"),
            title=paper.get("title"),
        )

        if existing_id:
            pub_map[oa_id] = existing_id
            if args.update_existing:
                strapi.update_publication(existing_id, {
                    "openAlexId": oa_id,
                    "doi": paper.get("doi"),
                    "cited_by": paper.get("cited_by"),
                    "abstract": paper.get("abstract"),
                    "topics": paper.get("topics"),
                })
                stats["updated"] += 1
                log.debug(f"  Updated ({match_type}): {paper['title'][:60]}")
            else:
                stats["skipped"] += 1
                log.debug(f"  Exists ({match_type}): {paper['title'][:60]}")
            continue

        # Match authors to Person entries
        author_ids = strapi.match_authors(paper.get("authors", []))

        # Optional PDF upload
        if args.upload_pdfs and paper.get("pdf_url"):
            safe_name = f"{oa_id.split('/')[-1]}.pdf"
            pdf_id = strapi.upload_pdf(paper['pdf_url'], safe_name)
            if pdf_id:
                paper["attachment"] = pdf_id

        doc_id = strapi.create_publication(paper, author_ids=author_ids or None)
        if doc_id:
            pub_map[oa_id] = doc_id
            stats["created"] += 1
            log.info(f"  Created: {paper['title'][:60]}")
        else:
            stats["failed"] += 1

    log.info(
        f"Publications: {stats['created']} created, {stats['updated']} updated, "
        f"{stats['skipped']} skipped, {stats['failed']} failed"
    )

    # ── 4. Upload links ──────────────────────────────────────────────────
    if links_to_upload:
        log.info(f"Uploading {len(links_to_upload)} graph links...")
        link_ok = 0
        link_fail = 0

        for link in links_to_upload:
            src_oa = link['source_openalex_id']
            tgt_oa = link['target_openalex_id']

            src_id = pub_map.get(src_oa) or strapi.get_publication_id_by_openalex(src_oa)
            tgt_id = pub_map.get(tgt_oa) or strapi.get_publication_id_by_openalex(tgt_oa)

            if not src_id or not tgt_id:
                link_fail += 1
                continue

            # Determine if cross-cluster
            is_cross = False
            if communities:
                src_comm = communities.get(src_oa)
                tgt_comm = communities.get(tgt_oa)
                is_cross = src_comm is not None and tgt_comm is not None and src_comm != tgt_comm

            success = strapi.create_graph_link(src_id, tgt_id, link['score'], is_cross_cluster=is_cross)
            if success:
                link_ok += 1
            else:
                link_fail += 1

        log.info(f"Links: {link_ok} created, {link_fail} failed/skipped")

    # ── 5. Write community assignments back to publications ──────────────
    if communities and community_labels:
        log.info("Updating community assignments on publications...")
        comm_ok = 0
        for oa_id, comm_id in communities.items():
            doc_id = pub_map.get(oa_id) or strapi.get_publication_id_by_openalex(oa_id)
            if not doc_id:
                continue
            label_str = community_labels.get(comm_id, f"Cluster {comm_id}")
            if strapi.update_publication(doc_id, {"community": comm_id, "communityLabel": label_str}):
                comm_ok += 1
        log.info(f"Community assignments: {comm_ok} updated")

    log.info("Done.")


# ── Entry point ──────────────────────────────────────────────────────────────

def main():
    parser = build_parser()
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%H:%M:%S",
    )

    # If no args at all, default to interactive mode
    if len(sys.argv) == 1:
        args.interactive = True

    if args.interactive:
        _interactive_mode(args)
    else:
        run(args)


def _interactive_mode(args):
    """Legacy interactive prompt mode for backwards compatibility."""
    print("=== Research Paper Graph Manager ===")
    choice = input("Load papers from (1) OpenAlex Author, (2) Local file, (3) Institution [1/2/3]: ").strip() or "1"

    if choice == "3":
        args.mode = "institution"
    elif choice == "2":
        args.mode = "file"
    else:
        args.mode = "author"

    # Ask about options
    skip_graph = input("Generate similarity links? (y/n) [y]: ").strip().lower()
    args.skip_graph = skip_graph == 'n'

    skip_upload = input("Upload to Strapi? (y/n) [y]: ").strip().lower()
    args.skip_upload = skip_upload == 'n'

    args.update_existing = input("Update existing publications? (y/n) [n]: ").strip().lower() == 'y'
    args.upload_pdfs = input("Upload PDFs? (y/n) [n]: ").strip().lower() == 'y'

    run(args)


if __name__ == "__main__":
    main()
