# Paper Graph Macro-Sector Consolidation

## Why this exists

The global paper graph previously used Louvain communities directly as top-level clusters.
On medium-size corpora this often creates many tiny clusters, including one-paper communities,
which makes the top-level view fragmented and too specific.

This document describes the new two-level strategy:

1. detect fine-grained graph communities from embeddings and links
2. coarsen those communities into a small curated set of macro sectors

## Design goals

- Keep top-level clusters human-readable and stable across runs
- Preserve automatic discovery at lower levels
- Avoid manual per-paper curation
- Keep behavior deterministic

## Current macro sectors

Implemented in [research-paper-graph/research_paper_graph/graph.py](../research-paper-graph/research_paper_graph/graph.py):

- AI & Machine Learning
- Circuits & Systems
- Medical & Health
- Emerging & Other (fallback)

Each sector has a short keyword list used to score paper text from:

- title
- abstract
- topics

## Coarsening flow

1. Run Louvain on clean links to get raw communities.
2. For each raw community, infer sector votes from member papers.
3. Assign dominant sector if confidence >= 0.5.
4. Otherwise assign fallback sector.
5. Map sector keys to deterministic integer IDs for storage.

Result:

- top-level community IDs become macro-sector IDs
- top-level community labels become broad sector labels

## Why this helps

- Reduces over-segmentation and singleton top clusters
- Keeps broad domains clear for navigation
- Retains automatic paper-to-paper links and topic detail downstream

## Tuning knobs

All tuning currently lives in `graph.py` for simplicity.

### `MACRO_SECTORS`

Edit keyword lists to improve sector matching precision/recall.

### Dominance threshold (currently `0.5`)

In `_coarsen_to_macro_sectors`, raise threshold to get fewer sector assignments and more fallback,
or lower it to force stronger consolidation.

### Fallback bucket

`Emerging & Other` intentionally catches weak or mixed raw communities.

## Recommended evaluation after each run

1. Number of raw communities vs macro sectors in logs
2. Share of papers in fallback bucket
3. Cluster size distribution in top-level graph
4. Manual spot-check of 10-20 papers near sector boundaries

## Suggested next step

If needed, add a lightweight external config (JSON/YAML) for sector keywords so non-developers can tune labels without editing Python code.
