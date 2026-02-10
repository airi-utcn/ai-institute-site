# Workflow Notes (PROD ADMIN)

This folder holds GitHub Actions workflows.

## Database backup (prod compose)

The production compose file includes a simple backup service that:
- runs `pg_dump` once per day
- writes to `./backups` on the server
- deletes backups older than 7 days

### Restore DB (example)

1. Pick a backup file name from the server:
	- backups/backup_YYYY-MM-DD_HH-MM-SS.dump
2. Restore into the database:

```
docker compose exec -T postgres pg_restore -d $POSTGRES_DB < backups/backup_YYYY-MM-DD_HH-MM-SS.dump
```

Notes:
- Run this on the server where the backups live.
- This is a full database restore from a custom-format dump.

## Restore Images from github (example)

1. Look in the repo for an image that is old enough:
2. Copy the SHA
3. Then change in the docker compose

```
image: ghcr.io/airi-utcn/ai-institute-site/web:abc123def
image: ghcr.io/airi-utcn/ai-institute-site/strapi:abc123def
```

4. Then `docker compose up -d`