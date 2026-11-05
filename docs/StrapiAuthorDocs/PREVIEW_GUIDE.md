# Admin preview guide

Editors can open any entry in the Strapi admin, save it, and click **Preview**
in the entry actions. The frontend opens inside the admin preview frame and
shows exactly what the saved draft would look like.

## How preview works

- Preview requires `CLIENT_URL` and `PREVIEW_SECRET` to be configured on both
  Strapi and the frontend.
- Starting a preview creates a signed, http-only cookie that is valid for one
  hour. The cookie is the only thing that authorises reading unpublished
  content.
- Next.js draft mode is enabled at the same time so preview requests bypass the
  shared data cache. The signed cookie is still required: a stale draft-mode
  cookie by itself cannot expose drafts.
- Preview traffic is never cached. Other visitors continue to see published
  content even while an editor has a preview open.
- An amber banner appears at the top of every previewed page. Use **Exit
  preview** to disable draft mode and delete the session cookie.

## Where each content type previews

### Single types

| Content type | Preview page |
| --- | --- |
| About Page | `/about` |
| Awards Page | `/news&events/awards` |
| Careers Page | `/news&events/careers` |
| Contact Page | `/contact` |
| Departments Page | `/research/departments` |
| Engagement Page | `/engagement` |
| Events Page | `/news&events/events` |
| Global | `/` |
| Home Page | `/` |
| Laboratories Page | `/research/laboratories` |
| Media Page | `/media` |
| News Page | `/news&events/news` |
| Open Calls Page | `/news&events/open-project-calls` |
| People Page | `/people` |
| Projects Page | `/research/projects` |
| Research Page | `/research/publications` |
| Resources Page | `/resources` |
| Search Page | `/search` |
| Seminars Page | `/news&events/seminars` |
| Timeline Page | `/timeline` |

Single types now support draft and publish. Saving does not update the live
site; publish when the draft looks right.

### Collection types with a detail page

| Content type | Preview page |
| --- | --- |
| Person | `/people/{slug}` |
| Project | `/research/projects/{slug}` |
| Department | `/research/departments/{slug}` |
| Event | `/news&events/events/{slug}` |
| News Article | `/news&events/awards/{slug}` for awards, otherwise `/news&events/news/{slug}` |
| Laboratory | `/research/laboratories/{slug}` |
| Partner | `/engagement/partners/{slug}` |
| Publication | `/research/publications/{slug}` |
| Result | `/research/results/{slug}` |
| Graph Macro | `/research/paper-graph/{slug}` |
| Graph Meso | `/research/paper-graph/{macro}/{topic}` |

### Collection types without a detail page

| Content type | Preview page |
| --- | --- |
| Team | `/about/leadership` for leadership teams, otherwise `/people` |
| Seminar | `/news&events/seminars` |
| Resource | `/resources` |
| Research Theme | `/research/themes` |
| Graph Link | `/research/paper-graph` |
| Reservation | `/equipment` |

These show the listing page that presents the entry. They do not highlight the
individual record.

## Known limitations

- **About Page** feeds `/about` and seven subpages. Preview opens `/about`.
- **Research Page** feeds both publications and themes. Preview opens
  `/research/publications`.
- **News Page** and **Projects Page** also feed archive listings. Preview opens
  the main listing.
- **Reservation** is workflow data with no public content page; preview opens
  the equipment page.
- Visual editing markers inside the preview iframe are not implemented. The
  preview shows the rendered page, not clickable field overlays.

## Troubleshooting

If **Preview** is unavailable, blank, or opens the published page:

1. Confirm the draft was saved.
2. Confirm the frontend is reachable from the browser and `CLIENT_URL` matches
   its public origin.
3. Confirm `PREVIEW_SECRET` is identical on Strapi and the frontend.
4. Confirm `PUBLIC_STRAPI_URL` points at the origin that serves the admin, so
   the frontend CSP allows it to embed the preview frame.
5. Refresh the preview frame or exit and start the preview again.

Preview sessions expire after one hour. Start a new preview if the banner
disappears.
