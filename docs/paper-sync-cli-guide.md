# Paper Sync CLI Guide

This document describes the current command-line interface for the research paper sync tool, what each option does in practice, and which options have caveats or overlapping behavior.

The authoritative runtime surface is:

```bash
python main.py --help
```

## Command Shape

The script entrypoint is:

```bash
python main.py [options]
```

The CLI orchestrates four broad stages:

1. fetch a source batch
2. run a preview graph build on that batch
3. sync publications into Strapi unless upload is skipped
4. rebuild the global graph from all `graphEligible` Strapi publications unless graph work is skipped

## Source Selection Options

### `--mode`

Chooses the input source.

Supported values:

- `institution`
- `author`
- `strapi-people`
- `file`

Default: `institution`

### `--institution`

Required for `--mode institution` in non-interactive runs.

The tool looks up the institution in OpenAlex and then fetches its works.

### `--author`

Required for `--mode author` in non-interactive runs.

The tool resolves the author in OpenAlex and then fetches that author's works.

### `--author-institution`

Optional institution filter used when resolving an author in OpenAlex.

This is most useful when author names are ambiguous.

It is also used in `strapi-people` mode, where each Strapi person name is resolved against OpenAlex one by one.

### `--file`

Required for `--mode file` in non-interactive runs.

Loads a local JSON snapshot of papers instead of calling OpenAlex.

## Fetch Cache Options

### `--use-fetch-cache`

Reuse a completed fetch cache or resume an incomplete OpenAlex fetch cache when available.

This is strongly recommended for large author or institution fetches.

### `--refresh-fetch-cache`

Ignore any existing fetch cache and rebuild it from scratch.

This is useful if the cached OpenAlex result is stale or corrupted.

### `--fetch-cache-file`

Override the default cache path.

Behavior notes:

- in `author` and `institution` modes, this is the exact cache file path
- in `strapi-people` mode, the CLI now appends a per-person suffix so multiple people do not overwrite the same cache file

## Sync Control Options

### `--update-existing`

If a publication already exists in Strapi, update machine-owned fields instead of skipping it.

Without this flag, existing publications are matched and left unchanged.

### `--upload-pdfs`

If a paper has an Open Access PDF URL, download it and upload it into Strapi's media library when creating new publications.

This does not retroactively attach PDFs to already existing publications unless they are recreated.

### `--skip-upload`

Do not write publications to Strapi.

Important behavior:

- the source batch is still fetched
- the preview graph build is still performed
- local debug artifacts are still written
- the run exits before publication sync and before the global graph rebuild

This is useful for inspecting a source batch locally.

### `--dry-run`

Do not write to Strapi.

Current behavior is close to `--skip-upload`, with one important caveat: local outputs are still written.

That means `--dry-run` is not a zero-side-effect mode. It means "no Strapi writes", not "no filesystem writes".

## Graph Control Options

### `--skip-graph`

Skip both graph-generation phases.

Current behavior is broader than the old help text implied. It skips:

- preview duplicate screening
- preview embedding generation
- preview link generation
- global graph rebuild
- community detection
- graph-link replacement
- graph metadata updates

Practical implication:

When this flag is enabled, duplicate filtering in the fetched batch is also bypassed, so more papers may be uploaded than in a normal run.

### `--skip-communities`

Disable Louvain community detection.

Embeddings and similarity links are still computed. Only community assignment and community labels are skipped.

### `--similarity-threshold`

Override the default similarity threshold used for edge creation.

Lower values create more links. Higher values create fewer links.

### `--duplicate-threshold`

Override the threshold used to treat a highly similar pair as a duplicate candidate.

Higher values make duplicate resolution more conservative.

### `--model`

Override the embedding model name.

Changing the model invalidates reuse of previously stored embeddings because `embeddingModel` will no longer match.

### `--top-k`

Controls how many nearest neighbors per paper are retained when FAISS is active.

This does not affect the brute-force fallback path in the same way, because brute-force evaluates all pairs.

### `--community-resolution`

Louvain resolution parameter.

Higher values generally produce more, smaller communities. Lower values generally produce fewer, larger communities.

## Run Scope Options

### `--limit`

Limit the fetched source batch before upload.

Important nuance:

This does not limit the final global rebuild corpus directly. After upload, the tool still reloads all `graphEligible` publications from Strapi and rebuilds the graph from that full eligible set.

So `--limit` is mostly a fetch-and-sync throttle, not a true "global graph size" limit.

### `--verbose` or `-v`

Enable debug-level logging.

### `--interactive` or `-i`

Run the legacy prompt flow.

This is mainly a convenience wrapper around the same flags and modes. It is still usable, but the project now clearly prefers direct CLI invocation for repeatable runs.

## Recommended Usage Patterns

### Import a single author

```bash
python main.py --mode author --author "Adrian Groza" --use-fetch-cache --update-existing
```

### Import all current Strapi people

```bash
python main.py --mode strapi-people --use-fetch-cache --update-existing
```

### Inspect a local snapshot without touching Strapi

```bash
python main.py --mode file --file outputs/papers_strapi_people.json --skip-upload
```

### Rebuild from a fresh OpenAlex fetch

```bash
python main.py --mode institution --institution "Technical University of Cluj-Napoca" --refresh-fetch-cache --update-existing
```

## Current Findings And Caveats

These are the main option-level observations from the current codebase.

### `--skip-graph` is broader than its original wording suggested

It does not just skip final link upload. It disables the entire graph path, including preview duplicate screening.

### `--dry-run` and `--skip-upload` overlap heavily

Both avoid Strapi writes after the preview stage.

Current difference in practice is mostly intent and messaging, not a radically different execution path. If the CLI is simplified later, these two options are candidates for consolidation.

### `--dry-run` still writes local artifacts

This is easy to misread from the name alone. The script still writes local snapshots and preview artifacts under `outputs/`.

### `--limit` only constrains the fetched batch

Because the final graph is rebuilt from all eligible Strapi publications, `--limit` is not a reliable way to reduce final graph complexity once Strapi already contains a large corpus.

### `--fetch-cache-file` used to be unsafe in `strapi-people` mode

When reused for multiple people, a single explicit cache path could cause collisions. The CLI now derives per-person cache files from the override path in that mode.

### `--interactive` is legacy, not the primary interface

It still works, but direct flags are easier to reproduce, script, and document.

## Recommended Defaults

For real sync runs, the safest general-purpose starting point is:

```bash
python main.py --mode strapi-people --use-fetch-cache --update-existing
```

Add these only when needed:

- `--author-institution` if OpenAlex author resolution is ambiguous
- `--refresh-fetch-cache` if you intentionally want to discard cached OpenAlex progress
- `--upload-pdfs` if you want media ingestion as part of the same run
- `-v` if you are debugging matching, caching, or graph generation details