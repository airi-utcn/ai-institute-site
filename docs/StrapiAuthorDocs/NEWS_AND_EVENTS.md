# News, awards and events

How to add news items, awards and events. For saving, publishing and languages in general, see the
[Content Manager basics](./CONTENT_MANAGER_BASICS.md).

## News items

Open **Content Manager → News Item** and click **Create new entry**. Write the English (`en`) version
first.

### Where a news item appears

The **Category** decides where the item is listed:

| Category | Listed on |
| --- | --- |
| `award` | `/news&events/awards` (and not on the news page) |
| `announcement`, `construction`, `collaboration`, `press`, `other` | `/news&events/news`, with a filter per category |

The homepage shows the six most recent published news items in the visitor's language, sorted by
**Published Date**. Set that date to when the news happened, not when you typed it in. It controls
the order.

### What a news item needs before publishing

You can save an incomplete draft at any time. To **publish**, a news item needs all of these:

- **Title** and **Summary**, with real text (spaces only are rejected)
- **Published Date**
- **Hero Image**
- at least one **Related Department**
- at least one **Related Project**
- at least one **Featured Person**
- an **Author** (a Person entry)

If one is missing, Publish fails and the error names the field. Title and summary are filled in for
each language. Hero image and date are shared by all languages. The related departments, projects,
people and author are set in each language (see [Shared and per-language fields](#shared-and-per-language-fields)).

### Other fields

- **Slug** is the address of the item, `/news&events/news/{slug}`. It's generated from the title. You
  can regenerate it with the refresh icon next to the field. Avoid changing it after publishing
  because old links will break.
- **Body** is where the article text goes. Add blocks with **Add a component to body**: Section, Rich
  text, Media, Slider or Quote. See [Content blocks](./CONTENT_MANAGER_BASICS.md#content-blocks-and-media).
- **Gallery** holds extra images.
- **Link URL** is an optional external link, for example to a press article.

## Events

Open **Content Manager → Event**. Events are listed on `/news&events/events` and each one has its own
page at `/news&events/events/{slug}`.

### The fields that matter most

| Field | What to enter |
| --- | --- |
| **Title** | Required |
| **Start Date**, **End Date** | Required. For a one-day event, use the same day with different times |
| **Category** | Conference, workshop, seminar, invited lecture, podcast… |
| **Format** | `onsite`, `online` or `hybrid` |
| **Location Type** | `airi_utcn`, `hub_utcn`, `online` or `other` |
| **Location**, **Address**, **Room Or Link** | Where to go, or the meeting link |
| **Audience**, **Language** | Who it's for and what language it's in |
| **Description** | Short text used in listings |
| **Body** | Full description with blocks, like a news item |
| **Hero Image**, **Photo Credits** | Main image and who took it |

### Registration

If people must register, tick **Registration Required** and fill in **Registration URL** and/or
**Registration Email**, plus **Registration Deadline** if there is one. **Access Conditions** is for
rules such as "UTCN students only" or "bring an ID".

**CTA Label** and **CTA URL** add a button, for example "Watch the recording".

### Speakers and participants

There are two ways to list people:

- **Speakers** links existing Person entries. Use this for anyone who already has a page on the site.
- **Participants** is a list you fill in by hand. Each row has a **Role** (speaker, panelist,
  moderator, keynote speaker…) and either a linked **Person** or a first name, last name, title,
  bio and photo. Use it for guests who don't have a Person entry.

**Organizers** links departments, **Partners** links Partner entries and **Projects** links the
projects the event belongs to. For partner institutions that aren't in the Partner list, type them
into **Partner Institutions Text**.

**Contact Person** links a Person, or use **Contact Name** and **Contact Email** for someone outside
the institute.

## Shared and per-language fields

News items and events are translated. In the edit view, fields fall into two groups:

- **Set in each language:** text fields (title, summary, description, body, location…), the slug,
  and all links to other entries (related people, departments, projects, speakers, organizers,
  partners).
- **Shared by all languages:** dates, images, categories, dropdowns, checkboxes, URLs and emails.
  Changing them in one language changes them everywhere.

So when you add a translation, the links to other entries start empty. **Fill in from another
locale** copies the text and the links from English, then you translate the text. A link to a
translated entry (a project, department or partner) is only copied if that entry already exists in
the language you are filling. Otherwise it's dropped without warning. Check the links after filling.
People aren't translated, so links to people are always kept.

## Checklist before publishing

- Category is right (awards go to the awards page, everything else to news).
- Dates are right, including the year.
- Hero image is set and looks good when cropped.
- [Preview](./PREVIEW_GUIDE.md) the draft.
- Publish each language you translated.
