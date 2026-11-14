# People and teams

How to add and update people, teams and the leadership page. For saving, publishing and the edit
view in general, see the [Content Manager basics](./CONTENT_MANAGER_BASICS.md).

## People

Open **Content Manager → Person**. Each person has a page at `/people/{slug}` and appears on
`/people`.

Person entries are **not translated**. There is one version for all languages, so there is no
language selector.

### Before you add someone

Search the list first, by last name and by first name, so you don't create a duplicate. People are
also linked from news items, events, projects and publications, and a duplicate splits those links
between two pages.

### Required fields

- **First Name**, **Last Name**
- **Bio**
- **Portrait**, a square-ish photo works best
- **Social Links**, a list of label + URL (email, website, LinkedIn, Google Scholar…). Pick an
  **Icon** for each

### Slug

The slug is generated from the last name. If two people share a last name, the second gets a suffix
like `popescu-1`. In that case change it to something readable such as `ion-popescu`. Don't change
the slug of a published person, because links to their page will break.

### Type: which tab a person appears in

**Type** decides the tab on `/people`:

| Type | Tab | Extra field |
| --- | --- | --- |
| `researcher` (default) | Researchers | — |
| `staff` | Staff | — |
| `student` | Students | **Type Student**: `highschool` or `university` |
| `visiting` | Visiting Scholars | **Type Visiting**: visiting researcher, scholar, student, industry partner, guest speaker… |
| `external` | External Collaborators | **Type External**: `mentor` |
| `alumni` | Alumni | **Type Alumni**: `alumni_AIRI` or `alumni_UTCN` |

Fill in the extra field only for the matching type. It's ignored for the others.

Researchers move to **Former Researchers** on their own: when every project they are linked to
(directly or through a team) has an end date in the past, the site lists them as former. You don't
need to change their type.

### Other fields

- **Title**: academic title (Professor, Associate Professor, PhD Student…).
- **Email**, **Phone**, **Location**: shown on the person's page.
- **Department**: the department the person belongs to. This also lists them on the department page.
- **Publications**: the person's publications. Many are added automatically by the publication
  import.
- **Scholar Id** and **Import Eligible**: used by the publication import. See the
  [paper graph user manual](../../paper-graph-user-manual.md) before changing them.

## Teams

Open **Content Manager → Team**. Teams group people around a department, a laboratory or a set of
projects. Teams are **not translated**.

| Field | What it does |
| --- | --- |
| **Name**, **Subtitle**, **Description**, **Image** | How the team is presented |
| **Category** | `leadership`, `research`, `project`, `support` or `other` |
| **Members** | One row per person: the **Person**, their **Role** in the team (required), and **Is Lead** for team leads |
| **Department**, **Laboratory** | Where the team belongs. It's then listed on that page |
| **Projects** | The team's projects. Members count as working on them, which matters for [Former Researchers](#type-which-tab-a-person-appears-in) |
| **Display Order** | Sort order on the leadership page, lowest first |

### The leadership page

`/about/leadership` shows the teams with category **leadership**, sorted by **Display Order** and
then by name. Within a team, members with **Is Lead** ticked are shown first and highlighted.

To change the leadership page, edit those teams. For example, to add a board member, open the
board's team, add a row under **Members** and publish the team.

## Departments and laboratories

The coordinator and co-coordinator of a department or laboratory are set on the **Department** or
**Laboratory** entry, not on the person. A laboratory also has a **Researchers** list. A person's
**Department** field is what places them on a department page.
