# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Knowledge graph query interface and laboratory graph**:
  - `/search/knowledge-graph` is now a faceted, URL-shareable explorer over people, publications, laboratories, projects, teams, departments, and research topics.
  - Supports text search, type/year/lab/department/project/topic filters, node inspection, and scope narrowing.
  - Node-type filters now control the graph itself; hiding publications shows the membership, project, team, and department network, and the query API's connection paths cannot route through hidden types.
  - New `GET /api/knowledge-graph` returns a bounded, cached projection with published content only; preview sessions bypass the shared cache.
  - Laboratory pages have a new **Graph** tab showing the union of explicitly linked publications and papers authored by the laboratory's members, with optional similarity and external co-author overlays.
- **Richer publication details and author credits**:
  - Ordered author credits that link AIRi profiles or keep external authors publication-only, with publication-specific affiliations.
  - Author portraits on publication detail pages and automatic synchronization of linked credits into the Authors relation.
  - BibTeX viewing and copying alongside the existing download, uploaded or YouTube/Vimeo presentation videos, and an optional source-code link.
  - Optional DOI autofill (Crossref/DataCite) with review before applying, and explicit People profile creation for unlinked authors.
- **"Pending review" widget on the Strapi admin homepage**:
  - Lists everything that is not live on the website, grouped by content type: never-published drafts and published entries that have pending edits.
  - Uses the existing, permission-checked Content Manager views (`__status` filters `draft` and `published-modified`), so no new backend endpoints are required and editors only see content types they can read.
  - Each row deep-links to the entry's edit view in the Content Manager (current locale included); single-type content is checked per locale.
  - Results are cached in the browser for 2 minutes and can be refreshed manually; the widget shows when the data was last updated, so revisiting the dashboard does not re-query every content type.
- **Native Strapi v5 Internationalization (i18n)**:
  - Enabled `@strapi/plugin-i18n` with 11 supported locales: `en` (default), `ro`, `bg`, `de`, `el`, `es`, `fr`, `it`, `lv`, `tr`, `zh`.
  - Added 12 localized Single Types in Strapi to manage site-wide static and promotional content dynamically:
    - `global`: Site settings, localized navigation bar items, and footer labels.
    - `home-page`: Hero section, mission/about preview, feature highlights, and section titles.
    - `about-page`: Mission statements, research vision, values, leadership, and about page sections.
    - `contact-page`: Contact details, addresses, inquiry topics, and feedback form placeholders.
    - `engagement-page`: Industry collaboration highlights, student programs, and partnership details.
    - `news-page`: News, events, careers, awards, and seminar section headers and filter labels.
    - `people-page`: Leadership team headers, staff categories, directory labels, and filter titles.
    - `research-page`: Research themes, departments, projects, publications, thesis, and results page labels.
    - `resources-page`: Resource categories, download actions, filter labels, and empty states.
    - `media-page`: Media gallery headers, photo/video descriptions, and press labels.
    - `search-page`: Universal search, classic search tabs, chatbot interface copy, and knowledge graph search labels.
    - `timeline-page`: Institute history header and milestone event cards.
- **I18n Content Migration Script (`server/scripts/migrate-i18n.js`)**:
  - Automated migration tool using Strapi's Document Service API.
  - Automatically provisions required Strapi locales if missing.
  - Maps nested keys from translation files into structured Strapi attributes.
  - Links all 11 locale translations under identical `documentId` records to maintain proper document localization groupings.
  - Idempotent: safe to run multiple times without duplicating entries.
- **Bundled Translation Assets for Production Containers (`server/messages/`)**:
  - Translation files (`en.json`, `ro.json`, `fr.json`, etc.) are packaged directly into the Strapi server image build context (`/app/messages`).
  - Allows zero-downtime execution of migrations in Docker environments via `docker compose exec`.
- **Dynamic Frontend Locale Context**:
  - Created `web/src/context/LocaleContext.js` providing `LocaleProvider`, `useLocale()`, and `useGlobalData()` hooks.
  - Added Strapi client helpers (`getGlobal(locale)`, `getSingleType(endpoint, locale)`) in `web/src/lib/strapi.js` with query parameter encoding.
  - Updated `LanguageSwitcher` to support all 11 languages with cookie-based persistence (`NEXT_LOCALE`) and synchronized reloads.
- **Documentation**:
  - Added a comprehensive production migration tutorial.
  - Updated [`SETUP.md`](./SETUP.md) with i18n migration instructions for local and Docker development.

### Changed
- **Frontend Architecture**:
  - Replaced static file-based localization across all routes with dynamic server-side and client-side Strapi CMS data fetching.
  - `RootLayout` (`web/src/app/layout.js`) dynamically reads `NEXT_LOCALE` cookie and passes localized `global` navigation and footer data to all child components.
  - Research pages (`departments`, `projects`, `publications`, `thesis`, `themes`, `results`) updated to consume Strapi dynamic single types.
- **Docker Compose Production Setup**:
  - Retained image-based production deployment while supporting running database migrations seamlessly inside running or ephemeral containers.

### Removed
- **Legacy Static i18n System**:
  - Completely uninstalled `next-intl` from `web/package.json`.
  - Removed `web/next.config.mjs` Next-Intl plugin wrapper.
  - Removed legacy configuration file `web/src/i18n.js`.
  - Deleted static JSON translation files from `web/src/messages/`.
