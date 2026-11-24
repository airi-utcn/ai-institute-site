"""Command-line entrypoints for the research paper graph sync."""

import argparse
import logging
import uuid
from datetime import datetime, timezone

from .config import load_runtime_settings
from .lock import SyncLock, SyncLockError
from .run_context import RunIdFilter, set_run_id
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
oaf.configure(
    SETTINGS.openalex_api_key,
    mailto=SETTINGS.openalex_mailto,
    timeout=SETTINGS.openalex_http_timeout,
    retries=SETTINGS.openalex_http_retries,
)

log = logging.getLogger("paper-sync")


def _new_run_id():
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    return f"{stamp}-{uuid.uuid4().hex[:6]}"


def _configure_logging():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] [%(run_id)s] %(name)s: %(message)s",
        datefmt="%H:%M:%S",
    )
    root = logging.getLogger()
    for handler in root.handlers:
        handler.addFilter(RunIdFilter())


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
    p.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Only process the first N fetched papers (debugging aid)",
    )
    p.add_argument(
        "--skip-pdf",
        action="store_true",
        help="Do not download or upload PDFs during this run",
    )
    p.add_argument(
        "--dry-run",
        action="store_true",
        help="Fetch and evaluate the graph but do not write publications, links, macros, or mesos",
    )
    p.add_argument(
        "--graph-only",
        action="store_true",
        help="Rebuild links/macros/mesos from the current Strapi corpus without importing or fetching PDFs",
    )
    p.add_argument(
        "--wait-for-lock",
        action="store_true",
        help="Wait for a running sync to finish instead of exiting immediately",
    )
    p.add_argument(
        "--lock-path",
        type=str,
        default=None,
        help="Override the advisory sync lock path",
    )
    p.add_argument(
        "--doctor",
        action="store_true",
        help="Run read-only diagnostics against Strapi and exit",
    )
    p.add_argument(
        "--doctor-json",
        action="store_true",
        help="Emit the doctor report as JSON",
    )
    return p


def run(args):
    _apply_runtime_graph_settings(SETTINGS)

    sim_thresh = SETTINGS.graph_similarity_threshold
    dup_thresh = SETTINGS.graph_duplicate_threshold
    model_name = SETTINGS.graph_ai_model

    strapi = create_client(SETTINGS)

    if args.graph_only:
        papers = []
        label = "graph_only"
        stats = {"graphOnly": True}
        log.info("Graph-only rebuild: skipping author import and PDFs")
    else:
        papers, label = fetch_papers(
            institution=args.institution,
            person=args.person,
            settings=SETTINGS,
            logger=log,
            limit=args.limit,
            dry_run=args.dry_run,
        )
        log.info(f"Fetched {len(papers)} papers ({label})")

        if args.dry_run:
            stats = {"dryRun": True}
            log.info("Dry run: skipping publication import")
        else:
            _pub_map, stats = upload_publications(
                strapi,
                papers,
                logger=log,
                skip_pdf=args.skip_pdf,
            )

    global_papers, global_pub_map = strapi.load_graph_eligible_publications()
    global_graph = build_graph_artifacts(
        global_papers,
        "global",
        similarity_threshold=sim_thresh,
        duplicate_threshold=dup_thresh,
        model_name=model_name,
        top_k=SETTINGS.graph_top_k,
        logger=log,
    )

    links_to_upload = [link for link in global_graph.all_links if not link["is_duplicate"]]
    log.info(f"Global rebuild: {len(global_papers)} eligible publications, {len(links_to_upload)} links")

    if args.dry_run:
        log.info("Dry run complete: no Strapi writes (outputs/ was updated)")
        return stats

    # Macro assignment runs before link upload so the cross-cluster flag can be
    # computed from the editorial macro taxonomy instead of the diagnostic
    # HDBSCAN communities.
    _macro_updated, macro_map = update_macro_assignments(
        strapi,
        global_graph,
        global_papers,
        global_pub_map,
        model_name,
        logger=log,
    )

    replace_graph_links(
        strapi,
        links_to_upload,
        global_pub_map,
        communities=global_graph.communities,
        paper_macro_map=macro_map,
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

    log.info(
        "Done. %s created, %s updated, %s skipped, %s manual, %s failed.",
        stats.get("created", 0),
        stats.get("updated", 0),
        stats.get("skipped", 0),
        stats.get("protected_manual", 0),
        stats.get("failed", 0),
    )

    from .run_context import get_run_id

    report = {
        "runId": get_run_id(),
        "label": label,
        "fetched": len(papers),
        "publications": stats,
        "graph": {
            "eligible": len(global_papers),
            "embedded": len(global_graph.filtered_papers),
            "links": len(links_to_upload),
            "duplicates": len(global_graph.duplicate_ids),
            "communities": len(global_graph.communities),
        },
    }
    try:
        import json
        import os

        os.makedirs("outputs", exist_ok=True)
        path = os.path.join("outputs", f"sync_report_{report['runId']}.json")
        with open(path, "w", encoding="utf-8") as handle:
            json.dump(report, handle, indent=2, sort_keys=True)
        log.info("Run report written to %s", path)
    except Exception as exc:  # pragma: no cover - report is best effort
        log.warning("Could not write run report: %s", exc)
    return stats


def main(argv=None):
    parser = build_parser()
    args = parser.parse_args(argv)

    _configure_logging()

    if args.doctor:
        from .doctor import run_doctor

        return run_doctor(SETTINGS, json_output=args.doctor_json)

    run_id = set_run_id(_new_run_id())
    lock_path = args.lock_path or SETTINGS.sync_lock_path

    try:
        with SyncLock(lock_path, wait=args.wait_for_lock):
            log.info("Starting paper sync run %s (lock: %s)", run_id, lock_path)
            run(args)
    except SyncLockError as exc:
        log.warning("%s; skipping this run.", exc)
        return 0
    return 0
