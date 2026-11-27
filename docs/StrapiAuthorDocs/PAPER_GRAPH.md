# Paper Graph Author Guide

This guide explains the graph-related Strapi fields and how editors, authors, and maintainers should use them. It is part of the [Strapi author docs](./README.md).

The key idea is simple:

- `importEligible` controls whether a person is used by the Python import pipeline.
- `graphEligible` controls whether a publication is included in the graph rebuild.
- `sourceKind=manual` means the record is editor-owned and should not be overwritten by the import pipeline.
- Macro and meso relations are mostly pipeline-managed for automated publications.

## 1. The Two Main Switches

### Person: `importEligible`

Location: `Person`

Default: `false`

What it does:

- When `importEligible` is enabled, the Python pipeline may use that person as an import source.
- If it is disabled, the person is ignored by author-based imports.

Use this for:

- researchers who should be synced from OpenAlex or other source systems
- people who should not trigger paper imports, such as administrative staff or profiles that are not part of the publication workflow

Important:

- This field does not control whether a person appears on the site.
- It only controls whether the import pipeline treats the person as a valid source.

### Person: `openAlexAuthorId` and `orcid`

Location: `Person`

What they do:

- `openAlexAuthorId` pins the person to one OpenAlex author identity. Once set, the import pipeline uses it directly and never re-searches by name.
- `orcid` is stored for reference and future matching.

Use this for:

- every researcher whose publications should be imported
- anyone whose name is common enough that a name search could resolve to the wrong person

Important:

- If the field is empty, the pipeline searches OpenAlex by name and stores the result. Review the doctor report after a sync and correct the ID in Strapi if it resolved to the wrong person.
- A person without a portrait cannot be pinned automatically because the Person schema requires a portrait; add one and rerun the sync.

### Publication: `graphEligible`

Location: `Publication`

Default: `false`

What it does:

- When `graphEligible` is enabled, the publication participates in graph rebuilds.
- The pipeline reloads all graph-eligible publications from Strapi and computes links, duplicates, communities, embeddings, macro assignment, and meso assignment from that set.
- When it is disabled, the publication is excluded from the graph pipeline.

Use this for:

- publications that should remain in the database but not appear in the graph
- records that are incomplete or should be held out from automated graph processing

Important:

- `graphEligible` is not the same as `sourceKind`.
- A publication can be manual and still graph-eligible.
- A publication can be graph-ineligible even if it is otherwise valid content.
- The importer updates a draft without republishing it. If you unpublish a
  paper, it stays unpublished until an editor republishes it.

### Import scope

The importer is deliberately narrower than OpenAlex. It keeps journal articles,
conference papers, preprints, reviews, dissertations, and data papers even when
OpenAlex has no abstract. Book chapters, books, editorials, conference
abstracts, datasets, and similar records must have an abstract, and front/back
matter titles such as `Contents`, `Preface`, or `Index` are always rejected.

If an automated record is already in Strapi but no longer passes these rules,
the next sync unpublishes it and removes it from the graph. This is automatic;
you do not need to create an exclusion for ordinary book front matter. Use a
`GraphExclusion` only when you need a durable, explicit exception or want to
keep a record out even though it looks like a normal paper.

### Graph Exclusion

Location: `Graph Exclusion`

Default: no exclusion

What it does:

- Keeps a paper out of the importer even after the publication record is
  deleted.
- `GraphExclusion` matches on exact OpenAlex ID, DOI, or normalized title.
- `scope=graphOnly` removes the paper from graph rebuilds but keeps its
  publication page.
- `scope=hideEverywhere` also unpublishes it, so it disappears from the public
  publication listing, detail page, author pages, project pages, and graph
  search.
- `isActive` lets you pause an exclusion without deleting the note.
- Deactivating an exclusion does not republish a hidden record; republish it in
  Strapi when it should return.

Use this for:

- placeholder records such as `Table of contents` or other papers with no real
  content;
- papers that must never be reimported;
- papers that should be buried from the site entirely.

Practical rule:

- To hide an existing paper from the graph but keep its page, toggle
  `graphEligible` off.
- To remove a paper from the site and prevent the weekly import from bringing it
  back, create a `GraphExclusion` with `scope=hideEverywhere` and then delete or
  unpublish the publication.

Important:

- Exclusion matching is exact. Do not rely on partial titles or fuzzy names.
- If a paper has no DOI or OpenAlex ID, use its exact stored title.
- `hideEverywhere` unpublishes rather than hard-deletes, so editors can review
  the draft later.

## 2. Ownership: Manual vs Automated

### `sourceKind`

Location: `Publication`

Values:

- `manual`
- `openAlexAutomated`

What it does:

- `manual` marks a publication as editor-curated.
- `openAlexAutomated` marks a publication as pipeline-managed.

Pipeline behavior:

- existing automated records may be updated by the import pipeline
- manual records are protected from automated overwrite
- if a source import finds a record with the same title, DOI, or OpenAlex ID, the pipeline reuses that record instead of creating a duplicate

Practical rule:

- If an editor creates or curates a publication in Strapi, leave it as `manual` unless you explicitly want the Python pipeline to manage it.

## 3. Publication Fields Used by the Graph Pipeline

These fields are either written by the pipeline or used as graph metadata.

### Embedding and graph metadata

Location: `Publication`

Fields:

- `embedding`
- `embeddingModel`
- `embeddingSourceHash`
- `embeddingUpdatedAt`
- `lastGraphIndexedAt`

Meaning:

- These are pipeline-managed technical fields.
- They describe how the current embedding was produced and when the record was last processed.
- Editors should normally not change them manually.

### Community fields

Fields:

- `community`
- `communityLabel`
- `secondaryClusters`

Meaning:

- These are graph outputs produced from the similarity and clustering pipeline.
- They are not the primary editorial taxonomy.
- Treat them as computed metadata, not hand-edited categorization.

### Macro and meso placement fields

Fields:

- `graphMacroPrimary`
- `graphMacroTags`
- `graphMesoPrimary`
- `graphMesoTags`

Meaning:

- `graphMacroPrimary` is the main macro category used for placement.
- `graphMacroTags` are secondary macro matches and should be treated as highlights.
- `graphMesoPrimary` is the main meso bucket used for placement.
- `graphMesoTags` are secondary meso matches and should be treated as highlights.

Pipeline rule:

- For non-manual publications, these relations are regenerated on each global graph rebuild.
- For manual publications, the pipeline is intended to leave editorial ownership alone.

Reading the graph:

- A meso node shows `primary / tagged` counts. `primary` is the paper's main
  meso and forms a clean partition of the macro; `tagged` includes papers whose
  secondary topics also match.
- The meso detail page opens the primary set by default. Use the
  `ALL TAGGED` toggle to see the wider membership.

## 4. Macro Taxonomy: `GraphMacro`

Location: `GraphMacro`

These are the broad research domains used by the graph pipeline.

Fields:

- `name`
- `slug`
- `description`
- `keywords`
- `sortOrder`
- `isActive`

How the pipeline uses them:

- The pipeline builds a text representation from `name`, `keywords`, and `description`.
- That text is embedded and compared against each paper embedding.
- The best match becomes `graphMacroPrimary`.
- Additional matches can be stored in `graphMacroTags`.

What editors should change:

- edit `name` when the macro label itself should change
- edit `keywords` when you want to steer matching toward a different vocabulary
- edit `description` when you want more context or a clearer human-facing explanation
- edit `sortOrder` to influence presentation order
- use `isActive` to hide a macro from active use without deleting it

What not to do:

- do not manually assign macro relations on every publication as a maintenance strategy
- do not treat `graphMacroTags` as a replacement for `graphMacroPrimary`

## 5. Meso Taxonomy: `GraphMeso`

Location: `GraphMeso`

These are the mid-level topic buckets used by the graph UI and pipeline.

Fields:

- `name`
- `slug`
- `description`
- `keywords`
- `sortOrder`
- `isActive`
- `macro`

How the pipeline uses them:

- The pipeline creates or updates meso nodes from topic superclusters.
- Each meso is associated with a macro.
- Publications are then tagged with `graphMesoPrimary` and `graphMesoTags`.

What editors should change:

- edit `name` to improve the human-facing label
- edit `keywords` to help the meso better reflect its topic cluster
- edit `description` to clarify what belongs in the bucket
- edit `sortOrder` to control display order
- edit `isActive` to temporarily disable a meso without deleting it
- edit `macro` when a meso belongs under a different broad domain

What not to do:

- do not use meso fields as a manual per-paper override mechanism
- do not expect paper placement to stay fixed if the pipeline is rerun and the taxonomy changes

Identity and cleanup:

- a meso's identity is its macro-scoped slug (`sc-<macro>-<cluster>`), not its display name; the same label can legitimately appear under two macros
- pipeline-generated mesos that end up with no tagged or primary publications are pruned after assignment

## 6. Recommended Editor Workflow

### If you are adding or editing a person

1. Set `importEligible=true` only if that person should be used as an import source.
2. Leave it `false` for non-research personnel or profiles that should not trigger imports.

### If you are adding or editing a publication

1. Leave `sourceKind=manual` for curated records.
2. Set `graphEligible=true` if the publication should participate in the graph.
3. Set `graphEligible=false` if the publication should stay in Strapi but be excluded from graph generation.
4. Avoid hand-editing embedding, community, macro, or meso output fields unless you are intentionally changing the underlying taxonomy.

### If you are editing graph categories

1. Use `GraphMacro` to control broad domains.
2. Use `GraphMeso` to control subtopics within a macro.
3. Change names, keywords, and descriptions when you want the pipeline to classify future rebuilds differently.

## 7. What the Python Pipeline Does on Sync

The current sync flow is:

1. load source people, filtered by `importEligible`
2. fetch papers for those people from the source system
3. deduplicate against existing Strapi publications using OpenAlex ID, DOI, and title matching
4. create or update automated publications
5. reload all `graphEligible` publications from Strapi
6. recompute graph links, duplicates, communities, macro assignments, and meso assignments

This means the graph is always based on the current eligible Strapi corpus, not just on the freshly imported batch.

## 8. Practical Rules of Thumb

- Use `importEligible` to decide who can seed imports.
- Use `graphEligible` to decide which publications participate in the graph.
- Use `sourceKind=manual` for editorially managed publications.
- Use `GraphMacro` and `GraphMeso` to shape the taxonomy, not individual publication records.
- Expect macro and meso assignments to be regenerated for automated publications when the pipeline runs.

## 9. If You Need One Sentence Per Field

- `importEligible`: this person may seed the import pipeline.
- `graphEligible`: this publication should be included in graph rebuilds.
- `sourceKind`: this record is manual or pipeline-managed.
- `graphMacroPrimary`: the main broad-domain assignment.
- `graphMacroTags`: additional broad-domain matches.
- `graphMesoPrimary`: the main mid-level topic assignment.
- `graphMesoTags`: additional mid-level matches.

## 10. Knowledge Graph and Laboratory Graph

The knowledge graph at `/search/knowledge-graph` is a read-only projection of
the same Strapi records. It does not store another graph and it is not rebuilt by
the Python pipeline. It joins:

- people to publications through `Publication.authors`;
- people to laboratories, teams, projects, and departments through the existing
  relations;
- projects to departments through `Project.domains`, and projects to teams
  through `Project.teams`;
- teams to their department and, when set, their laboratory;
- publications to macros and mesos through the graph relations;
- publications to one another through `GraphLink`.

The explorer's node-type chips filter the graph itself, not only the result
list. Turning **Publications** off leaves the organisational projection: people
linked to laboratories, projects, teams, and departments through membership,
contribution, and affiliation. Topics are derived from publication tags, so they
are left out of a view that hides publications. The same filters apply to the
context added around each match.

Graph views are bounded. When the edge budget is reached, structural links
(authorship, membership, department, project, and team relations) are kept
ahead of topic tags, the scope root keeps its links, and every visible node
retains at least one link. The node inspector reports how many of an entity's
full-graph connections are shown in the current view. A department scope also
includes the teams, projects, laboratories, and publications that declare that
department.

This means an editor's existing work is enough: there is no separate knowledge
graph collection to maintain.

The laboratory **Graph** tab uses the same projection with a laboratory scope.
It shows the union of:

1. publications explicitly linked in `Laboratory.publications`, and
2. published papers authored by the laboratory's coordinator, co-coordinator,
   researchers, or team members.

Because of rule 2, the graph can show papers that are not present in the
laboratory's Publications tab. The graph labels these as `member-authored` so
the difference is visible. If you want a paper removed from a laboratory graph,
change the authorship or the laboratory membership. `graphEligible=false`
removes a paper from the paper-graph rebuild; an active `GraphExclusion` removes
it from every graph view, including the knowledge graph and laboratory graph,
while still keeping the publication page when `scope=graphOnly`.

The laboratory graph can optionally show external co-authors and paper-to-paper
similarity edges. Both are off by default because they can make a small lab
graph noisy.

If you want, the next step can be a shorter editor-facing version for non-technical users, or a companion appendix that lists every graph-related field in table form.
