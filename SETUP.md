# Development Setup Guide

This is the canonical setup guide for the main website repo. Use [README.md](README.md) for the high-level project overview, and use [research-paper-graph/README.md](research-paper-graph/README.md) for the publication sync pipeline.

## Prerequisites

Install the tools you need for the parts of the project you plan to work on:

- Docker and Docker Compose
- Node.js 18+ and npm
- Python 3 and pip for the research-paper-graph package
- Git

## Environment Setup

1. Copy the example environment file:

   ```bash
   cp .env.example .env
   ```

2. Fill in the values in `.env`.

   For local development, the important values are the Strapi URL fields and `STRAPI_API_TOKEN`. For production-like runs, also provide strong database passwords and the rest of the Strapi secrets.

3. Create the Strapi API token in the admin panel after the first boot, then copy it into `.env`.

## Docker Workflows

There are two Compose files with different goals:

| File | Purpose |
|---|---|
| `docker-compose.yml` | Production-like build and runtime. Use this to validate the full stack with built assets. |
| `docker-compose.dev.yml` | Active development with `strapi develop` and `next dev --turbopack`. |

The third prod file is specific to our hosting provider and should not be used locally. If anything, feel free to inspire yourself from it with the DB backup container or other gimmicks from there.

### Production-like run

```bash
docker compose up --build
```

Use this when you want to verify the full stack end to end. After Strapi starts, open `/strapi/admin`, create an admin user, and confirm that the frontend can read from the API.

### Active development

```bash
docker compose -f docker-compose.dev.yml watch
```

This mode syncs source files into the running containers and keeps the frontend and backend hot-reloading.

**Be advised:** strapi schema changes will not be persisted to the codebase. Use the local development instructions below for schema work. The DB data will be different, since that mode of running strapi is left default to run on a SQLite instance, not on the postgres container. 

To stop the stack:

```bash
docker compose -f docker-compose.dev.yml down
```

To inspect logs while developing:

```bash
docker compose -f docker-compose.dev.yml logs -f strapi
docker compose -f docker-compose.dev.yml logs -f nextjs
```

## Local Development

Running services directly can be useful when you want to work outside Docker or focus on one service at a time.

### Backend: Strapi

```bash
cd server
npm install
npm run develop
```

Useful follow-ups:

- `npm run build` to rebuild the admin panel
- `npm start` to run the production server

Strapi is available at `http://localhost:1337/strapi/admin` and `http://localhost:1337/api`.

As mentioned above, this mode does not use the postgres container, so the data will be different from the Docker runs. 

### Frontend: Next.js

```bash
cd web
npm install
npm run dev
```

Useful follow-ups:

- `npm run build` to produce a production build
- `npm start` to run the built app
- `npm run export` to generate a static export

The frontend runs at `http://localhost:3000`.

### Research paper graph pipeline

Use [research-paper-graph/README.md](research-paper-graph/README.md) for the full setup and CLI usage. That package reads the repository-root `.env`, so make sure the Strapi settings are in place before running it.

## Data seeding

For the moment, we don't have a standardized way of seeding the database with some test data. This will likely be added in the future, but for now you can use the Strapi admin panel to create entries manually or ask the maintainers for a database dump with some sample data.

### Backup and restore

```bash
docker exec ai-institute-site-postgres-1 pg_dump -U strapi -Fc strapi > backup.dump
docker exec -i ai-institute-site-postgres-1 pg_restore -U strapi -d strapi < backup.dump
```

If you reset the database with Docker, remember that `docker compose down -v` deletes volumes.

## Troubleshooting

If Strapi schema changes do not appear, rebuild the containers with `docker compose up --build`.

If the frontend cannot reach Strapi, verify `PUBLIC_STRAPI_URL` and `STRAPI_API_TOKEN` in `.env`, then check the container logs.

If the migration script fails, make sure Strapi is fully running and that the data path is correct.

## Need More Help?

- Review [CONTRIBUTING.md](CONTRIBUTING.md)
- Review the [Strapi documentation](https://docs.strapi.io/)
- Review the [Next.js documentation](https://nextjs.org/docs)
