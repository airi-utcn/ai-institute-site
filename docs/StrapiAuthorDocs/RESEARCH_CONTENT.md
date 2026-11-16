# Research content

How to add projects, publications, results and research themes. For saving, publishing and
languages in general, see the [Content Manager basics](./CONTENT_MANAGER_BASICS.md).

All four content types are translated. Links to other entries (people, departments, partners…) are
set in each language, while dates, images and checkboxes are shared. See
[Shared and per-language fields](./NEWS_AND_EVENTS.md#shared-and-per-language-fields).

## Projects

Open **Content Manager → Project**. Each project has a page at `/research/projects/{slug}`.

### Where a project appears

- **Is Industry Engagement** ticked: the project is shown under **Engagement → Industry → Projects**
  and not on the research projects page.
- Otherwise, the project is on `/research/projects` while it's running. Once its **End Date** has
  passed, it moves to the projects archive on its own. Leave **End Date** empty for a project with
  no planned end.

### Fields

| Field | What to enter |
| --- | --- |
| **Title**, **Start Date** | Required |
| **End Date** | Decides when the project is archived |
| **Abstract** | Short summary used in listings |
| **Region** | `local`, `regional`, `national`, `international` or `other` |
| **Hero Image** | Main image |
| **Body**, **Research Content** | The project page text, built from blocks (Section, Rich text, Media, Slider) |
| **Timeline** | Milestones, each with a label, a date and an optional description |
| **Contact Info** | Contact entries and general contact text |

### People on a project

There are two ways to link people. They can be combined:

- **Teams**: link one or more Team entries. All their members count as working on the project.
- **Individual Contributors**: one row per person, with an optional **Role**.

A researcher whose projects have all ended is listed as a **Former Researcher** on `/people`. So
keep end dates and project members accurate.

### Links to other content

**Domains** (departments), **Themes**, **Partners**, **Coordinating Partner**, **Publications**,
**Resources**, **Results**, **News** and **Events** connect the project to the rest of the site. A
partner with no running projects is shown as a former partner.

## Publications

Open **Content Manager → Publication**. Each publication has a page at
`/research/publications/{slug}`.

Most publications are **imported automatically** from OpenAlex. **Source Kind** shows where an entry
came from:

- `openAlexAutomated`: created by the import. The import may update it, so don't hand-edit imported
  metadata such as title, year, DOI or citation count.
- `manual`: added by hand. The import won't overwrite it.

The import reuses an existing entry with the same title, DOI or OpenAlex ID instead of creating a
duplicate. So adding a paper by hand before the import finds it is fine.

To add a publication by hand, create an entry, leave **Source Kind** on `manual` and fill in:

- **Title** (required), **Year**, **DOI**, **Kind** (article, conference paper…)
- **Abstract** and/or **Description**
- **Authors**: link the Person entries of the institute's authors
- **Domain** (department), **Themes**, **Projects**, **Laboratories**
- **PDF File**, **Bib File**, **Attachments** if you have them

Leave the graph and embedding fields (**Graph Eligible**, **Community**, **Embedding**, **Graph
Macro/Meso**…) alone unless you know what they do. They are explained in the
[paper graph user manual](../../paper-graph-user-manual.md).

## Results

Open **Content Manager → Result**. A result (a dataset, prototype, report…) has a page at
`/research/results/{slug}`. Fill in **Title**, **Description**, the **Body** blocks, an optional
**Published Date** and **Attachments**, and link the **Projects** it came out of.

## Research themes

Open **Content Manager → Research Theme**. Themes are listed on `/research/themes` and used to group
projects and publications. Each theme has a **Name**, a **Summary**, a **Color** and links to
**Projects** and **Publications**. Linking a theme from a project or publication is enough. You
don't need to link it from both sides.
