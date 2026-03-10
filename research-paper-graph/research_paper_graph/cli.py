"""Command-line entrypoints for the research paper graph sync."""

import argparse
import logging
import sys

from .config import load_runtime_settings
from .pipeline import build_graph_artifacts, save_paper_snapshot
from .sources import fetch_papers
from .strapi_sync import (
    create_client,
    update_community_assignments,
    upload_graph_links,
    upload_publications,
)

SETTINGS = load_runtime_settings(__file__)

log = logging.getLogger("paper-sync")


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

    p.add_argument(
        "--limit",
        type=int,
        default=100,
        help="Maximum number of papers to process (default: 100; 0 = unlimited)",
    )

    p.add_argument("--similarity-threshold", type=float, default=None)
    p.add_argument("--duplicate-threshold", type=float, default=None)
    p.add_argument("--model", type=str, default=None)
    p.add_argument("--top-k", type=int, default=None)
    p.add_argument(
        "--community-resolution",
        type=float,
        default=1.0,
        help="Louvain resolution (higher = more communities)",
    )

    p.add_argument("--verbose", "-v", action="store_true")
    p.add_argument("--interactive", "-i", action="store_true", help="Run in interactive prompt mode (legacy)")

    return p


def run(args):
    sim_thresh = args.similarity_threshold or SETTINGS.graph_similarity_threshold
    dup_thresh = args.duplicate_threshold or SETTINGS.graph_duplicate_threshold
    model_name = args.model or SETTINGS.graph_ai_model
    top_k = args.top_k or SETTINGS.graph_top_k

    papers, label = fetch_papers(args, logger=log)
    log.info(f"Fetched {len(papers)} papers ({label})")

    if args.limit and args.limit > 0 and len(papers) > args.limit:
        log.info(f"Limiting to {args.limit} papers (--limit {args.limit})")
        papers = papers[:args.limit]

    save_paper_snapshot(papers, label, logger=log)

    graph = build_graph_artifacts(
        papers,
        label,
        skip_graph=args.skip_graph,
        skip_communities=args.skip_communities,
        similarity_threshold=sim_thresh,
        duplicate_threshold=dup_thresh,
        model_name=model_name,
        top_k=top_k,
        community_resolution=args.community_resolution,
        logger=log,
    )

    papers_to_upload = [paper for paper in papers if paper["openAlexId"] not in graph.duplicate_ids]
    links_to_upload = [link for link in graph.all_links if not link["is_duplicate"]]
    skipped_papers = len(papers) - len(papers_to_upload)

    log.info(f"Papers: {len(papers_to_upload)} to process, {skipped_papers} duplicates skipped")
    log.info(f"Links: {len(links_to_upload)} to upload")

    if args.dry_run:
        log.info("[DRY RUN] Would upload above papers and links. Exiting.")
        return

    if args.skip_upload:
        log.info("Skipping Strapi upload (--skip-upload).")
        return

    strapi = create_client(SETTINGS)
    pub_map, _stats = upload_publications(strapi, papers_to_upload, args, logger=log)

    upload_graph_links(strapi, links_to_upload, pub_map, communities=graph.communities, logger=log)

    update_community_assignments(
        strapi,
        graph.communities,
        graph.community_labels,
        pub_map,
        logger=log,
    )

    log.info("Done.")


def main(argv=None):
    parser = build_parser()
    args = parser.parse_args(argv)

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%H:%M:%S",
    )

    if argv is None and len(sys.argv) == 1:
        args.interactive = True

    if args.interactive:
        _interactive_mode(args)
    else:
        run(args)


def _interactive_mode(args):
    print("=== Research Paper Graph Manager ===")
    choice = input("Load papers from (1) OpenAlex Author, (2) Local file, (3) Institution [1/2/3]: ").strip() or "1"

    if choice == "3":
        args.mode = "institution"
    elif choice == "2":
        args.mode = "file"
    else:
        args.mode = "author"

    skip_graph = input("Generate similarity links? (y/n) [y]: ").strip().lower()
    args.skip_graph = skip_graph == "n"

    skip_upload = input("Upload to Strapi? (y/n) [y]: ").strip().lower()
    args.skip_upload = skip_upload == "n"

    args.update_existing = input("Update existing publications? (y/n) [n]: ").strip().lower() == "y"
    args.upload_pdfs = input("Upload PDFs? (y/n) [n]: ").strip().lower() == "y"

    run(args)