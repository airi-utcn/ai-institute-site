"""Research paper graph package."""

from .cli import build_parser, main, run
from .config import RuntimeSettings, load_runtime_settings
from .pipeline import GraphArtifacts, build_graph_artifacts, save_paper_snapshot
from .strapi_sync import (
	create_client,
	update_community_assignments,
	upload_graph_links,
	upload_publications,
)
from .sources import fetch_papers

__all__ = [
	"build_parser",
	"RuntimeSettings",
	"GraphArtifacts",
	"build_graph_artifacts",
	"create_client",
	"fetch_papers",
	"load_runtime_settings",
	"main",
	"run",
	"save_paper_snapshot",
	"update_community_assignments",
	"upload_graph_links",
	"upload_publications",
]