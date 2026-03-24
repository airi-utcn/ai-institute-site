"""Command-line entrypoints for the research paper graph sync."""

import argparse
import logging

from .config import load_runtime_settings
from .pipeline import build_graph_artifacts, save_paper_snapshot
from .sources import fetch_papers
from .strapi_sync import (
    create_client,
    replace_graph_links,
    update_graph_metadata,
    upload_publications,
)

SETTINGS = load_runtime_settings(__file__)

log = logging.getLogger("paper-sync")


def build_parser():
    p = argparse.ArgumentParser(
        prog="paper-sync",
        description="Sync publications and rebuild the global graph.",
    )
    source_group = p.add_mutually_exclusive_group(required=False)
    source_group.add_argument(
        "--strapi-people",
        action="store_true",
        help="Import papers only from people loaded from Strapi",
    )
    source_group.add_argument(
        "--institution",
        "-institution",
        type=str,
        help="Import papers for one institution",
    )
    source_group.add_argument(
        "--person",
        type=str,
        help="Import papers for one person by name",
    )
    p.add_argument(
        "--dry-run",
        action="store_true",
        help="Skip all Strapi writes (local preview artifacts are still generated)",
    )
    return p


def _apply_runtime_defaults(args):
    """Set fixed runtime defaults to keep the tool predictable and low-config."""
    if getattr(args, "institution", None):
        args.mode = "institution"
    elif getattr(args, "person", None):
        args.mode = "person"
    else:
        args.mode = "strapi-people"
    args.use_fetch_cache = True
    args.refresh_fetch_cache = False
    args.fetch_cache_file = None
    args.skip_graph = False
    args.skip_communities = False
    args.update_existing = True
    args.upload_pdfs = False
    args.limit = 0
    args.community_resolution = 1.0


def run(args):
    sim_thresh = SETTINGS.graph_similarity_threshold
    dup_thresh = SETTINGS.graph_duplicate_threshold
    model_name = SETTINGS.graph_ai_model
    top_k = SETTINGS.graph_top_k

    papers, label = fetch_papers(args, logger=log, settings=SETTINGS)
    log.info(f"Fetched {len(papers)} papers ({label})")

    save_paper_snapshot(papers, label, logger=log)

    preview_graph = build_graph_artifacts(
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

    papers_to_upload = [paper for paper in papers if paper["openAlexId"] not in preview_graph.duplicate_ids]
    skipped_papers = len(papers) - len(papers_to_upload)

    log.info(f"Papers: {len(papers_to_upload)} to process, {skipped_papers} duplicates skipped before sync")

    if args.dry_run:
        log.info("[DRY RUN] Strapi writes are disabled; generated local preview artifacts only.")
        return

    strapi = create_client(SETTINGS)
    pub_map, _stats = upload_publications(strapi, papers_to_upload, args, logger=log)

    if args.skip_graph:
        log.info("Skipping global graph rebuild (--skip-graph).")
        log.info("Done.")
        return

    global_papers, global_pub_map = strapi.load_graph_eligible_publications()
    global_graph = build_graph_artifacts(
        global_papers,
        "global",
        skip_graph=False,
        skip_communities=args.skip_communities,
        similarity_threshold=sim_thresh,
        duplicate_threshold=dup_thresh,
        model_name=model_name,
        top_k=top_k,
        community_resolution=args.community_resolution,
        logger=log,
    )

    links_to_upload = [link for link in global_graph.all_links if not link["is_duplicate"]]
    log.info(f"Global rebuild: {len(global_papers)} eligible publications, {len(links_to_upload)} links")

    replace_graph_links(
        strapi,
        links_to_upload,
        global_pub_map,
        communities=global_graph.communities,
        logger=log,
    )

    update_graph_metadata(strapi, global_graph, global_pub_map, logger=log)

    log.info("Done.")


def main(argv=None):
    parser = build_parser()
    args = parser.parse_args(argv)

    has_source_selector = bool(
        getattr(args, "strapi_people", False)
        or getattr(args, "institution", None)
        or getattr(args, "person", None)
    )
    if not has_source_selector:
        parser.print_help()
        return

    _apply_runtime_defaults(args)

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%H:%M:%S",
    )

    run(args)