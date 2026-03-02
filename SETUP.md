# Development Setup Guide

This guide covers detailed setup instructions and troubleshooting for developing the AI Institute website.

## Table of Contents

- [Environment Setup](#environment-setup)
- [Running with Docker](#running-with-docker)
- [Local Development](#local-development)
- [Database and Migrations](#database-and-migrations)
- [Strapi Development](#strapi-development)
- [Next.js Development](#nextjs-development)
- [Troubleshooting](#troubleshooting)

## Environment Setup

### Prerequisites

Ensure you have the following installed:
- **Docker Desktop** (or Docker Engine + Docker Compose)
- **Node.js 18+** and npm
- **Git**
- A code editor (VS Code recommended)

### Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Update the following variables in `.env`:

   **For Development:**
   - Update only the STRAPI_API_TOKEN with the key found in the admin pannel of Strapi (Settings -> API Tokens -> Read Only)

   **For Production:**
   - Generate secure secrets for all Strapi keys:
     ```bash
     # Generate random strings
     openssl rand -base64 32
     ```
   - Update `PUBLIC_STRAPI_URL` to your production domain
   - Use strong database passwords
   - Set `NODE_ENV=production`
   - Update STRAPI_API_TOKEN same as in dev env.

## Running with Docker

This project has **two Docker Compose configurations** with different purposes:

| File | Purpose |
|---|---|
| `docker-compose.yml` | Simulates the **production environment** — full image builds, `npm start` / `next start`. Use this to verify production-like behavior. |
| `docker-compose.dev.yml` | **Active development** — lightweight dev images with `strapi develop` and `next dev --turbopack`. File changes are synced instantly via Docker Compose Watch; no rebuilds needed. |

### Active Development (Recommended)

Use Docker Compose Watch for day-to-day development. It syncs your local source files directly into the running containers, so Strapi's built-in watcher and Next.js's Turbopack HMR pick up changes instantly — **no image rebuilds required**.

```bash
# First time: build dev images and start the watch loop
docker compose -f docker-compose.dev.yml watch

# Ctrl+C stops the watch loop. Bring the stack down with:
docker compose -f docker-compose.dev.yml down

# View logs while watching (separate terminal)
docker compose -f docker-compose.dev.yml logs -f strapi
docker compose -f docker-compose.dev.yml logs -f nextjs
```

What gets synced automatically:
- `server/src/` and `server/config/` → Strapi (reloads on save)
- `web/src/` and `web/public/` → Next.js (HMR on save)
- Either `package.json` → triggers a container rebuild (rare)

### Production Simulation

Use the default `docker-compose.yml` to test the full production build locally (full image builds, admin bundle compiled ahead of time, `npm start`).

```bash
# Build and start containers (can be run from anywhere in the project)
docker compose up --build

# Wait for Strapi to initialize (check logs for "Server started")
# Then open http://localhost:1337 and create admin user. If it redirects wrong, try again
# The frontend will be at http://localhost:3000

# Start previously built containers (no rebuild)
docker compose upand

# Stop containers (Ctrl+C, then)
docker compose down

# Rebuild after changes
docker compose up --build

# View logs
docker compose logs -f strapi
docker compose logs -f nextjs
```

### Accessing Containers

```bash
# Enter Strapi container
docker exec -it ai-institute-site-strapi-1 /bin/sh

# Enter Next.js container
docker exec -it ai-institute-site-web-1 /bin/sh

# View database
docker exec -it ai-institute-site-postgres-1 psql -U strapi -d strapi
```

## Local Development

Running services locally gives faster iteration, and allows Strapi schema changes, which will not be persisted if ran in containers. 
Do keep in mind, you can really only work on services independently, so you can't test API calls and such. 

### Backend (Strapi)

```bash
cd server

# Install dependencies
npm install

# Run in development mode (with auto-reload)
npm run develop

# Build admin panel
npm run build

# Run in production mode
npm start
```

**Strapi will be available at:**
- Admin: http://localhost:1337/strapi/admin
- API: http://localhost:1337/api

### Frontend (Next.js)

```bash
cd web

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Generate static export
npm run export
```

**Next.js will be available at:**
- http://localhost:3000

## Database and Migrations

### Migrating Legacy Data

The project includes a script to import JSON data into Strapi. Serves as a good start for testing purposes. 

```bash
# If using Docker:
docker cp web/src/app/data ai-institute-site-strapi-1:/app/migration-data
docker exec -it ai-institute-site-strapi-1 /bin/sh -c \
  "MIGRATION_DATA_ROOT=/app/migration-data node /app/scripts/migrate-json.js"

# If running Strapi locally:
cd server
MIGRATION_DATA_ROOT=../web/src/app/data node scripts/migrate-json.js
```

This script:
- Imports people, projects, publications, resources, etc.
- Automatically publishes content
- Is idempotent (safe to run multiple times)

### Database Operations

```bash
# Reset database (Docker)
docker compose down -v  # Removes volumes, data WILL be lost.
docker compose up --build

# Backup database (custom format — required for pg_restore)
docker exec ai-institute-site-postgres-1 pg_dump -U strapi -Fc strapi > backup.dump

# Restore database
# IMPORTANT: use pg_restore (not psql) and always pass -U, otherwise PostgreSQL
# tries to connect as your OS user (e.g. root) and throws "role root does not exist".
docker exec -i ai-institute-site-postgres-1 pg_restore -U strapi -d strapi < backup.dump
```

## Strapi Development

### Content Type Development

Ideally, all changes should be made from the admin interface, but if you want to go "manual"...

When creating or modifying content types:

1. Edit files in `server/src/api/*/content-types/`
2. Restart Strapi to apply changes:
   ```bash
   # Docker: requires rebuild
   docker compose up --build

   # Local: automatic reload in dev mode
   npm run develop
   ```

3. Verify in admin panel
4. Test API endpoints

### Understanding Strapi States

- **Draft** - Content exists but not published
- **Published** - Content is live
- Use `?publicationState=preview` in API calls to see both states

### API Testing

```bash
# Get all published projects
curl http://localhost:1337/api/projects

# Get projects with populated relations
curl http://localhost:1337/api/projects?populate=*

# Preview draft and published content
curl 'http://localhost:1337/api/projects?publicationState=preview'
```

### Admin Panel Tips

- **First run:** Create an admin user at `/strapi/admin`
- **Content types:** Manage in Content-Type Builder
- **Permissions:** Configure in Settings > Roles
- **Media:** Upload in Media Library

## Next.js Development

### Project Structure

```
web/src/
├── app/              # App router pages
│   ├── page.js      # Homepage
│   ├── layout.js    # Root layout
│   ├── about/       # About page
│   ├── research/    # Research sections
│   └── ...
├── components/       # Reusable components
└── lib/             # Utility functions
    └── strapi.js    # Strapi API client
```

### Fetching Data from Strapi

Check the Strapi.js file. Should give you info on how we roll at the moment. 

### Environment Variables

Next.js uses:
- `PUBLIC_STRAPI_URL` - Strapi API endpoint
- `STRAPI_API_TOKEN` - Authentication token (if required)

## Troubleshooting

### Strapi Issues

**Problem:** Schema changes not reflected
```bash
# Solution: Rebuild containers
docker compose down
docker compose up --build
```

**Problem:** Can't access admin panel
- Check `STRAPI_ADMIN_URL` in `.env` matches your path
- Verify container is running: `docker compose ps`
- Check logs: `docker compose logs strapi`

**Problem:** API returns empty data
- Verify content is published in admin panel
- Check permissions in Settings > Roles > Public
- Test with `?publicationState=preview`

### Next.js Issues

**Problem:** Can't fetch data from Strapi
- Verify `PUBLIC_STRAPI_URL` in `.env`
- Check Strapi is running and accessible
- Test API endpoint directly with curl
- Check docker logs

**Problem:** Build fails
```bash
# Clear cache and rebuild
cd web
rm -rf .next
npm run build
```

### Docker Issues

**Problem:** Port already in use
```bash
# Find what's using the port
lsof -i :3000
lsof -i :1337

# Stop the process or change ports in docker-compose.yml
```

**Problem:** Out of disk space
```bash
# Remove all containers, images and networks that are not running right now.
# Be advised, you'll have to build from scratch afterwards. 
docker system prune -a

# Remove volumes (WARNING: deletes database)
docker compose down -v
```

### Database Issues

**Problem:** Connection refused
- Verify PostgreSQL container is running
- Check `DATABASE_HOST` matches service name in docker-compose.yml
- Wait a few seconds for PostgreSQL to fully start

**Problem:** Migration script fails
- Ensure data directory path is correct
- Check file permissions
- Verify Strapi is fully started before running migration

## Development Tips

1. **Hot Reload:** Use `npm run develop` for Strapi and `npm run dev` for Next.js
2. **Logs:** Always check logs when something doesn't work
3. **Docker Volumes:** Data persists in volumes even when containers stop
4. **Schema Changes:** Always require Strapi restart/rebuild
5. **Git:** Don't commit `.env`, `node_modules`, or build artifacts

## Need More Help?

- Check the [main README](./README.md)
- Review [Strapi Documentation](https://docs.strapi.io/)
- Review [Next.js Documentation](https://nextjs.org/docs)
- Open an issue on GitHub
