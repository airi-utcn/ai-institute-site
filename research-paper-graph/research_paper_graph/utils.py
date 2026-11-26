"""Shared utility functions for normalization and text processing."""

import re
import unicodedata


def normalize_openalex_id(value):
    """Normalize an OpenAlex ID by stripping and removing trailing slashes."""
    raw = str(value or "").strip()
    if not raw:
        return ""
    return raw.rstrip("/")


def normalize_doi(value):
    """Normalize a DOI by lowercasing and removing URL prefixes."""
    raw = str(value or "").strip().lower()
    if not raw:
        return ""
    return re.sub(r"^https?://(dx\.)?doi\.org/", "", raw)


def normalize_title(value):
    """Normalize a title by lowercasing and collapsing whitespace."""
    raw = str(value or "").strip().lower()
    return re.sub(r"\s+", " ", raw)


def normalize_person_name(value):
    """Normalize a person name for order- and accent-insensitive comparison."""
    text = unicodedata.normalize("NFD", str(value or ""))
    text = "".join(char for char in text if unicodedata.category(char) != "Mn")
    text = text.lower()
    tokens = re.findall(r"[a-z0-9]+", text)
    tokens = [token for token in tokens if token not in {"dr", "prof", "mr", "ms"}]
    return " ".join(sorted(tokens))


def slugify(value):
    """Convert a string to a URL-friendly slug.
    
    Removes accents, converts to lowercase, removes non-alphanumeric characters,
    and replaces spaces with hyphens.
    """
    text = str(value or "")
    # Normalize unicode characters and remove accents
    text = unicodedata.normalize("NFD", text)
    text = "".join(char for char in text if unicodedata.category(char) != "Mn")
    # Convert to lowercase and clean up
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9\s-]", "", text)
    text = re.sub(r"\s+", "-", text)
    text = re.sub(r"-+", "-", text)
    return text.strip("-")
