# Paper Graph Refactor Plan

## Purpose

This document defines what will be built for the research paper import and graph pipeline, why the design is changing, and in what order the work will be executed.

It is intended to serve two purposes:

- shared implementation agreement
- execution checklist for the incremental refactor

## Current Problems

The current Python pipeline works, but it has structural limitations that will make future changes risky:

- graph links are modeled incorrectly for a true graph in Strapi
- imported and curated publication data are not clearly differentiated
- duplicate handling is automatic but not deterministic
- graph rebuild logic is mixed together with fetching and upload logic
- unverified imported works would currently be hard to expose differently across frontend surfaces
- embeddings are only saved to local output files, not to the CMS-managed data model

## Goals

The refactor will support the following product and technical goals:

- imported researcher works should appear in the global graph without manual approval
- imported but unverified works should be visible in graph and search
- imported but unverified works should not appear on the public publications listing page
- the graph should be global across all eligible publications
- rerunning the importer should recompute links and communities globally
- duplicate resolution should remain fire-and-forget, but be more reliable and deterministic
- embeddings should be stored through Strapi-managed schema fields
- all schema and content changes must go through Strapi-supported mechanisms rather than direct database edits

## Architecture Decision

### Canonical Record

`Publication` will remain the single canonical record for works that participate in the graph.

`Paper` will not be used as the primary staging model for graph generation.

Reasoning:

- the graph is global, so splitting graph-bearing records between `Paper` and `Publication` adds unnecessary complexity
- imported works need to be available immediately in graph and search
- a separate staging workflow would create operational overhead without solving the visibility problem well

### Differentiating Imported and Curated Data

Imported and curated records will be differentiated through metadata on `Publication`, not through a separate canonical content type.

The model will distinguish:

- provenance
- verification state
- graph visibility
- listing visibility

This avoids a simplistic approval boolean and makes it possible to keep imported records available without flooding the public publications listing.

### Graph as Derived Data

`GraphLink` will be treated as derived data.

It will be rebuilt from the current global eligible publication set whenever the graph pipeline runs.

Implications:

- links are not curated editorial data
- reruns replace the graph state rather than patching it incrementally
- deleted, excluded, or newly imported publications are naturally reflected on rebuild

## Target Data Model

### Publication

The `Publication` content type will be extended with metadata needed for provenance, eligibility, and graph indexing.

Planned fields:

- `sourceKind`: enumeration or string such as `manual`, `openalex`, `merged`
- `verificationStatus`: enumeration such as `imported`, `reviewed`, `curated`
- `graphEligible`: boolean
- `listingEligible`: boolean
- `lastImportedAt`: datetime
- `lastGraphIndexedAt`: datetime
- `embeddingModel`: string
- `embeddingUpdatedAt`: datetime
- `embeddingSourceHash`: string
- `embedding`: json
- `rawImportMetadata`: json

Behavioral rules:

- imported works default to `graphEligible = true`
- imported works default to `listingEligible = false`
- reviewed or curated works may later become `listingEligible = true`
- graph and search use `graphEligible`
- publications listing uses `listingEligible`

### GraphLink

The `GraphLink` content type must be changed immediately.

Current issue:

- both `source` and `target` are modeled as one-to-one relations, which does not support a graph with many edges per publication

Target model:

- `source`: many-to-one relation to `Publication`
- `target`: many-to-one relation to `Publication`
- each publication may have many outgoing and incoming links

This change is a prerequisite for correct graph behavior.

## Ownership Rules

Imports must not overwrite curated editorial work.

### Machine-owned fields

These can be updated by import runs:

- `openAlexId`
- `doi`
- `year`
- `cited_by`
- `abstract`
- `topics`
- import metadata fields
- embedding fields
- graph and community fields

### Editor-owned fields

These should not be overwritten by import runs:

- `description`
- `themes`
- `projects`
- `resources`
- manually attached assets other than automated PDF imports if explicitly chosen
- listing-related editorial controls

### Mixed ownership

`authors` needs explicit merge policy.

The import pipeline may suggest or match authors automatically, but it should not blindly destroy curated author relations.

## Rebuild Strategy

Each import cycle will have two distinct phases.

### Phase A: Publication Sync

- fetch and normalize works from OpenAlex
- upsert imported works into `Publication`
- apply field ownership rules
- mark provenance and verification metadata

### Phase B: Global Graph Rebuild

- load all `graphEligible` publications
- compute or refresh embeddings for the current model
- resolve duplicates using deterministic policy
- compute similarity links globally
- compute communities globally
- replace graph links in Strapi
- write community and embedding metadata back to publications

The graph is therefore a deterministic derived view of the current eligible publication set.

## Duplicate Resolution Strategy

Duplicate handling remains automatic, but the policy must become deterministic.

Instead of depending on iteration order, canonical selection will use stable ranking rules such as:

- curated or manual record wins over imported record
- existing canonical record wins over a new conflicting imported record
- record with DOI wins over one without DOI
- record with richer metadata wins over a sparse record
- record with more editorial relationships wins over an isolated record

Possible additional metadata:

- duplicate-of reference
- duplicate confidence
- duplicate resolution reason

These are optional but useful for debugging.

## Embedding Strategy

Embeddings will be stored through Strapi-managed fields.

Initial implementation:

- store the current embedding in a JSON field on `Publication`
- store model name and timestamps alongside it

Invalidation rules:

- if `title` changes, embedding becomes stale
- if `abstract` changes, embedding becomes stale
- if the embedding model changes, embedding becomes stale

Stale embeddings are recomputed during the next rebuild.

This is the safest first step because it stays within Strapi-managed schema changes and avoids unsupported direct database manipulation.

## Frontend Visibility Rules

The frontend must separate graph/search visibility from publication listing visibility.

### Publications page

- show only `listingEligible = true`

### Graph page

- show all `graphEligible = true`

### Search

- search all `graphEligible = true`
- optionally surface provenance or verification badges in results later

## Refactor Structure for Python Code

The current Python scripts will be refactored into clearer layers.

### Source layer

- OpenAlex fetch
- raw response normalization

### Domain layer

- publication payload model
- duplicate candidate model
- graph edge model
- rebuild result model

### Persistence layer

- Strapi read adapter
- Strapi upsert adapter
- graph replacement adapter

### Graph layer

- embedding generation
- similarity calculation
- duplicate scoring and canonical selection
- community detection

### Orchestration layer

- publication sync workflow
- global graph rebuild workflow
- structured progress and result reporting

The CLI remains only as a thin wrapper.

## Execution Plan

The implementation will proceed in small, validated steps.

## Progress

Completed:

- GraphLink schema changed to support many edges per publication
- Publication schema extended with provenance, visibility, and embedding metadata fields
- Public publication listing queries now use `listingEligible`
- Graph queries now use `graphEligible`
- Static hand-maintained search data replaced by a server-generated search index endpoint
- Search now renders directly on `/search` without redirecting to `/search/classic`
- Navbar search now shows live suggestions from the same search index
- Python runtime settings and paper source selection logic extracted from `main.py`
- Python graph artifact generation and Strapi sync loops extracted from `main.py`
- Python CLI moved into the package and `main.py` is now only a thin wrapper
- Package-local OpenAlex and graph modules now back the refactored package layers
- Package-local Strapi client now backs the sync layer, removing the last runtime dependency on legacy top-level modules
- Publication sync now enforces machine-owned import fields and additive author merges without overwriting curated editorial relations
- Duplicate resolution now uses deterministic canonical selection over duplicate groups
- Graph rebuild now reloads all graph-eligible publications from Strapi and replaces derived graph links globally
- Global rebuild now persists embeddings and graph metadata back into Strapi-managed publication fields
- OpenAlex fetches now write resumable local cache files and can resume from the last saved cursor on demand
- Default import runs are now unlimited unless an explicit `--limit` is provided
- The importer can now seed from Strapi people directly, fetching OpenAlex works name by name and force-linking imported publications back to those people

In progress:

- Operational usage notes and edge-case hardening

Not started:

- Optional cleanup of stale local artifact files if they are no longer needed operationally

### Step 1

Status: completed

Fix the `GraphLink` schema so it supports a real graph.

### Step 2

Status: completed

Validate the Strapi schema state after the graph-link change.

### Step 3

Status: completed

Extend `Publication` with provenance, eligibility, and embedding fields.

### Step 4

Status: completed in frontend query layer and search UX

Update frontend queries so:

- publications page excludes imported unverified records
- graph and search include graph-eligible records

### Step 5

Status: completed

Refactor the Python pipeline into importable modules without changing behavior yet.

### Step 6

Status: completed

Add field ownership rules to publication upsert logic.

### Step 7

Status: completed

Replace the current duplicate logic with deterministic canonical selection.

### Step 8

Status: completed

Implement full global graph rebuild behavior over all graph-eligible publications.

### Step 9

Status: completed

Store embeddings and graph metadata in Strapi-managed fields.

### Step 10

Status: completed

Update documentation and operational usage notes.

## Operational Notes

Detailed graph-generation mechanics are documented in [docs/paper-graph-generation.md](/home/shumy/Projects/ai-institute-site/docs/paper-graph-generation.md).

Current pipeline behavior:

- fetch a source batch from OpenAlex or a local file
- optionally fetch by iterating over Strapi people one by one instead of relying on a single institution search
- upsert imported publications with machine-owned field updates only
- merge matched authors additively with any existing curated author relations
- merge seeded Strapi people into imported publication authors so fetched works appear under those people on the site
- reload all `graphEligible` publications from Strapi after sync
- rebuild duplicates, links, communities, and embeddings from that global set
- replace all existing graph links with the rebuilt link set
- persist embedding and graph metadata back to `Publication`

Operational caveats:

- publications without abstracts remain `graphEligible` records but will not receive embeddings until sufficient text exists
- local files in `outputs/` are now debug artifacts rather than the primary source of truth
- local files in `outputs/fetch-cache/` are resumable OpenAlex source caches and can be reused or refreshed explicitly
- graph-derived fields are treated as replaceable machine-owned data and may be cleared on rebuild when no current derived value exists

Interactive workflow changes:

- interactive mode no longer asks whether to generate links or upload to Strapi; the default interactive path now assumes a real sync and rebuild run
- interactive mode now asks whether to reuse or resume cached OpenAlex fetches and whether to force-refresh that cache

## Out of Scope for This Phase

The following are explicitly deferred:

- Strapi admin panel controls for running imports
- manual duplicate review workflow
- direct database manipulation or custom unmanaged SQL schema changes
- large-scale storage optimization for embeddings beyond Strapi-managed fields

## Completion Criteria

This refactor phase is complete when all of the following are true:

- graph links support many edges per publication
- imported publications are distinguishable from curated publications
- unverified imported publications are excluded from the publications listing
- imported publications remain visible in graph and search
- rerunning the pipeline rebuilds graph links and communities globally
- embeddings are stored in Strapi-managed publication fields
- duplicate handling is automatic and deterministic
- the Python code is split into maintainable layers with a thin CLI entrypoint
