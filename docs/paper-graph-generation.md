# Paper Graph Generation

This document explains how the research paper graph is generated today, what is computed in each phase, and what is not currently optimized.

It exists to answer two practical questions:

- when are embeddings generated
- when are links and communities generated

## Short Answer

Within one graph build, embeddings are generated once for the papers in that build.

After that, similarity scores are computed between each paper embedding and the rest of the papers in that same build.

So the intended model is:

1. build embeddings for the current paper set
2. compare those embeddings against the rest of that same set
3. derive links, duplicates, and communities from those comparisons

What makes a full import run look like the model is loaded and papers are encoded twice is that the CLI currently performs two separate graph builds in one run:

1. a preview build on the freshly fetched import batch
2. a final global build on all `graphEligible` publications loaded back from Strapi

Those are two different paper sets for two different purposes.

## End-to-End Pipeline

The high-level orchestration lives in [research-paper-graph/research_paper_graph/cli.py](/home/shumy/Projects/ai-institute-site/research-paper-graph/research_paper_graph/cli.py).

### Phase 1: Source Fetch

The run starts by fetching a source paper batch through `fetch_papers(...)`.

Possible source modes include:

- institution lookup in OpenAlex
- author lookup in OpenAlex
- Strapi people seeded lookup, where each Strapi person is resolved to an OpenAlex author and fetched separately
- local JSON file replay

At this point the result is just a list of normalized paper dictionaries. No graph structure exists yet.

### Phase 2: Preview Graph Build

Immediately after fetch, the CLI calls `build_graph_artifacts(...)` on the fetched batch. This happens in [research-paper-graph/research_paper_graph/cli.py](/home/shumy/Projects/ai-institute-site/research-paper-graph/research_paper_graph/cli.py#L83).

This preview build is used primarily to:

- identify duplicates inside the newly fetched batch
- skip duplicate records before upload
- emit local debug artifacts such as `outputs/index_<label>.json` and `outputs/communities_<label>.json`

This is not the final site graph.

### Phase 3: Publication Sync

After duplicate screening, the non-duplicate papers are synced into Strapi.

This step:

- creates or updates `Publication` entries
- preserves editor-owned fields
- updates machine-owned import fields
- merges author relations additively
- force-links seeded Strapi people when using `strapi-people`

Still, no final graph is published yet.

### Phase 4: Global Graph Rebuild

After sync, the pipeline reloads all `graphEligible` publications from Strapi and runs `build_graph_artifacts(...)` again on that global set. This happens in [research-paper-graph/research_paper_graph/cli.py](/home/shumy/Projects/ai-institute-site/research-paper-graph/research_paper_graph/cli.py#L110).

This second build is the real graph rebuild used to update the site.

This phase is responsible for:

- the final duplicate state for the current eligible corpus
- the final similarity links written to `GraphLink`
- the final community assignments
- the final embedding payloads written back to `Publication`

If you only remember one thing, it should be this:

The graph that matters is the post-sync global rebuild, not the pre-sync preview build.

## What `build_graph_artifacts(...)` Actually Does

The orchestration for one graph build lives in [research-paper-graph/research_paper_graph/pipeline.py](/home/shumy/Projects/ai-institute-site/research-paper-graph/research_paper_graph/pipeline.py).

For a single input paper set, it performs these operations in order:

1. call `generate_links(...)`
2. save a local embedding index file for debugging
3. build Strapi embedding payloads
4. run community detection on non-duplicate links
5. save local community artifacts for debugging
6. return a `GraphArtifacts` object containing links, duplicate IDs, communities, labels, filtered papers, embeddings, and embedding payloads

That means link generation, duplicate detection, and community detection all happen inside one build over one paper set.

## What `generate_links(...)` Actually Does

The core mechanics live in [research-paper-graph/research_paper_graph/graph.py](/home/shumy/Projects/ai-institute-site/research-paper-graph/research_paper_graph/graph.py).

### Step 1: Filter Papers That Have Usable Text

`build_embeddings(...)` starts by filtering the input set to only papers that have an abstract.

That means:

- papers without abstracts remain in Strapi and may still be `graphEligible`
- but they are excluded from embedding generation
- therefore they also cannot receive similarity links in that build

This is why the log can say things like:

- `Fetched 153 papers`
- `Encoding 137 papers`

The missing papers are typically records without an abstract.

### Step 2: Generate Embeddings Once For That Build

`build_embeddings(...)` creates one embedding per filtered paper by concatenating:

- title
- abstract

The exact text shape is effectively:

`"<title> <abstract>"`

Those strings are encoded with SentenceTransformers.

Important distinction:

- embeddings are not generated once globally for all time
- embeddings are generated once per graph build for the paper set used by that build

For the global rebuild, the current system now reuses previously stored Strapi embeddings when both of these still match the current paper content:

- `embeddingModel`
- `embeddingSourceHash`

Only missing or stale papers are re-encoded in that build.

The preview build does not usually get that benefit, because freshly fetched source papers generally do not yet carry Strapi-managed embedding metadata.

The code also avoids reloading the Python model twice in one process by caching the `SentenceTransformer` instance in [research-paper-graph/research_paper_graph/graph.py](/home/shumy/Projects/ai-institute-site/research-paper-graph/research_paper_graph/graph.py#L12).

### Step 3: Normalize Embeddings

After encoding, each embedding vector is normalized to unit length in [research-paper-graph/research_paper_graph/graph.py](/home/shumy/Projects/ai-institute-site/research-paper-graph/research_paper_graph/graph.py#L37).

This matters because once vectors are unit-normalized, inner product is equivalent to cosine similarity:

$$
\text{cosine}(a, b) = a \cdot b
$$

as long as $\|a\| = 1$ and $\|b\| = 1$.

That normalization is what allows the FAISS inner-product index to behave as a cosine-similarity search.

### Step 4: Compare Each Paper Against The Whole Build Set

After embeddings exist, the code computes cross-paper similarity using a brute-force approach.

The pipeline computes the dense similarity matrix directly using:

$$
S = E E^T
$$

where $E$ is the matrix of normalized embeddings.

The code evaluates every pair `(i, j)` with `i < j` and keeps those above `similarity_threshold`.

So this is the true full pairwise comparison path.

The flow is:

1. generate or reuse embeddings for the current build set
2. normalize those vectors to unit length
3. compute the full similarity matrix
4. iterate through all pairs and convert to similarity links above threshold

## Duplicate Detection

Duplicate detection is not a separate embedding pass.

It is derived from the same similarity search used to build edges.

The rule is:

- if a paper pair has score `>= duplicate_threshold`, it is treated as a duplicate candidate pair

Those duplicate candidate pairs are collected while links are being generated.

After link enumeration, `_resolve_duplicate_groups(...)` builds connected components across duplicate pairs.

This matters because duplicates are not treated only pairwise. If A duplicates B and B duplicates C, the code treats them as a duplicate group.

Then `_choose_canonical_paper(...)` selects the canonical member of each group using `_paper_rank_tuple(...)`.

Current ranking preferences are:

1. has DOI
2. longer abstract
3. more topics
4. more authors
5. higher citation count
6. longer title
7. lexicographically larger OpenAlex ID as final tie-breaker

All non-canonical members become duplicate paper IDs.

Finally, every generated link is marked with `is_duplicate = True` if either endpoint is a duplicate member.

That means duplicate links are not generated by a separate algorithm; they are regular similarity links annotated after canonical duplicate resolution.

## Community Detection

Community detection is another downstream use of the already generated links and embeddings.

It does not trigger another encoding pass.

Louvain does not operate directly on the embedding vectors.

Instead, it operates on the weighted similarity graph that was already built from those embeddings.

Then it runs Louvain with a fixed seed for stability.

The output is:

- `communities`: paper ID to community ID
- `community_labels`: community ID to human-readable label based on top topics in that cluster

So communities are built from the final clean link graph, not directly from embeddings alone.

The flow is:

1. embeddings produce similarity links via brute-force comparison
2. non-duplicate similarity links become weighted graph edges
3. Louvain partitions that weighted graph into communities

## Embeddings Versus Links

This was the main point of confusion, so it is worth stating directly.

Embeddings and links are separate layers.

### Embeddings

Embeddings are vector representations of paper text.

They are produced from:

- title
- abstract

They are stored back to Strapi as publication metadata through `build_embedding_payloads(...)`.

### Links

Links are derived relationships between pairs of papers.

They are produced from similarity comparisons between embeddings.

They depend on:

- which papers are included in the current build
- `similarity_threshold`
- `duplicate_threshold`

So links are not stored inside the embedding. They are computed from the embedding set for the current build.

## Are We Re-encoding Everything Unnecessarily?

The honest answer is: partially, yes.

### What is already correct

For one graph build, the code does the correct conceptual thing:

1. generate embeddings once for the papers in that build
2. compare those embeddings across that build's full candidate set
3. derive duplicates, links, and communities from those comparisons

That part matches the intended design.

### What is currently redundant

At the run level, the CLI performs two builds:

1. preview build on the fetched batch
2. global rebuild on the Strapi graph-eligible set

So papers that appear in both sets may be encoded twice in the same run.

The global rebuild now reuses stored Strapi embeddings when both of these still match the current paper content:

- `embeddingModel`
- `embeddingSourceHash`

Only papers with missing or stale embeddings are re-encoded during that build.

The preview build on freshly fetched source papers may still encode everything, because those source records usually do not yet carry Strapi-managed embedding metadata.

## What Gets Stored Back To Strapi

After the global rebuild, the pipeline writes back two kinds of derived state.

### Publication metadata

For each paper that received an embedding, the pipeline persists:

- `embedding`
- `embeddingModel`
- `embeddingUpdatedAt`
- `embeddingSourceHash`
- `lastGraphIndexedAt`
- `community`
- `communityLabel`

This is built in `build_embedding_payloads(...)` and combined into publication patches later in the sync layer.

### Graph links

For non-duplicate links from the global rebuild, the pipeline replaces the derived `GraphLink` records in Strapi.

That means the current graph in Strapi is always treated as a rebuilt derived view of the current eligible publication set.

## Why The Logs Show Two Encodes

Using the example run:

1. `Encoding 137 papers...`
   This is the preview build on the newly fetched `strapi-people` import batch.

2. `Encoding 117 papers...`
   This is the global rebuild on all `graphEligible` Strapi publications after sync.

Those are not the same build and not exactly the same paper set.

The second one is the graph that matters for the site.

## Current Limitations

The current implementation is intentionally simpler than an incremental graph engine.

Known limitations:

- embeddings are reused only when the current build is operating on Strapi-loaded publications with matching `embeddingModel` and `embeddingSourceHash`
- the preview build and global build may both encode overlapping papers in the same run
- papers without abstracts cannot participate in similarity or communities
- local `outputs/index_*.json` files are debugging artifacts, not the source of truth

## Practical Mental Model

If you need a reliable mental model, use this one:

1. fetch candidate papers
2. preview-build embeddings and links only to screen duplicates in the incoming batch
3. sync survivors into Strapi
4. reload the full eligible publication corpus from Strapi
5. rebuild embeddings for that global corpus
6. compute similarity links across that global corpus
7. resolve duplicates and communities from that global result
8. write graph metadata and graph links back to Strapi

That is the current system.

## Future Optimization Direction

If the pipeline is optimized further, the most likely next improvement is not changing the graph math. It is expanding embedding reuse beyond the current global Strapi rebuild so that more of the preview-path work can also avoid re-encoding unchanged papers.

That would preserve the same graph semantics while removing redundant embedding work.