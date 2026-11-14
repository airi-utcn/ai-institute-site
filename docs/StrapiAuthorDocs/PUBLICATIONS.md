# Publication authors, citations, video and code

In **Content Manager → Publication**, existing records continue to work without any changes. New fields are optional.

- **Authors** keeps the existing links to institute people, used for person pages and publication filters.
- **Author credits** is an ordered list for the full paper author list. Drag rows into paper order. For an institute author, select **Person**; their name, profile link and portrait come from that profile. For an external author, leave Person empty and enter **Name**. Enter **Affiliation** for each row, using the institutions at the time of publication; multiple affiliations can be separated by semicolons. Name can override the linked profile's name for this paper. Keep internal people in Authors as well if their person page should list the publication. Existing Authors missing from the credits are appended, without duplicating linked people.
- **Bibtex** accepts the actual citation as plain text. The existing BibTeX tab gains a copy button and a Show BibTeX disclosure. Existing **Bib file** uploads load when the tab opens, so the source can be viewed before copying; the download link remains available. Entered Bibtex text takes priority when both are present. The PDF tab and PDF download remain unchanged.
- **Video file** accepts an uploaded video, subject to the existing upload size limit. **Video URL** accepts a full HTTP(S) link, including YouTube watch, short or embed links. Videos play only after the visitor presses play. If both fields are filled, the uploaded video plays on the page and the external video link remains available.
- **Code URL** accepts the full HTTP(S) URL of the associated code repository. An optional Source code link appears on the publication detail page, alongside the existing document tabs. The publication listing retains its existing View Details and PDF actions.

Save and publish the publication. Portraits must also be present on the linked person profile.

## Deployment

This change adds a repeatable `publication.author-credit` component and optional publication fields. Rebuild and restart Strapi before deploying the frontend, so its new populate queries are accepted. Strapi applies the additive schema changes on startup. Existing author relations and BibTeX uploads are preserved; no content backfill is required. The OpenAlex importer does not write the new editorial fields.
