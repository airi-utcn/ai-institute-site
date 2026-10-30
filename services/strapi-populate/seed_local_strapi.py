#!/usr/bin/env python3
"""
Standalone script to populate a local/private Strapi instance (`http://localhost:1337`)
with publications and their PDF files fetched from a public Strapi instance
(`https://airi.utcluj.ro/strapi`).

This script has ZERO internal project dependencies and can be moved to any
separate folder or standalone Git repository.

Requirements:
    pip install httpx

Configuration:
    Reads settings from environment variables or a `.env` file in the current
    or script directory (see `sample.env`):
      - STRAPI_API_TOKEN       (required: Full-access API token from local Strapi)
      - SEED_PUBLIC_STRAPI_URL (optional, default: https://airi.utcluj.ro/strapi)
      - LOCAL_STRAPI_URL       (optional, default: http://localhost:1337)

Usage:
    python seed_local_strapi.py                 # copy ALL publications with PDFs
    python seed_local_strapi.py --limit 10      # copy only the first 10
    python seed_local_strapi.py --list          # only list local publications + PDF links
    python seed_local_strapi.py --token <YOUR_LOCAL_FULL_ACCESS_TOKEN>
"""

import argparse
import datetime
import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urljoin

import httpx

logger = logging.getLogger("seed_local_strapi")

DEFAULT_PUBLIC_STRAPI = "https://airi.utcluj.ro/strapi"
DEFAULT_LOCAL_STRAPI = "http://localhost:1337"


def load_standalone_dotenv() -> None:
    """
    Lightweight built-in `.env` loader (no `python-dotenv` dependency needed).
    Searches for `.env` in:
      1. Current working directory
      2. Directory containing this script
    """
    script_dir = Path(__file__).resolve().parent
    candidates = [
        Path.cwd() / ".env",
        script_dir / ".env",
    ]
    for env_path in candidates:
        if not env_path.is_file():
            continue
        try:
            for raw_line in env_path.read_text(encoding="utf-8").splitlines():
                line = raw_line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, _, val = line.partition("=")
                key = key.strip()
                val = val.strip()
                if val and val[0] in ('"', "'") and val[-1] == val[0]:
                    val = val[1:-1]
                elif "#" in val:
                    val = val.split("#", 1)[0].strip()
                if key and key not in os.environ:
                    os.environ[key] = val
        except Exception as exc:
            logger.debug("Could not read %s: %s", env_path, exc)


def normalize_base_url(url: str) -> str:
    """Normalizes a Strapi URL by stripping trailing slashes and `/api` suffix."""
    cleaned = (url or "").strip().rstrip("/")
    if cleaned.endswith("/api"):
        cleaned = cleaned[:-4].rstrip("/")
    return cleaned


def resolve_media_url(media_obj: Any, base_url: str) -> Optional[str]:
    """Extracts and resolves a full URL from a Strapi v4/v5 media field (`pdfFile`)."""
    if not media_obj:
        return None

    raw_url: Optional[str] = None
    if isinstance(media_obj, str):
        raw_url = media_obj.strip()
    elif isinstance(media_obj, dict):
        inner = media_obj.get("data") if "data" in media_obj else media_obj
        if isinstance(inner, list) and inner:
            inner = inner[0]
        if isinstance(inner, dict):
            attrs = inner.get("attributes") if isinstance(inner.get("attributes"), dict) else inner
            raw_url = attrs.get("url")
    elif isinstance(media_obj, list) and media_obj:
        return resolve_media_url(media_obj[0], base_url)

    if not raw_url:
        return None

    raw_url = raw_url.strip()
    if raw_url.startswith(("http://", "https://")):
        return raw_url

    norm_base = normalize_base_url(base_url)
    return urljoin(f"{norm_base}/", raw_url.lstrip("/"))


def utc_iso_now() -> str:
    return datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z")


def verify_pdf_accessible(client: httpx.Client, pdf_url: str) -> Tuple[bool, str]:
    """
    Checks that a PDF URL can actually be downloaded (HTTP 200 + PDF content).
    Returns (ok, short description).
    """
    try:
        resp = client.get(pdf_url)
        content_type = resp.headers.get("content-type", "")
        if resp.status_code != 200:
            return False, f"HTTP {resp.status_code}"
        if "pdf" not in content_type.lower() and not resp.content.startswith(b"%PDF"):
            return False, f"not a PDF (content-type={content_type or 'unknown'})"
        return True, f"{len(resp.content) // 1024} KB"
    except Exception as exc:
        return False, f"{type(exc).__name__}: {exc}"


def fetch_public_publications_with_pdfs(
    public_base_url: str,
    limit: int = 0,
    timeout: int = 30,
) -> List[Dict[str, Any]]:
    """
    Fetches publications that have a PDF file from the public Strapi instance.
    If `limit <= 0`, fetches ALL publications with PDFs across all pages.
    """
    api_url = f"{normalize_base_url(public_base_url)}/api/publications"
    collected: List[Dict[str, Any]] = []
    page = 1

    with httpx.Client(timeout=float(timeout), follow_redirects=True) as client:
        while True:
            if limit > 0 and len(collected) >= limit:
                break

            params = {
                "pagination[page]": page,
                "pagination[pageSize]": 100,
                "fields[0]": "documentId",
                "fields[1]": "title",
                "fields[2]": "slug",
                "fields[3]": "openAlexId",
                "fields[4]": "doi",
                "fields[5]": "year",
                "fields[6]": "kind",
                "fields[7]": "cited_by",
                "fields[8]": "abstract",
                "populate[pdfFile][fields][0]": "name",
                "populate[pdfFile][fields][1]": "url",
            }
            resp = client.get(api_url, params=params)
            resp.raise_for_status()
            payload = resp.json()
            entries = payload.get("data") or []
            if not entries:
                break

            for entry in entries:
                attrs = entry.get("attributes") if isinstance(entry.get("attributes"), dict) else entry
                pdf_media = attrs.get("pdfFile") or attrs.get("pdf")
                pdf_url = resolve_media_url(pdf_media, public_base_url)
                if not pdf_url:
                    continue

                pdf_name = None
                if isinstance(pdf_media, dict):
                    inner = pdf_media.get("data") or pdf_media
                    if isinstance(inner, dict):
                        inner_attrs = inner.get("attributes") or inner
                        pdf_name = inner_attrs.get("name")
                if not pdf_name:
                    pdf_name = pdf_url.rstrip("/").split("/")[-1] or "paper.pdf"
                if not pdf_name.lower().endswith(".pdf"):
                    pdf_name = f"{pdf_name}.pdf"

                collected.append(
                    {
                        "title": attrs.get("title") or "Untitled Publication",
                        "slug": attrs.get("slug"),
                        "openAlexId": attrs.get("openAlexId"),
                        "doi": attrs.get("doi"),
                        "year": attrs.get("year"),
                        "kind": attrs.get("kind"),
                        "cited_by": attrs.get("cited_by") or 0,
                        "abstract": attrs.get("abstract"),
                        "pdf_url": pdf_url,
                        "pdf_name": pdf_name,
                    }
                )
                if limit > 0 and len(collected) >= limit:
                    break

            meta = payload.get("meta", {}).get("pagination", {})
            page_count = meta.get("pageCount") or 0
            if not page_count or page >= page_count:
                break
            page += 1

    return collected


def find_existing_local_publication(
    client: httpx.Client,
    local_api_url: str,
    headers: Dict[str, str],
    title: str,
) -> Optional[Dict[str, Any]]:
    """Checks if a publication with the same title already exists in local Strapi."""
    resp = client.get(
        f"{local_api_url}/publications",
        headers=headers,
        params={
            "filters[title][$eq]": title,
            "pagination[pageSize]": 1,
            "fields[0]": "documentId",
            "fields[1]": "title",
            "populate[pdfFile][fields][0]": "id",
            "populate[pdfFile][fields][1]": "url",
        },
    )
    resp.raise_for_status()
    data = resp.json().get("data") or []
    return data[0] if data else None


def fetch_local_publications_with_pdfs(
    client: httpx.Client,
    local_base: str,
    headers: Dict[str, str],
) -> List[Dict[str, Any]]:
    """Returns all local publications that have a PDF."""
    local_api = f"{local_base}/api"
    results: List[Dict[str, Any]] = []
    page = 1
    while True:
        resp = client.get(
            f"{local_api}/publications",
            headers=headers,
            params={
                "pagination[page]": page,
                "pagination[pageSize]": 100,
                "fields[0]": "documentId",
                "fields[1]": "title",
                "fields[2]": "acknowledgment",
                "populate[pdfFile][fields][0]": "name",
                "populate[pdfFile][fields][1]": "url",
            },
        )
        resp.raise_for_status()
        payload = resp.json()
        for entry in payload.get("data") or []:
            attrs = entry.get("attributes") if isinstance(entry.get("attributes"), dict) else entry
            pdf_url = resolve_media_url(attrs.get("pdfFile"), local_base)
            if not pdf_url:
                continue
            results.append(
                {
                    "documentId": entry.get("documentId") or entry.get("id"),
                    "title": attrs.get("title") or "",
                    "pdf_url": pdf_url,
                    "has_ack": bool((attrs.get("acknowledgment") or "").strip()),
                }
            )
        meta = payload.get("meta", {}).get("pagination", {})
        page_count = meta.get("pageCount") or 0
        if not page_count or page >= page_count:
            break
        page += 1
    return results


def list_local_publications(local_url: str, token: str, verify: bool = True, timeout: int = 60) -> int:
    """Prints all local publications with PDFs and their links."""
    local_base = normalize_base_url(local_url)
    headers = {"Authorization": f"Bearer {token.strip()}"} if token and token.strip() else {}

    with httpx.Client(timeout=float(timeout), follow_redirects=True) as client:
        try:
            pubs = fetch_local_publications_with_pdfs(client, local_base, headers)
        except Exception as exc:
            logger.error("Could not list publications from local Strapi at %s: %s", local_base, exc)
            return 1

        logger.info("Local Strapi (%s) has %d publications with PDFs:", local_base, len(pubs))
        broken = 0
        for idx, pub in enumerate(pubs, start=1):
            status = ""
            if verify:
                ok, desc = verify_pdf_accessible(client, pub["pdf_url"])
                status = f"[OK {desc}]" if ok else f"[BROKEN {desc}]"
                broken += 0 if ok else 1
            ack = "ack=yes" if pub["has_ack"] else "ack=no"
            logger.info("  %3d. %s %s | documentId=%s | %s", idx, status, ack, pub["documentId"], pub["title"][:70])
            logger.info("       PDF: %s", pub["pdf_url"])

    if verify and broken:
        logger.warning("%d PDF link(s) are NOT accessible from this machine.", broken)
    return 0


def upload_pdf_to_local_strapi(
    client: httpx.Client,
    local_api_url: str,
    token: str,
    pdf_bytes: bytes,
    filename: str,
) -> Dict[str, Any]:
    """Uploads PDF bytes to local Strapi `/api/upload` and returns the uploaded file metadata."""
    upload_headers = {"Authorization": f"Bearer {token}"}
    files = {"files": (filename, pdf_bytes, "application/pdf")}
    resp = client.post(
        f"{local_api_url}/upload",
        headers=upload_headers,
        files=files,
    )
    resp.raise_for_status()
    uploaded_list = resp.json()
    if not isinstance(uploaded_list, list) or not uploaded_list:
        raise RuntimeError(f"Unexpected /api/upload response: {uploaded_list}")
    return uploaded_list[0]


def seed_publications(
    public_url: str,
    local_url: str,
    token: str,
    limit: int = 0,
    timeout: int = 60,
) -> int:
    if not token or not token.strip():
        logger.error(
            "Missing STRAPI_API_TOKEN! Create a 'Full access' API Token in your local Strapi Admin "
            "(http://localhost:1337/strapi/admin -> Settings -> API Tokens) and put it in .env "
            "next to this script (see sample.env) or pass --token."
        )
        return 1

    clean_token = token.strip()
    local_base = normalize_base_url(local_url)
    local_api = f"{local_base}/api"
    json_headers = {
        "Authorization": f"Bearer {clean_token}",
        "Content-Type": "application/json",
    }

    limit_desc = f"up to {limit}" if limit > 0 else "ALL"
    logger.info("1. Fetching %s publications with PDFs from public Strapi (%s)...", limit_desc, public_url)
    public_papers = fetch_public_publications_with_pdfs(public_url, limit=limit, timeout=timeout)
    logger.info("   Found %d publications with PDFs on public Strapi.", len(public_papers))

    if not public_papers:
        logger.warning("No publications with PDFs found on public Strapi.")
        return 0

    created_count = 0
    skipped_count = 0
    failed_count = 0
    seeded_links: List[Tuple[str, str, bool]] = []

    logger.info("2. Copying publications + PDFs into local Strapi (%s)...", local_base)
    with httpx.Client(timeout=float(timeout), follow_redirects=True) as client:
        for idx, paper in enumerate(public_papers, start=1):
            title = paper["title"]
            pdf_url = paper["pdf_url"]
            pdf_name = paper["pdf_name"]

            logger.info("[%d/%d] Processing: '%s'", idx, len(public_papers), title[:75])

            try:
                existing = find_existing_local_publication(client, local_api, json_headers, title)
            except httpx.HTTPStatusError as http_err:
                logger.error(
                    "Local Strapi returned HTTP %d at %s/publications. "
                    "Make sure your STRAPI_API_TOKEN is a valid 'Full access' token from local Strapi!",
                    http_err.response.status_code,
                    local_api,
                )
                return 1
            except Exception as conn_err:
                logger.error(
                    "Could not connect to local Strapi at %s (%s). Is local Strapi running on port 1337?",
                    local_base,
                    conn_err,
                )
                return 1

            existing_attrs = (existing or {}).get("attributes") or existing or {}
            existing_pdf_url = resolve_media_url(existing_attrs.get("pdfFile"), local_base) if existing else None

            if existing and existing_pdf_url:
                doc_id = existing.get("documentId") or existing.get("id")
                ok, desc = verify_pdf_accessible(client, existing_pdf_url)
                logger.info(
                    "   -> Already exists in local Strapi (documentId=%s). Skipping. PDF %s: %s",
                    doc_id,
                    "OK" if ok else f"BROKEN ({desc})",
                    existing_pdf_url,
                )
                seeded_links.append((title, existing_pdf_url, ok))
                skipped_count += 1
                continue

            try:
                logger.info("   -> Downloading PDF from public Strapi: %s", pdf_url)
                pdf_resp = client.get(pdf_url)
                pdf_resp.raise_for_status()
                pdf_bytes = pdf_resp.content

                logger.info(
                    "   -> Uploading PDF (%d KB) to local Strapi (%s/upload)...",
                    len(pdf_bytes) // 1024,
                    local_api,
                )
                uploaded_file = upload_pdf_to_local_strapi(
                    client=client,
                    local_api_url=local_api,
                    token=clean_token,
                    pdf_bytes=pdf_bytes,
                    filename=pdf_name,
                )
                attachment_id = uploaded_file.get("id")
                local_pdf_url = resolve_media_url(uploaded_file.get("url"), local_base) or ""

                pub_payload: Dict[str, Any] = {
                    "title": title,
                    "slug": paper.get("slug"),
                    "openAlexId": paper.get("openAlexId"),
                    "doi": paper.get("doi"),
                    "year": paper.get("year"),
                    "kind": paper.get("kind"),
                    "cited_by": paper.get("cited_by", 0),
                    "abstract": paper.get("abstract"),
                    "pdfFile": attachment_id,
                    "publishedAt": utc_iso_now(),
                }
                pub_payload = {
                    k: v for k, v in pub_payload.items() if v is not None and (not isinstance(v, str) or v.strip() != "")
                }

                if existing:
                    doc_id = existing.get("documentId") or existing.get("id")
                    resp = client.put(
                        f"{local_api}/publications/{doc_id}",
                        headers=json_headers,
                        json={"data": {"pdfFile": attachment_id}},
                    )
                    resp.raise_for_status()
                    action = "Attached PDF to existing local publication"
                else:
                    resp = client.post(
                        f"{local_api}/publications",
                        headers=json_headers,
                        json={"data": pub_payload},
                    )
                    resp.raise_for_status()
                    created_data = resp.json().get("data") or {}
                    doc_id = created_data.get("documentId") or created_data.get("id")
                    action = "Created in local Strapi"

                ok, desc = verify_pdf_accessible(client, local_pdf_url)
                logger.info(
                    "   -> %s! documentId=%s | PDF %s: %s",
                    action,
                    doc_id,
                    "OK" if ok else f"BROKEN ({desc})",
                    local_pdf_url,
                )
                seeded_links.append((title, local_pdf_url, ok))
                created_count += 1
            except Exception as item_err:
                failed_count += 1
                logger.error("   -> Failed to seed '%s': %s", title[:60], item_err)

    broken_count = sum(1 for _, _, ok in seeded_links if not ok)

    logger.info("============================================================")
    logger.info(
        "Seeding finished! Created/Updated=%d | Skipped=%d | Failed=%d | Broken PDF links=%d",
        created_count,
        skipped_count,
        failed_count,
        broken_count,
    )
    logger.info("Local PDF links:")
    for title, link, ok in seeded_links:
        logger.info("  %s %s  <- %s", "[OK]    " if ok else "[BROKEN]", link, title[:60])
    logger.info("Strapi Admin: %s/strapi/admin", local_base)
    logger.info("============================================================")
    return 0 if failed_count == 0 else 2


def main() -> int:
    load_standalone_dotenv()

    default_local = normalize_base_url(
        os.getenv("LOCAL_STRAPI_URL")
        or os.getenv("STRAPI_URL")
        or DEFAULT_LOCAL_STRAPI
    )
    if "airi.utcluj.ro" in default_local:
        default_local = DEFAULT_LOCAL_STRAPI

    parser = argparse.ArgumentParser(
        description="Standalone script to populate local Strapi with publications and PDFs from public Strapi."
    )
    parser.add_argument(
        "--public-url",
        default=os.getenv("SEED_PUBLIC_STRAPI_URL", DEFAULT_PUBLIC_STRAPI),
        help=f"Source public Strapi URL (default: {DEFAULT_PUBLIC_STRAPI})",
    )
    parser.add_argument(
        "--local-url",
        default=default_local,
        help=f"Target local Strapi URL (default: {DEFAULT_LOCAL_STRAPI})",
    )
    parser.add_argument(
        "--token",
        default=os.getenv("STRAPI_API_TOKEN", ""),
        help="Full-access API Token from your local Strapi Admin (defaults to STRAPI_API_TOKEN from .env)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=0,
        help="Max publications to copy (default: 0 = ALL publications with PDFs)",
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="Do not seed; only list local publications with PDFs",
    )
    parser.add_argument(
        "--no-verify",
        action="store_true",
        help="With --list: skip downloading each PDF to check it is accessible",
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%H:%M:%S",
    )
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)

    if args.list:
        return list_local_publications(args.local_url, args.token, verify=not args.no_verify)

    return seed_publications(
        public_url=args.public_url,
        local_url=args.local_url,
        token=args.token,
        limit=args.limit,
    )


if __name__ == "__main__":
    raise SystemExit(main())
