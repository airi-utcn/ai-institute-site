# Publication authors, citations, video and code

In **Content Manager → Publication**, existing records continue to work without any changes. New fields are optional.

## Optional DOI autofill

The **Fill from DOI (optional)** panel is available when creating or editing a publication draft. Enter a bare DOI (for example `10.18653/v1/2024.ltedi-1.6`) or a `https://doi.org/...` URL, then select **Fill from DOI**. This reads metadata from Crossref, with DataCite as a fallback.

Review the proposed title, year, full author list with affiliations, and BibTeX in the dialog. Empty fields are selected for completion by default. Existing values, including an existing author list or BibTeX file, are not selected for replacement unless you explicitly check them. Select **Apply selected fields** to fill the unsaved form, make any corrections, and save/publish through the normal controls. Cancel leaves the proposed fields unapplied. DOI lookup never creates, saves or publishes a publication.

Unique exact name matches can link an author to an existing AIRi profile, subject to the editor's person-read permission. Ambiguous names are left unlinked. Registries sometimes omit authors or affiliations; review the list and complete missing affiliations before publishing. The usual author synchronization applies when saving the imported credits.

DOI remains optional. If lookup fails or you do not want to use it, complete the normal fields manually. Other content types and the public website are unchanged.

## Publication fields

- **Authors** keeps the links to institute people, used for person pages and publication filters. People selected in Author credits are added here automatically on save; there is no need to select them twice.
- **Author credits** is an ordered list for the full paper author list. Drag rows into paper order. For an institute author, select **Person**; their name, profile link and portrait come from that profile. For an external author, leave Person empty and enter **Name**. Enter **Affiliation** for each row, using the institutions at the time of publication; multiple affiliations can be separated by semicolons. Name can override the linked profile's name for this paper. Replacing or removing a linked person in the credits updates their Authors link automatically. Other authors selected separately in Authors are preserved. People still linked in credits remain in Authors even if removed directly from that field. Existing Authors missing from the credits are appended on the detail page, without duplicating linked people. External credits without a linked person do not create person profiles.
- **Bibtex** accepts the actual citation as plain text. The existing BibTeX tab gains a copy button and a Show BibTeX disclosure. Existing **Bib file** uploads load when the tab opens, so the source can be viewed before copying; the download link remains available. Entered Bibtex text takes priority when both are present. The PDF tab and PDF download remain unchanged.
- **Video file** accepts an uploaded video, subject to the existing upload size limit. **Video URL** accepts a full HTTP(S) link, including YouTube watch, short or embed links. Videos play only after the visitor presses play. If both fields are filled, the uploaded video plays on the page and the external video link remains available.
- **Code URL** accepts the full HTTP(S) URL of the associated code repository. An optional Source code link appears on the publication detail page, alongside the existing document tabs. The publication listing retains its existing View Details and PDF actions.

Save and publish the publication. Portraits must also be present on the linked person profile.

Author synchronization runs for saves, publication, duplication and restoring a draft from the published version. Draft edits do not change the published author links until the publication is published again. Existing records are synchronized when next saved or published; no database-wide backfill runs on startup.

## Deployment

This change adds a repeatable `publication.author-credit` component and optional publication fields. Rebuild and restart Strapi before deploying the frontend, so its new populate queries are accepted. Strapi applies the additive schema changes on startup. Existing author relations and BibTeX uploads are preserved; no content backfill is required. The OpenAlex importer does not write the new editorial fields.
