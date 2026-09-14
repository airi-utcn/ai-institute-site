# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
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
  - Added comprehensive production migration tutorial in [`docs/i18n-production-migration.md`](./docs/i18n-production-migration.md).
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
