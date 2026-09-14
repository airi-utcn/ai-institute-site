# I18n and Static Content Migration Plan

This document outlines the strategy for moving all static JSON translations and static page content to Strapi for dynamic, structured editing by authors. By the end of this migration, the static JSON approach (currently powered by `next-intl` and local `messages/*.json`) will be completely replaced by native CMS fetching, leaving no trace of the legacy file-based i18n system.

## 1. Strapi CMS (Backend) Changes

### 1.1 Enable Strapi Internationalization
- **Install & Configure i18n Plugin:** Ensure `@strapi/plugin-i18n` is installed (already standard in Strapi v5, verify availability in `config/plugins.js` or via `npm i @strapi/plugin-i18n`). 
- **Setup Locales:** In the Strapi Admin panel, navigate to Settings > Internationalization and add all supported locales (e.g., `en`, `ro`, `bg`, `de`, `fr`, etc.) to match the old `messages` folder.

### 1.2 Content Type Architecture
To make editing **"easy for authors to understand"**, we will avoid dumping raw keys into a giant "Translations" content type. Instead, we'll map the website structure to tailored **Single Types**:

- **Global Settings (Single Type: `Global`)**
  - Text fields for generic elements: `footerCopyright`, `contactInfo`.
  - Repeatable components for: `quickLinks`, `navbarLinks`.
- **Home Page (Single Type: `HomePage`)**
  - Section components: `Hero` (Title, Subtitle, CTA), `About`, `Cards`.
- **About Page (Single Type: `AboutPage`)**
  - Section components: `Mission`, `OrganigramText`.
- **Contact Page (Single Type: `ContactPage`)**
  - `PageHeader`, `LocationInfo`, `FormTitles`.
- **Other Pages...** (`EngagementPage`, `ResearchPage`, `PeoplePage`, etc.)

*Crucially: All these Content Types will have "**Store localized content (i18n)**" enabled in their advanced settings setup.*

### 1.3 Data Migration Script
- Create a script (`server/scripts/migrate-i18n.js`) adopting the programmatic approach from `migrate-json.js`.
- It will parse the existing `web/src/messages/*.json` files.
- Using Strapi's Document API (`strapi.documents().create({ locale: 'en' })`), it will automatically seed the initial English texts, and loop over adjacent `messages/*.json` to populate translations for other locales into these newly created Single Types.

## 2. Next.js (Frontend) Changes

### 2.1 Refactor Data Sourcing to direct Strapi Fetch
Currently, components use `next-intl` via `useTranslations()`. This will be fully rewritten to follow Next.js 15 Server Components paradigms:
- The GraphQL/REST API route (e.g., `/api/home-page?locale=[locale]&populate=*`) will be queried inside Server Components like `app/page.js`.
- The fetched Strapi JSON payload is mapped and passed downward natively as React properties (e.g., `<Hero title={data.hero.title} />`).
- **Layout Level Fetch:** The server-side layout (`layout.js`) will fetch the `Global` single type from Strapi for rendering the context-aware Navbar and Footer per locale.

### 2.2 Locale Routing and Middleware
- We will replace `next-intl`'s routing with either Next.js's native `i18n` setup, or a lightweight custom Next.js `middleware.js` to look for the `NEXT_LOCALE` cookie/URL-prefix and parse it seamlessly to the Strapi components.
- Existing layout providers like `RouteShell` and `ThemeProvider` check for cookie or headers natively without needing `NextIntlClientProvider`.

### 2.3 Comprehensive Cleanup ("No Trace Remaining")
- Eliminate `next-intl` from `web/package.json`.
- Delete `web/src/messages/` tree entirely.
- Delete `web/src/i18n.js`.
- Remove localization provider wrappers (`<NextIntlClientProvider>`) from `layout.js` entirely.

## 3. Step-by-Step Execution Plan

1. **Setup Phase:** Define Strapi Single Types and components via schema setup (`src/api/*` and components in `/components`). Enable i18n for each required content field. Publish schema changes.
2. **Backend Data Migration:** Test and run `migrate-i18n.js` to move all pre-existing text structures from legacy JSONs directly into the fresh Strapi fields across all configured Locales.
3. **Frontend Phase - Global & Base Structure:** Refactor `layout.js`, updating the layout, headers, footers to request from Strapi instead of local static files.
4. **Frontend Phase - Page Refactor:** Iterate through each Next.js directory (`home`, `about`, `contact`, `news&events`, etc.), substituting `t('path.to.string')` with native properties driven straight from `/api/[pageType]` requests.
5. **Final Cleanup:** Purge the old `messages` subfolder, related local libraries, and redundant references to formally conclude the migration process.
