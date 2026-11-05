# Engagement Page Author Manual

This guide explains how to maintain the public Engagement page in Strapi. The page is a localized **Engagement Page** single type and is rendered by the website at `/engagement`.

## Open the page

1. Open the Strapi admin panel.
2. Go to **Content Manager**.
3. Open **Engagement Page** under **Single Types**.
4. Select the locale you want to edit.

The page uses Draft & Publish. Use the **Draft** view while editing, click **Save**, and use **Publish** only when the changes are ready for visitors.

## Page-level fields

The fields at the top of the entry control the hero and navigation:

| Field group | Purpose |
| --- | --- |
| `heroTitle`, `heroSubtitle` | Text in the page hero |
| `tabPublic`, `tabAcademic`, `tabIndustry`, `tabHighSchool`, `tabPartners` | Main tab labels |
| `subtabInfo`, `subtabProjects` | Industry subtab labels |
| `partnersTitle`, `partnersMapTitle` | Partner section headings |
| `industry...` fields | Labels for Industry project search, filters, lead text, and empty states |
| `partners...` fields | Labels and descriptions for the Partners hero, statistics, filters, statuses, actions, and empty state |

These fields are localized. Edit the corresponding locale separately rather than replacing text in another locale.

## Dynamic zones

The four content areas are dynamic zones:

- `publicContent`
- `academicContent`
- `industryContent`
- `highSchoolContent`

Add blocks in the order in which they should appear on the page. Drag blocks to reorder them. The frontend renders only the blocks saved in the selected dynamic zone.

### Available blocks

| Block | Use it for | Important fields |
| --- | --- | --- |
| **Call to action** | A highlighted banner with buttons | Title, description, button text/URL, theme |
| **Card Grid** | A group of related cards | Heading, subheading, columns, cards |
| **Card** | A standalone linked information card | Title, description, icon or image, badge, link |
| **Focus item** | A compact highlight or key point | Title, description, rich content |
| **Section** | A headed content section | Heading, subheading, rich body, optional media |
| **Rich text** | Free-form formatted content | Body |
| **Media** | One image, GIF, video, or downloadable file | File |
| **Slider** | A gallery of images | Files |
| **Quote** | A quotation or emphasized statement | Title, body |
| **Separator** | A named section heading and scroll target | Anchor ID, label, subheading, style |

Media blocks can use supported image formats, GIFs, videos, and files where the block allows them. For a card or Card Grid card, use the card's **Image** field. For a larger visual, use **Media**, **Section media**, or **Slider**.

## Same-page navigation and scrolling

Use a **Separator** to create a destination lower on the page, then link a card to it.

### Create the destination

1. Add a **Separator** to the relevant dynamic zone.
2. Enter a visible `Label`, for example `Research Opportunities`.
3. Enter an `Anchor ID`, for example `research-opportunities`.
4. Choose a style:
   - `heading`: visible heading and divider
   - `line`: divider only
   - `spacer`: spacing without a visible heading
5. Save the entry.

The Anchor ID must be a valid UID: use lowercase letters, numbers, and hyphens. Do **not** enter a leading `#`.

### Create the link

In a **Card** or Card Grid card:

1. Set the card's `Link URL` to `#research-opportunities`.
2. Optionally set `Link Text`.
3. Save the entry.

The link scrolls to the matching separator on the same page. The ID must match exactly, including hyphens. If a link does not scroll, check that there is one separator with that Anchor ID in the same page and that the card URL starts with `#`.

## Industry and Partners

The Industry **Info** subtab is populated from `industryContent`. The Industry **Projects** subtab remains driven by the Projects content type and is not populated through this dynamic zone.

The Partners tab combines:

- Partner records from the **Partner** content type.
- Partner headings and interface text from the Engagement Page single type.
- The partner map rendered from the existing collaborator data.

To add or change a partner, edit the relevant Partner entry rather than adding a card to `publicContent` or `industryContent`.

## Preview unpublished changes

After saving a draft:

1. Stay in the Engagement Page edit view.
2. Click **Preview** in the entry actions.
3. The website opens in Strapi's preview frame and shows the draft version of `/engagement`.
4. Test the relevant tab, media, card links, and separator scrolling.

Preview uses the locale currently selected in Strapi. It does not publish changes. A one-hour preview session is created for your browser only; ordinary visitors keep seeing the published page. Use **Exit preview** in the amber banner to end the session.

If Preview is unavailable or blank:

- Confirm the draft was saved.
- Confirm the frontend is running and reachable from the browser.
- Refresh the preview frame.
- Ask an administrator to verify `CLIENT_URL` and `PREVIEW_SECRET` are configured identically for Strapi and Next.js.
- Check the browser console for iframe or Content Security Policy errors.

See [PREVIEW_GUIDE.md](./PREVIEW_GUIDE.md) for the preview target of every other content type.

## Localization checklist

For each supported locale:

1. Open the locale in the Engagement Page entry.
2. Translate the page-level labels and dynamic-zone content.
3. Keep matching separator Anchor IDs between locales when the page structure is equivalent.
4. Use the same card link target as the localized separator.
5. Preview the locale before publishing it.

Do not change an Anchor ID casually after cards already link to it. If it must change, update every matching card URL in the same locale.

## Publishing checklist

Before publishing:

- Confirm the correct locale is selected.
- Check the hero and tab labels.
- Check the order of every dynamic-zone block.
- Test Card and Card Grid links.
- Test every separator link and target.
- Check images, GIFs, videos, and sliders.
- Open the Preview view and verify the page in each relevant tab.
- Publish only after the draft preview is correct.
