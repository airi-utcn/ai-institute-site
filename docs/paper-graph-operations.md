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

Runs take an advisory file lock at `/var/run/paper-sync/sync.lock` (override
with `PAPER_SYNC_LOCK_PATH`). The container uses a small named volume so cron
and `docker compose run` invocations share the same lock. A second run exits
immediately unless `--wait-for-lock` is passed. The lock file is harmless when
no process holds it.

## Exclusions

Deleting a publication is not durable on its own: the next import will create it
again. Use **Graph Exclusion** (`GraphExclusion` in Strapi) for papers that must
stay out:

| Field | Meaning |
|---|---|
| `label` | Human-readable note |
| `openAlexId`, `doi`, `title` | Matching keys; exact match only |
| `scope` | `graphOnly` or `hideEverywhere` |
| `reason` | Optional editorial note |
| `isActive` | Toggle the exclusion without deleting it |

- `graphOnly` removes the paper from graph rebuilds but leaves the publication
  page visible.
- `hideEverywhere` also unpublishes the record, so it disappears from the public
  listing, detail pages, author pages, project pages, and graph search.
- Both scopes stop the importer from re-creating the paper.
- Deactivating an exclusion does not automatically republish a hidden record;
  republish it in Strapi when it should return.
- Existing records are updated on the next run before the graph is rebuilt.
  The `hideEverywhere` scope uses Strapi's document-service unpublish action, so
  cached page data should be revalidated by the normal web deployment.

For an existing paper that should keep its page but leave the graph, toggling
`Publication.graphEligible` off is still the right switch. The importer no
longer republishes an existing automated record, so an editorial unpublish is
respected across runs.

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
- **Meso counts** show `primary / tagged`. The node size uses the primary
  partition; the detail page opens the primary set by default and has an
  `ALL TAGGED` toggle for the wider membership.
- **Paper-level views** use a link-aware layout and zoom-dependent labels, so
  large mesos stay readable without changing the underlying graph. Connected
  components are packed as separate islands, which keeps unrelated papers near
  the graph instead of pushing them to the canvas edge.
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
- unattached PDFs in the media library;
- active exclusions, exclusions with no or multiple matches, exclusions still
  graph-eligible, and `hideEverywhere` exclusions that are still published.

Runs write their counts and failure details to the structured container logs
(`docker compose logs paper-sync`). There are no JSON artifacts on disk; use
`python main.py --doctor --doctor-json` when a machine-readable health snapshot
is needed.

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
| `PAPER_SYNC_LOCK_PATH` | `/var/run/paper-sync/sync.lock` | Advisory lock path |
| `PDF_MAX_BYTES` | `10485760` | Max PDF download size |

Graph tuning variables are unchanged: `GRAPH_SIMILARITY_THRESHOLD`,
`GRAPH_DUPLICATE_THRESHOLD`, `GRAPH_AI_MODEL`, the HDBSCAN settings, and
`GRAPH_SECONDARY_CLUSTER_DISTANCE_THRESHOLD`.

The Strapi API token used by `paper-sync` must be able to read
`GraphExclusion`, update `Publication`, and call the publication unpublish
route. A full-access token satisfies all three.
