import logging
import math
from pathlib import Path
from typing import List, Union
from urllib.parse import urlparse

import httpx

try:
    import pymupdf
except ImportError:
    import fitz as pymupdf

logger = logging.getLogger(__name__)

# Blocks shorter than this (e.g., "Acknowledgments", "VI. FUNDING") are treated as titles
# and merged into the paragraph immediately following them.
MAX_TITLE_LENGTH = 45


def clean_paragraph(text: str) -> str:
    """
    Normalizes a paragraph extracted from a PDF:
    - Joins hyphenated words split across line breaks
    - Collapses line breaks and multiple spaces into a single space
    """
    if not text:
        return ""

    # 1. Rejoin words split with a trailing hyphen across line breaks
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    merged_lines: List[str] = []

    for line in lines:
        if merged_lines and merged_lines[-1].endswith("-"):
            merged_lines[-1] = merged_lines[-1][:-1] + line
        else:
            merged_lines.append(line)

    # 2. Normalize whitespace across lines
    cleaned = " ".join(" ".join(merged_lines).split())
    return cleaned


def get_target_page_indices(total_pages: int, tail_percentage: float = 0.33) -> List[int]:
    """
    Returns the page indices relevant for acknowledgment extraction:
    - First page (index 0), where grant/funding footnotes frequently appear
    - The tail portion of the document specified by tail_percentage (e.g. 0.33 or 33.0 for ~33%),
      where the Acknowledgments section typically resides.
    """
    if total_pages <= 0:
        return []

    ratio = tail_percentage / 100.0 if tail_percentage > 1.0 else tail_percentage
    ratio = max(0.0, min(1.0, ratio))

    tail_count = max(1, math.ceil(total_pages * ratio))
    if tail_count >= total_pages:
        return list(range(total_pages))

    tail_start = max(1, total_pages - tail_count)
    return [0] + list(range(tail_start, total_pages))


def _is_url(source: Union[str, Path]) -> bool:
    if isinstance(source, Path):
        return False
    parsed = urlparse(str(source).strip())
    return parsed.scheme in ("http", "https")


def _open_pdf_document(pdf_source: Union[str, Path]):
    """
    Opens a PDF either directly from a HTTP/HTTPS URL (in RAM, without saving to disk)
    or from a local filesystem path.
    """
    if _is_url(pdf_source):
        url = str(pdf_source).strip()
        logger.info("Fetching PDF in memory from URL: %s", url)
        response = httpx.get(url, follow_redirects=True, timeout=30.0)
        response.raise_for_status()
        return pymupdf.open(stream=response.content, filetype="pdf"), url.split("/")[-1]

    path = Path(pdf_source)
    if not path.is_file():
        raise FileNotFoundError(f"PDF file not found: {path}")
    return pymupdf.open(path), path.name


def extract_candidate_chunks(
    pdf_source: Union[str, Path],
    tail_percentage: float = 0.33,
) -> List[str]:
    """
    Opens a PDF from a URL (in RAM) or local file path using PyMuPDF (fitz)
    and extracts normalized candidate paragraphs from the first page and the
    end portion of the document.
    """
    chunks: List[str] = []
    seen_chunks = set()

    doc, doc_label = _open_pdf_document(pdf_source)
    with doc:
        total_pages = len(doc)
        if total_pages == 0:
            logger.warning("Empty PDF document (0 pages): %s", doc_label)
            return []

        target_pages = get_target_page_indices(total_pages, tail_percentage=tail_percentage)
        logger.info(
            "Extracting paragraphs from '%s' (total pages: %d, selected pages: %s)",
            doc_label,
            total_pages,
            target_pages,
        )

        pending_title = ""

        for page_idx in target_pages:
            page = doc[page_idx]
            blocks = page.get_text("blocks")

            for block in blocks:
                block_type = block[6] if len(block) > 6 else 0
                if block_type != 0:  # Skip image blocks
                    continue

                raw_block_text = block[4]
                if not raw_block_text or not raw_block_text.strip():
                    continue

                for raw_para in raw_block_text.split("\n\n"):
                    cleaned = clean_paragraph(raw_para)
                    if not cleaned:
                        continue

                    # Keep only the most recent short heading immediately above a body paragraph
                    if len(cleaned) <= MAX_TITLE_LENGTH and not cleaned.endswith("."):
                        pending_title = cleaned
                        continue

                    if pending_title:
                        cleaned = f"{pending_title}: {cleaned}"
                        pending_title = ""

                    if cleaned not in seen_chunks:
                        seen_chunks.add(cleaned)
                        chunks.append(cleaned)

    logger.info("Extracted %d candidate paragraphs from '%s'.", len(chunks), doc_label)
    return chunks
