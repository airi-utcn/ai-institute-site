# Paper Graph Operations

This is the runbook for `research-paper-graph`. It replaces the older links to
`paper-graph-generation.md` and `paper-sync-cli-guide.md`, which are no longer
in the repository.

## What the pipeline owns

The pipeline has three jobs:

1. **Author coverage** — resolve `importEligible` people to OpenAlex author IDs
   and import their works into Strapi `Publication` records.
2. **Metadata enrichment** — title, DOI, year, topics, authors, kind, abstract,
   and (where possible) a PDF.
3. **Graph rebuild** — embeddings, similarity links, macro/meso placement, and
   quality diagnostics for every `graphEligible` publication.

Strapi is the editorial source of truth. Graph outputs (links, macro/meso
relations, embeddings) are derived and can be rebuilt.

## Run modes

```bash
# Normal sync (all importEligible people)
python main.py

# One person / one institution
python main.py --person "Adrian Groza"
python main.py --institution "Technical University of Cluj-Napoca"

# Metadata only, no PDF downloads
python main.py --skip-pdf

# Fetch + evaluate the graph, do not write anything to Strapi
python main.py --dry-run --skip-pdf

# Rebuild links/macros/mesos from the current corpus (no import, no PDFs)
python main.py --graph-only

# Read-only health report
python main.py --doctor
python main.py --doctor --doctor-json
```

`--limit N` is for debugging; it truncates the fetched paper list but still
rebuilds the graph from the complete Strapi corpus.

## Concurrency

Runs take an advisory file lock at `outputs/.paper-sync.lock` (override with
`PAPER_SYNC_LOCK_PATH`). A second run exits immediately unless `--wait-for-lock`
is passed. Do not remove the lock file while a run is active; the file itself is
harmless when no process holds the lock.

## Author identity

- `Person.openAlexAuthorId` pins an author. When present, the pipeline never
  re-searches by name.
- If it is empty, the pipeline searches OpenAlex with the configured
  `OPENALEX_INSTITUTION_ID` (UTCN: `I158333966`) and stores the resolved ID.
- `Person.orcid` is stored when known.
- `Import people without a portrait cannot be pinned` because the Person schema
  requires a portrait. Add a portrait, then run the sync again.
- If a person has no OpenAlex match, fix the name or set the ID manually in
  Strapi. The doctor reports both cases.

## Coverage and OA

`PAPER_IMPORT_OA_ONLY` defaults to `false`: metadata is imported for all works,
and PDF enrichment is attempted separately. Set it to `true` to reproduce the
old behaviour of importing only open-access works. Non-OA publications still
get a DOI/publisher link on the publication page.

## PDFs

PDF success is best-effort. The pipeline:

- prefers OpenAlex `best_oa_location` / `locations` PDF URLs;
- retries transient network failures and upgrades `http` to `https`;
- uploads the PDF only **after** the publication record exists;
- deletes the uploaded media if attaching it fails, so failed creates cannot
  leave orphan files.

Many publishers block automated downloads (MDPI, SSRN, Elsevier, IEEE). Those
papers are still in the corpus and link to their DOI. Do not treat a missing PDF
as a missing publication.

## Graph semantics

- `graphEligible` controls inclusion. Ingestion sets it to `true` for automated
  records; editors control it for manual records.
- **Similarity links** are cosine similarity over `title + abstract`, falling
  back to `title + topics` when no abstract exists.
- **Duplicates** are only collapsed when records share an identity key
  (OpenAlex ID, DOI, normalized title, or document id). A high cosine score
  alone is a *near-duplicate* and stays in the graph.
- **`isCrossCluster`** is written from the editorial macro assignment, so it
  matches the macro/meso views. It is no longer based on HDBSCAN communities.
- **Meso names** are not globally unique. Mesos are keyed by macro-scoped slug
  (`sc-<macro>-<cluster>`). Unused pipeline-generated mesos are pruned after
  assignment.
- HDBSCAN communities remain a diagnostic; the UI navigates by macro/meso.

## Health checks after a run

Run `python main.py --doctor` and check:

- graph-eligible vs embedded (missing abstracts should be zero or explained);
- isolated graph papers;
- `crossFlagMismatch` (must be 0);
- duplicate titles/DOIs/OpenAlex IDs;
- people with no publications;
- importEligible people without an OpenAlex ID;
- mesos without publications;
- unattached PDFs in the media library.

Each run also writes `outputs/sync_report_<runId>.json` with counts and the list
of failures (including Strapi response bodies).

## Environment

| Variable | Default | Purpose |
|---|---|---|
| `STRAPI_HTTP_TIMEOUT` | `60` | Strapi request timeout (seconds) |
| `STRAPI_HTTP_RETRIES` | `2` | Retries for 429/5xx |
| `OPENALEX_HTTP_TIMEOUT` | `30` | OpenAlex request timeout |
| `OPENALEX_HTTP_RETRIES` | `3` | OpenAlex retries |
| `OPENALEX_MAILTO` | empty | Polite-pool contact |
| `OPENALEX_INSTITUTION_ID` | empty | Institution filter for author search |
| `PAPER_IMPORT_OA_ONLY` | `false` | Import only OA works |
| `PAPER_SYNC_LOCK_PATH` | `outputs/.paper-sync.lock` | Advisory lock path |
| `PDF_MAX_BYTES` | `10485760` | Max PDF download size |

Graph tuning variables are unchanged: `GRAPH_SIMILARITY_THRESHOLD`,
`GRAPH_DUPLICATE_THRESHOLD`, `GRAPH_AI_MODEL`, the HDBSCAN settings, and
`GRAPH_SECONDARY_CLUSTER_DISTANCE_THRESHOLD`.
