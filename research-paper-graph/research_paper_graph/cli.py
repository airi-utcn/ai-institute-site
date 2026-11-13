"""Command-line entrypoints for the research paper graph sync."""

import argparse
import logging

from .config import load_runtime_settings
from . import graph as gg
from . import openalex as oaf
from .pipeline import build_graph_artifacts
from .sources import fetch_papers
from .strapi_sync import (
    create_client,
    replace_graph_links,
    update_macro_assignments,
    update_meso_assignments,
    update_graph_metadata,
    upload_publications,
)

SETTINGS = load_runtime_settings(__file__)
oaf.configure(SETTINGS.openalex_api_key)

log = logging.getLogger("paper-sync")


def _apply_runtime_graph_settings(settings):
    """Override graph module clustering knobs from environment settings."""
    gg.HDBSCAN_MIN_CLUSTER_SIZE = settings.graph_hdbscan_min_cluster_size
    gg.HDBSCAN_MIN_SAMPLES = settings.graph_hdbscan_min_samples
    gg.SECONDARY_CLUSTER_DISTANCE_THRESHOLD = settings.graph_secondary_cluster_distance_threshold
    gg.TOPIC_HDBSCAN_MIN_CLUSTER_SIZE = settings.graph_topic_hdbscan_min_cluster_size
    gg.TOPIC_HDBSCAN_MIN_SAMPLES = settings.graph_topic_hdbscan_min_samples


def build_parser():
    p = argparse.ArgumentParser(
        prog="paper-sync",
        description="Sync publications and rebuild the global graph.",
    )
    p.add_argument(
        "--institution",
        type=str,
        default=None,
        help="Override default: import papers for one specific institution (by OpenAlex lookup)",
    )
    p.add_argument(
        "--person",
        type=str,
        default=None,
        help="Override default: import papers for one specific person (by OpenAlex author name lookup)",
    )
    return p


def run(args):
    _apply_runtime_graph_settings(SETTINGS)

    sim_thresh = SETTINGS.graph_similarity_threshold
    dup_thresh = SETTINGS.graph_duplicate_threshold
    model_name = SETTINGS.graph_ai_model

    papers, label = fetch_papers(
        institution=args.institution,
        person=args.person,
        settings=SETTINGS,
        logger=log,
    )
    log.info(f"Fetched {len(papers)} papers ({label})")

    strapi = create_client(SETTINGS)
    upload_publications(strapi, papers, logger=log)

    global_papers, global_pub_map = strapi.load_graph_eligible_publications()
    global_graph = build_graph_artifacts(
        global_papers,
        "global",
        similarity_threshold=sim_thresh,
        duplicate_threshold=dup_thresh,
        model_name=model_name,
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

    _macro_updated, macro_map = update_macro_assignments(
        strapi,
        global_graph,
        global_papers,
        global_pub_map,
        model_name,
        logger=log,
    )

    macro_hierarchies, macro_superclusters = gg.build_macro_topic_hierarchies(
        global_papers,
        macro_map,
        model_name,
    )
    if macro_superclusters:
        global_graph.paper_topic_superclusters = macro_superclusters
    else:
        macro_hierarchies = None
        log.warning("No macro topic superclusters produced; keeping global topic assignments")

    update_graph_metadata(strapi, global_graph, global_pub_map, logger=log)

    update_meso_assignments(
        strapi,
        global_graph,
        global_papers,
        global_pub_map,
        macro_map,
        macro_hierarchies,
        logger=log,
    )

    log.info("Done.")


def main(argv=None):
    parser = build_parser()
    args = parser.parse_args(argv)

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%H:%M:%S",
    )

    run(args)