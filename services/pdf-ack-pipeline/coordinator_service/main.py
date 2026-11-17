#!/usr/bin/env python3
"""Command-line entrypoint for the PDF acknowledgment coordinator service."""

import argparse
import logging
import sys
from pathlib import Path
from typing import List, Optional

PIPELINE_ROOT = Path(__file__).resolve().parent.parent
if str(PIPELINE_ROOT) not in sys.path:
    sys.path.insert(0, str(PIPELINE_ROOT))

from ack_sync import build_strapi_client, run_ack_sync, sync_pending_completed_to_strapi
from result_consumer import drain_results_queue
from shared.config import settings
from shared.queue_manager import QueueManager
from state_tracker import StateTracker

logger = logging.getLogger("ack-coordinator")


def log_startup_configuration(limit_override: Optional[int] = None) -> None:
    """Logs active coordinator, RabbitMQ, SQLite3, and Strapi settings."""
    effective_limit = limit_override if limit_override is not None else settings.ack_max_papers_per_run
    logger.info("============================================================")
    logger.info("PDF Acknowledgment Coordinator - Configuration Summary")
    logger.info("------------------------------------------------------------")
    logger.info(
        "RabbitMQ Broker   : %s:%s (vhost='%s', user='%s')",
        settings.rabbitmq_host,
        settings.rabbitmq_port,
        settings.rabbitmq_vhost,
        settings.rabbitmq_user,
    )
    logger.info(
        "Queues            : '%s' -> '%s'",
        settings.tasks_queue,
        settings.results_queue,
    )
    logger.info("SQLite3 State DB  : %s", settings.state_db_path)
    logger.info(
        "Strapi API URL    : %s (media=%s)",
        settings.strapi_internal_url or settings.strapi_url,
        settings.public_strapi_url or settings.strapi_url,
    )
    logger.info(
        "Batch Limit       : %s",
        f"{effective_limit} papers per run" if effective_limit > 0 else "unlimited (all papers)",
    )
    logger.info(
        "Retry Policy      : timeout=%ds | max_retries=%d",
        settings.task_retry_timeout_seconds,
        settings.max_task_retries,
    )
    logger.info(
        "Cron Schedule     : '%s' (TZ=%s, run_on_startup=%s)",
        settings.ack_sync_cron,
        settings.ack_sync_tz,
        settings.ack_run_on_startup,
    )
    if settings.ack_test_pdf_urls:
        logger.info("Test PDF URLs     : %d configured", len(settings.ack_test_pdf_urls))
    logger.info("============================================================")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="ack-coordinator",
        description="Synchronize publication PDFs, dispatch acknowledgment extraction tasks, and persist results in SQLite3 and Strapi.",
    )
    parser.add_argument(
        "--pdf-url",
        action="append",
        dest="pdf_urls",
        default=None,
        help="Process one or more specific PDF URLs or file paths (can be passed multiple times).",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Maximum number of new papers to process in this run (overrides ACK_MAX_PAPERS_PER_RUN).",
    )
    parser.add_argument(
        "--drain-only",
        action="store_true",
        help="Only drain pending results from results_queue into SQLite3 and Strapi without scanning for new PDFs.",
    )
    parser.add_argument(
        "--list-db",
        action="store_true",
        help="Print all records currently stored in the SQLite3 processed_papers database and exit.",
    )
    return parser


def main(argv: Optional[List[str]] = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%H:%M:%S",
    )

    # Suppress verbose HTTP request logs from httpx and httpcore
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)

    log_startup_configuration(limit_override=args.limit)

    tracker = StateTracker(
        db_path=settings.state_db_path,
        retry_timeout_seconds=settings.task_retry_timeout_seconds,
        max_retries=settings.max_task_retries,
    )

    if args.list_db:
        rows = tracker.list_all()
        logger.info("Found %d records in '%s':", len(rows), settings.state_db_path)
        for row in rows:
            ack_preview = (row.get("acknowledgment_text") or "")[:80]
            logger.info(
                "  paper_id=%s | pdf_path=%s | status=%s | score=%s | retries=%s | ack='%s'",
                row["paper_id"],
                row.get("pdf_path") or "",
                row["status"],
                row["confidence_score"],
                row["retry_count"],
                ack_preview,
            )
        return 0

    strapi_client = build_strapi_client(settings)

    if args.drain_only:
        queue = QueueManager(settings)
        try:
            count = drain_results_queue(queue, tracker, strapi_client=strapi_client)
            sync_pending_completed_to_strapi(tracker, strapi_client)
            logger.info("Drained %d result(s) from '%s' into SQLite3.", count, settings.results_queue)
            return 0
        finally:
            queue.close()

    run_ack_sync(
        config=settings,
        override_pdf_urls=args.pdf_urls,
        max_papers=args.limit,
        tracker=tracker,
        strapi_client=strapi_client,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
