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

### First Time Setup

```bash
# Build and start containers (command can be ran anywhere in project, not necessarily on root)
docker compose up --build

# Wait for Strapi to initialize (check logs for "Server started")
# Then open http://localhost:1337 and create admin user. If it redirects wrong, try again
# The frontend will be at http://localhost:3000
```

### Daily Development

```bash
# Start containers as they were, changes will not be applied (need rebuild for that)
docker compose up

# Stop containers (Ctrl+C, then)
docker compose down

# Rebuild
docker compose up --build

# View logs
docker compose logs -f strapi
docker compose logs -f web
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
- Imports people, projects, publications, datasets, etc.
- Automatically publishes content
- Is idempotent (safe to run multiple times)

### Database Operations

```bash
# Reset database (Docker)
docker compose down -v  # Removes volumes, data WILL be lost.
docker compose up --build

# Backup database
docker exec ai-institute-site-postgres-1 pg_dump -U strapi strapi > backup.sql

# Restore database
docker exec -i ai-institute-site-postgres-1 psql -U strapi strapi < backup.sql
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
