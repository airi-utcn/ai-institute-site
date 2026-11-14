from contextlib import closing
import logging
import sqlite3
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class PaperStatus:
    QUEUED = "QUEUED"
    COMPLETED = "COMPLETED"
    SYNCED_TO_STRAPI = "SYNCED_TO_STRAPI"
    FAILED = "FAILED"


def _utc_iso_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


class StateTracker:
    """
    Manages the SQLite3 state database (`processed_papers.db`) shared with the `sqlite_db` container.
    Prevents duplicate processing, tracks Strapi synchronization (`SYNCED_TO_STRAPI`),
    and handles automatic retry eligibility when tasks time out or fail.
    """

    def __init__(
        self,
        db_path: Path,
        retry_timeout_seconds: int = 120,
        max_retries: int = 3,
    ) -> None:
        self.db_path = Path(db_path)
        self.retry_timeout_seconds = max(1, int(retry_timeout_seconds))
        self.max_retries = max(1, int(max_retries))
        self._ensure_schema()

    def _connect(self) -> sqlite3.Connection:
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(str(self.db_path), timeout=10.0)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA synchronous=NORMAL;")
        conn.execute("PRAGMA busy_timeout=5000;")
        return conn

    def _ensure_schema(self) -> None:
        with closing(self._connect()) as conn:
            existing_cols = {
                row["name"]
                for row in conn.execute("PRAGMA table_info(processed_papers);").fetchall()
            }
            if existing_cols and "paper_id" not in existing_cols:
                logger.warning(
                    "Detected incompatible 'processed_papers' table schema (columns=%s). Recreating table...",
                    sorted(existing_cols),
                )
                conn.execute("DROP TABLE IF EXISTS processed_papers;")
                existing_cols = set()

            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS processed_papers (
                    paper_id TEXT PRIMARY KEY,
                    pdf_path TEXT NOT NULL DEFAULT '',
                    file_hash TEXT NOT NULL,
                    status TEXT NOT NULL,
                    acknowledgment_text TEXT,
                    confidence_score REAL,
                    retry_count INTEGER NOT NULL DEFAULT 0,
                    error_message TEXT,
                    queued_at REAL NOT NULL DEFAULT 0.0,
                    completed_at TEXT,
                    updated_at TEXT NOT NULL
                );
                """
            )
            if existing_cols and "pdf_path" not in existing_cols:
                conn.execute(
                    "ALTER TABLE processed_papers ADD COLUMN pdf_path TEXT NOT NULL DEFAULT '';"
                )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_processed_papers_status ON processed_papers(status);"
            )
            conn.commit()

    def get_record(self, paper_id: str) -> Optional[Dict[str, Any]]:
        """Fetches the full state record for a given `paper_id`, or None if not found."""
        with closing(self._connect()) as conn:
            row = conn.execute(
                "SELECT * FROM processed_papers WHERE paper_id = ?;",
                (paper_id,),
            ).fetchone()
            return dict(row) if row is not None else None

    def is_already_processed(self, paper_id: str, file_hash: str, pdf_path: str = "") -> bool:
        """
        Returns True if the paper with `file_hash` should be skipped:
        - COMPLETED or SYNCED_TO_STRAPI with the same `file_hash` -> True (already done)
        - QUEUED with the same `file_hash` and within `retry_timeout_seconds` -> True (currently in progress)
        - QUEUED past `retry_timeout_seconds` or FAILED -> False if `retry_count < max_retries` (triggers retry!),
          otherwise True (exhausted max retries).
        """
        record = self.get_record(paper_id)
        if record is None:
            return False

        if pdf_path and not record.get("pdf_path"):
            with closing(self._connect()) as conn:
                conn.execute(
                    "UPDATE processed_papers SET pdf_path = ? WHERE paper_id = ?;",
                    (pdf_path, paper_id),
                )
                conn.commit()

        # If the PDF file itself changed (different SHA-256), re-process it from scratch
        if record["file_hash"] != file_hash:
            return False

        status = record["status"]
        retry_count = int(record.get("retry_count") or 0)

        if status in (PaperStatus.COMPLETED, PaperStatus.SYNCED_TO_STRAPI):
            return True

        if status == PaperStatus.QUEUED:
            queued_at = float(record.get("queued_at") or 0.0)
            elapsed = time.time() - queued_at
            if elapsed < self.retry_timeout_seconds:
                return True

            if retry_count < self.max_retries:
                logger.warning(
                    "Task paper_id='%s' timed out in QUEUED state after %.1fs (attempt %d/%d). Allowing retry.",
                    paper_id,
                    elapsed,
                    retry_count,
                    self.max_retries,
                )
                return False

            logger.error(
                "Task paper_id='%s' exceeded max retries (%d) after timeout. Skipping.",
                paper_id,
                self.max_retries,
            )
            return True

        if status == PaperStatus.FAILED:
            if retry_count < self.max_retries:
                logger.info(
                    "Task paper_id='%s' previously FAILED (attempt %d/%d). Allowing retry.",
                    paper_id,
                    retry_count,
                    self.max_retries,
                )
                return False
            return True

        return False

    def mark_as_queued(self, paper_id: str, file_hash: str, pdf_path: str = "") -> int:
        """
        Marks the PDF as QUEUED in SQLite3.
        If re-queuing an existing record with the same hash, increments `retry_count`.
        Returns the current attempt number (`retry_count`).
        """
        now_ts = time.time()
        now_iso = _utc_iso_now()
        existing = self.get_record(paper_id)

        if existing is None or existing["file_hash"] != file_hash:
            retry_count = 1
        elif existing["status"] in (PaperStatus.COMPLETED, PaperStatus.SYNCED_TO_STRAPI):
            retry_count = 1
        else:
            retry_count = int(existing.get("retry_count") or 0) + 1

        resolved_pdf_path = pdf_path or (existing.get("pdf_path", "") if existing else "")

        with closing(self._connect()) as conn:
            conn.execute(
                """
                INSERT INTO processed_papers (
                    paper_id, pdf_path, file_hash, status,
                    acknowledgment_text, confidence_score,
                    retry_count, error_message, queued_at, completed_at, updated_at
                )
                VALUES (?, ?, ?, ?, NULL, NULL, ?, NULL, ?, NULL, ?)
                ON CONFLICT(paper_id) DO UPDATE SET
                    pdf_path = CASE WHEN excluded.pdf_path != '' THEN excluded.pdf_path ELSE processed_papers.pdf_path END,
                    file_hash = excluded.file_hash,
                    status = excluded.status,
                    retry_count = excluded.retry_count,
                    error_message = NULL,
                    queued_at = excluded.queued_at,
                    updated_at = excluded.updated_at;
                """,
                (
                    paper_id,
                    resolved_pdf_path,
                    file_hash,
                    PaperStatus.QUEUED,
                    retry_count,
                    now_ts,
                    now_iso,
                ),
            )
            conn.commit()

        logger.info(
            "Marked paper_id='%s' as QUEUED (pdf='%s', hash=%s..., attempt=%d/%d).",
            paper_id,
            resolved_pdf_path,
            file_hash[:12],
            retry_count,
            self.max_retries,
        )
        return retry_count

    def mark_as_completed(
        self,
        paper_id: str,
        file_hash: str,
        ack_text: Optional[str],
        score: Optional[float],
        pdf_path: str = "",
    ) -> None:
        """Saves the extracted acknowledgment text and PDF link, marking the PDF as COMPLETED in SQLite."""
        now_iso = _utc_iso_now()
        with closing(self._connect()) as conn:
            conn.execute(
                """
                INSERT INTO processed_papers (
                    paper_id, pdf_path, file_hash, status,
                    acknowledgment_text, confidence_score,
                    retry_count, error_message, queued_at, completed_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, 1, NULL, ?, ?, ?)
                ON CONFLICT(paper_id) DO UPDATE SET
                    pdf_path = CASE WHEN excluded.pdf_path != '' THEN excluded.pdf_path ELSE processed_papers.pdf_path END,
                    file_hash = excluded.file_hash,
                    status = excluded.status,
                    acknowledgment_text = excluded.acknowledgment_text,
                    confidence_score = excluded.confidence_score,
                    error_message = NULL,
                    completed_at = excluded.completed_at,
                    updated_at = excluded.updated_at;
                """,
                (
                    paper_id,
                    pdf_path or "",
                    file_hash,
                    PaperStatus.COMPLETED,
                    ack_text,
                    score,
                    time.time(),
                    now_iso,
                    now_iso,
                ),
            )
            conn.commit()

        logger.info(
            "Marked paper_id='%s' as COMPLETED (pdf='%s', score=%s, has_ack=%s).",
            paper_id,
            pdf_path,
            f"{score:.4f}" if score is not None else "None",
            ack_text is not None,
        )

    def mark_as_synced_to_strapi(self, paper_id: str) -> None:
        """
        Updates the record status from COMPLETED to SYNCED_TO_STRAPI after the extracted
        acknowledgment has been successfully written to the corresponding Strapi publication.
        """
        now_iso = _utc_iso_now()
        with closing(self._connect()) as conn:
            conn.execute(
                """
                UPDATE processed_papers
                SET status = ?, updated_at = ?
                WHERE paper_id = ?;
                """,
                (PaperStatus.SYNCED_TO_STRAPI, now_iso, paper_id),
            )
            conn.commit()

        logger.info("Marked paper_id='%s' as SYNCED_TO_STRAPI in SQLite.", paper_id)

    def mark_as_failed(
        self,
        paper_id: str,
        file_hash: str,
        error_message: Optional[str] = None,
        pdf_path: str = "",
    ) -> None:
        """Marks a processing attempt as FAILED while preserving retry_count and pdf_path for future retries."""
        now_iso = _utc_iso_now()
        with closing(self._connect()) as conn:
            conn.execute(
                """
                INSERT INTO processed_papers (
                    paper_id, pdf_path, file_hash, status,
                    acknowledgment_text, confidence_score,
                    retry_count, error_message, queued_at, completed_at, updated_at
                )
                VALUES (?, ?, ?, ?, NULL, NULL, 1, ?, ?, NULL, ?)
                ON CONFLICT(paper_id) DO UPDATE SET
                    pdf_path = CASE WHEN excluded.pdf_path != '' THEN excluded.pdf_path ELSE processed_papers.pdf_path END,
                    file_hash = excluded.file_hash,
                    status = excluded.status,
                    error_message = excluded.error_message,
                    updated_at = excluded.updated_at;
                """,
                (
                    paper_id,
                    pdf_path or "",
                    file_hash,
                    PaperStatus.FAILED,
                    error_message or "Worker processing failed or timed out",
                    time.time(),
                    now_iso,
                ),
            )
            conn.commit()

        logger.warning("Marked paper_id='%s' as FAILED (pdf='%s', reason: %s).", paper_id, pdf_path, error_message)

    def get_stale_queued_papers(self) -> List[Dict[str, Any]]:
        """Returns papers stuck in QUEUED longer than `retry_timeout_seconds` that can still be retried."""
        cutoff = time.time() - self.retry_timeout_seconds
        with closing(self._connect()) as conn:
            rows = conn.execute(
                """
                SELECT * FROM processed_papers
                WHERE status = ? AND queued_at <= ? AND retry_count < ?;
                """,
                (PaperStatus.QUEUED, cutoff, self.max_retries),
            ).fetchall()
            return [dict(row) for row in rows]

    def get_unsynced_completed_papers(self) -> List[Dict[str, Any]]:
        """
        Returns papers saved in SQLite with status='COMPLETED' that have a non-empty
        acknowledgment_text and pdf_path, so they can be synced to Strapi and promoted
        to status='SYNCED_TO_STRAPI'.
        """
        with closing(self._connect()) as conn:
            rows = conn.execute(
                """
                SELECT * FROM processed_papers
                WHERE status = ?
                  AND acknowledgment_text IS NOT NULL
                  AND TRIM(acknowledgment_text) != ''
                  AND pdf_path != '';
                """,
                (PaperStatus.COMPLETED,),
            ).fetchall()
            return [dict(row) for row in rows]

    def list_all(self) -> List[Dict[str, Any]]:
        """Returns all rows in `processed_papers` ordered by `updated_at` descending."""
        with closing(self._connect()) as conn:
            rows = conn.execute(
                "SELECT * FROM processed_papers ORDER BY updated_at DESC;"
            ).fetchall()
            return [dict(row) for row in rows]
