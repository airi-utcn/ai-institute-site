# Production Guide: Running the i18n Data Migration Script

This guide explains how to run the internationalization (i18n) and static content migration script on a production server running containerized images via [`docker-compose.prod.yml`](../docker-compose.prod.yml).

---

## 1. Overview & Architecture

In production:
- Services run from pre-built container images pulled from GitHub Container Registry:
  - `strapi`: `ghcr.io/airi-utcn/ai-institute-site/server:latest`
  - `nextjs`: `ghcr.io/airi-utcn/ai-institute-site/web:latest`
  - `postgres`: `public.ecr.aws/docker/library/postgres:16`
- **Schema Auto-Migration:** When the updated Strapi container boots up, it automatically creates the database tables for the new Single Types (`home_pages`, `about_pages`, `research_pages`, etc.) through Strapi's built-in schema synchronization.
- **Bundled Migration Files:** The translation message files (`server/messages/*.json`) and the migration script (`server/scripts/migrate-i18n.js`) are built directly into the Strapi Docker image at `/app/messages` and `/app/scripts/migrate-i18n.js`.
- **Database Connection:** Because commands are executed inside the container environment, the script automatically inherits the production database credentials (`DATABASE_HOST=postgres`, `DATABASE_PASSWORD`, etc.) without requiring any manual environment configuration.

---

## 2. Step-by-Step Deployment & Migration

### Step 1: Pull and Deploy the New Docker Images

On your production server, pull the latest images and restart the containers:

```bash
# Navigate to the deployment folder on the server
cd /path/to/ai-institute-site

# Pull the newly published images from GHCR
docker compose -f docker-compose.prod.yml pull strapi nextjs

# Start or recreate the containers
docker compose -f docker-compose.prod.yml up -d
```

Check the Strapi logs to confirm that the server has started and database schemas have synchronized:

```bash
docker compose -f docker-compose.prod.yml logs -f --tail=100 strapi
```
*(Wait until you see `[INFO] Server started...` or similar in the log output).*

---

### Step 2: Run the Migration Script

Choose one of the following methods depending on whether your services are already running:

#### Method A: Execute in the Running Strapi Container (Recommended & Zero Downtime)

Since the `strapi` service is already running and connected to PostgreSQL, execute the script directly inside the active container:

```bash
docker compose -f docker-compose.prod.yml exec strapi npm run migrate:i18n
```

*Or invoke node directly:*
```bash
docker compose -f docker-compose.prod.yml exec strapi node scripts/migrate-i18n.js
```

#### Method B: One-Off Ephemeral Container

If Strapi is stopped or you prefer running the migration in an isolated container instance before launching the web server:

```bash
docker compose -f docker-compose.prod.yml run --rm strapi npm run migrate:i18n
```

This starts a temporary container on the same network with all environment variables, runs the migration, writes the data to the shared PostgreSQL volume, and automatically deletes the container (`--rm`).

---

### Step 3: What the Script Does

When executed, you will see real-time output similar to:

```text
🚀 Booting Strapi for i18n data migration...

🌍 Checking and creating Strapi locales...
  ✅ Added Strapi locale: Română (ro)
  ✅ Added Strapi locale: Français (fr)
  ...

📖 Loading JSON messages...
Found 11 locales: bg, de, el, en, es, fr, it, lv, ro, tr, zh

💾 Migrating Single Types and translations into Strapi...

📦 Processing: api::global.global
  ➕ Created primary [api::global.global] in locale [en]
    ➕ Added [api::global.global] locale: ro
    ➕ Added [api::global.global] locale: fr
    ...

📦 Processing: api::home-page.home-page
  ➕ Created primary [api::home-page.home-page] in locale [en]
    ➕ Added [api::home-page.home-page] locale: ro
    ...

🎉 Successfully migrated all internationalized content to Strapi!
```

The script is **idempotent**: if you run it again in the future, it updates existing records without creating duplicates.

---

## 3. Verification

### 1. Verify Strapi API Output
From the production host, verify that the REST endpoint serves localized content:

```bash
# Test English (default)
curl -s "http://localhost:1337/api/home-page?locale=en" | grep "heroTitle"

# Test Romanian
curl -s "http://localhost:1337/api/home-page?locale=ro" | grep "heroTitle"
```
You should see the Romanian translation for the hero title.

### 2. Verify in Strapi Admin
1. Open the Strapi Admin panel (`https://your-domain/strapi/admin` or `http://your-server-ip:1337/strapi/admin`).
2. Go to **Content Manager** in the left sidebar.
3. Under **Single Types**, select any page (e.g., **Home Page** or **Global**).
4. Use the **Internationalization** locale dropdown in the top-right corner to switch between languages (e.g., `English (en)`, `Română (ro)`).
5. All fields for each locale will be populated and ready for authors to edit.

### 3. Verify on the Next.js Frontend
1. Navigate to the website in your browser.
2. Click the language selector in the navbar and choose **Română** (or any other language).
3. Confirm that the navigation menu, hero text, section headers, and footer elements update dynamically to the selected language.

---

## 4. Advanced / Troubleshooting

### How do I run with custom translation files without rebuilding the Docker image?
If authors have updated translation JSON files on the host and you wish to run the migration without building a new image:

```bash
# Copy your custom JSON files from the host into the running container
docker cp ./path/to/my/messages/. $(docker compose -f docker-compose.prod.yml ps -q strapi):/app/messages/

# Run the migration
docker compose -f docker-compose.prod.yml exec strapi npm run migrate:i18n
```

### Clearing Next.js Fetch Cache
If the Next.js frontend has cached previous API responses:
```bash
docker compose -f docker-compose.prod.yml restart nextjs
```
