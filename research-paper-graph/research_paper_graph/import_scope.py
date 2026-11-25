"""Import-scope rules for OpenAlex works.

The graph is a research-publication graph, not a dump of every OpenAlex work.
Removing the old "must have an abstract" guard made book front matter, puzzle
chapters, conference abstracts, and other non-paper records enter the graph.
These rules keep the graph focused without dropping ordinary papers that simply
lack an abstract.
"""

from .utils import normalize_title

# OpenAlex work types that can describe a research publication. Anything else
# (paratext, peer reviews, errata, standards, ...) is never imported.
DEFAULT_IMPORT_TYPES = (
    "article",
    "review",
    "conference-paper",
    "preprint",
    "data-paper",
    "dissertation",
    "book",
    "book-chapter",
    "reference-entry",
    "editorial",
    "conference-abstract",
    "dataset",
    "report",
    "other",
)

# Types that are only accepted when OpenAlex supplies an abstract. A title and
# a list of topics are not enough context for these, and without this guard a
# single book produces dozens of "chapters" such as "Love and Marriage".
DEFAULT_ABSTRACT_REQUIRED_TYPES = (
    "book",
    "book-chapter",
    "reference-entry",
    "editorial",
    "conference-abstract",
    "dataset",
    "report",
    "other",
)

# Exact normalized titles that are book/front matter rather than research.
FRONT_MATTER_TITLES = {
    "contents",
    "table of contents",
    "front matter",
    "back matter",
    "index",
    "author index",
    "subject index",
    "preface",
    "foreword",
    "introduction",
    "conclusion",
    "references",
    "bibliography",
    "about the authors",
    "acknowledgements",
    "acknowledgments",
    "abstract",
    "cover",
    "title page",
    "copyright",
}


def _as_tuple(values, fallback):
    if not values:
        return fallback
    if isinstance(values, str):
        items = [item.strip().lower() for item in values.split(",")]
    else:
        items = [str(item).strip().lower() for item in values]
    cleaned = tuple(item for item in items if item)
    return cleaned or fallback


def resolve_import_types(values=None):
    """Normalize a comma-separated or iterable type allowlist."""
    return _as_tuple(values, DEFAULT_IMPORT_TYPES)


def resolve_abstract_required_types(values=None):
    """Normalize the set of types that require an abstract."""
    return _as_tuple(values, DEFAULT_ABSTRACT_REQUIRED_TYPES)


def out_of_scope_reason(
    paper,
    *,
    allowed_types=None,
    abstract_required_types=None,
):
    """Return why a work is out of scope, or ``None`` when it should be imported."""
    allowed = set(resolve_import_types(allowed_types))
    abstract_required = set(resolve_abstract_required_types(abstract_required_types))

    title = (paper.get("title") or "").strip()
    if not title:
        return "missing title"

    normalized_title = normalize_title(title)
    if normalized_title in FRONT_MATTER_TITLES:
        return "front/back matter title"

    kind = (paper.get("kind") or "").strip().lower()
    if kind and kind not in allowed:
        return f"unsupported type: {kind}"

    abstract = (paper.get("abstract") or "").strip()
    if kind in abstract_required and not abstract:
        return f"{kind} without abstract"

    return None


def is_importable_work(paper, **kwargs):
    """True when an OpenAlex work belongs in the publication graph."""
    return out_of_scope_reason(paper, **kwargs) is None
