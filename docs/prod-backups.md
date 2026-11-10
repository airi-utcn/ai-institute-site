# Production backups and restore

`compose.prod.yaml` writes database dumps and file snapshots to
`${BACKUP_DIR:-./backups}` on the production host. The backup containers run
immediately when they start, then every 24 hours.

The defaults are intentionally simple and work on a single machine. They are not
off-site backups. See [Moving a copy off the machine](#moving-a-copy-off-the-machine).

## What is backed up

| Data | Stored in | Snapshot service | Backup file |
|---|---|---|---|
| Strapi/PostgreSQL database | `pgdata` volume | `db-backup` | `backup_<timestamp>.dump` |
| Strapi uploaded media | `./uploads` bind mount | `files-backup` | `strapi-uploads_<timestamp>.tar.gz` |
| Snipe-IT/MySQL database | `mysql-snipeit-data` volume | `snipeit-db-backup` | `snipeit_<timestamp>.sql.gz` |
| Snipe-IT files | `snipeit-data` volume | `files-backup` | `snipeit-data_<timestamp>.tar.gz` |
| paper-sync artifacts/cache | `paper-sync-outputs` volume | `files-backup` | `paper-sync-outputs_<timestamp>.tar.gz` |

`nextjs` and `watchtower` do not keep persistent application data in this stack.
`paper-sync` writes generated graph artifacts and its fetch cache to its volume,
which is also snapshotted. Content changes made by `paper-sync` go through
Strapi, so those changes are covered by the PostgreSQL dump.

The `.env` file is **not** copied into the backup directory because it contains
secrets. Keep a copy in a password manager or another secure location. A database
dump alone is not enough for a full disaster recovery if the application secrets
and Snipe-IT `APP_KEY` are lost.

## Schedule and retention

- A snapshot is taken once when the backup container starts, then every 24 hours.
- `BACKUP_RETENTION_DAYS` controls retention. The default is `7`.
- Dumps/archives are written to a temporary file first, then renamed. A failed
  dump does not leave a usable-looking partial backup.
- Files are created as root with `umask 077`, so on the host they are readable
  only with `sudo`. The commands below run inside the backup containers, which
  avoids needing root for restores and verification.
- The backup containers are excluded from Watchtower updates.

## Moving a copy off the machine

The simplest option is to mount an external disk or network share and point
`BACKUP_DIR` at it:

```env
BACKUP_DIR=/mnt/backups/ai-institute-site
BACKUP_RETENTION_DAYS=7
```

To copy the files as your normal user without `sudo`, stream an archive from the
backup container and send it wherever you want:

```bash
ARCHIVE="ai-institute-backups-$(date +%F).tar.gz"
docker compose -f compose.prod.yaml run --rm --no-deps --entrypoint tar db-backup \
  -C /backups -czf - . > "$ARCHIVE"
scp "$ARCHIVE" backup-host:/srv/backups/
```

Or, if you have root access on the host:

```bash
sudo rsync -av --delete backups/ backup-host:/srv/backups/ai-institute-site/
```

Backups contain personal data, password hashes, API tokens, and application
content. Encrypt them at rest and in transit. A tool such as `restic` or
`rclone` with an encrypted remote is a good fit if you want off-site copies.

## Restore the PostgreSQL database

Stop the services that write to the database first:

```bash
docker compose -f compose.prod.yaml stop strapi nextjs paper-sync
```

Restore a dump (this replaces existing objects). Running `pg_restore` inside the
backup container gives it access to the root-owned backup file:

```bash
docker compose -f compose.prod.yaml run --rm --no-deps --entrypoint sh db-backup -c \
  'pg_restore -U "$PGUSER" -d "$PGDATABASE" --clean --if-exists /backups/backup_YYYY-MM-DD_HH-MM-SS.dump'
```

Start the services again:

```bash
docker compose -f compose.prod.yaml start strapi nextjs paper-sync
```

Remove `--clean --if-exists` when restoring into a genuinely empty database.
`pg_restore` can return a non-zero status for harmless warnings; inspect the
output before assuming the restore failed.

## Restore the Snipe-IT MySQL database

Stop Snipe-IT and its backup container so they cannot write during the restore:

```bash
docker compose -f compose.prod.yaml stop snipe-it snipeit-db-backup
```

Load a compressed dump from inside a one-off backup container:

```bash
docker compose -f compose.prod.yaml run --rm --no-deps --entrypoint sh snipeit-db-backup -c \
  'gunzip -c /backups/snipeit_YYYY-MM-DD_HH-MM-SS.sql.gz | MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -h "$MYSQL_HOST" -u root "$MYSQL_DATABASE"'
```

Start the services again:

```bash
docker compose -f compose.prod.yaml start snipe-it snipeit-db-backup
```

The dump contains `DROP TABLE IF EXISTS` statements for the tables it contains.
If you need a completely clean database (for example, to remove tables added
after the backup), recreate the Snipe-IT database before loading the dump.

## Restore file snapshots

Stop the services that use the files:

```bash
docker compose -f compose.prod.yaml stop strapi snipe-it paper-sync
```

Restore Strapi uploads:

```bash
docker compose -f compose.prod.yaml --profile tools run --rm files-restore -c \
  'tar -xzf /backups/strapi-uploads_YYYY-MM-DD_HH-MM-SS.tar.gz -C /data'
```

Restore Snipe-IT files:

```bash
docker compose -f compose.prod.yaml --profile tools run --rm files-restore -c \
  'tar -xzf /backups/snipeit-data_YYYY-MM-DD_HH-MM-SS.tar.gz -C /data'
```

Restore paper-sync artifacts/cache:

```bash
docker compose -f compose.prod.yaml --profile tools run --rm files-restore -c \
  'tar -xzf /backups/paper-sync-outputs_YYYY-MM-DD_HH-MM-SS.tar.gz -C /data'
```

These commands overlay the snapshot onto the current files. That is the safer
default: if the archive is bad, the current files are not deleted first. If you
need an exact rollback, verify the archive and then remove the target contents
before extracting.

Start the services again:

```bash
docker compose -f compose.prod.yaml start strapi snipe-it paper-sync
```

The `files-restore` helper is in the `tools` profile, so a normal
`docker compose up -d` never starts it.

## Verify a backup

Check that a dump is complete before relying on it:

```bash
# PostgreSQL: list the archive contents
docker compose -f compose.prod.yaml run --rm --no-deps --entrypoint sh db-backup -c \
  'pg_restore --list /backups/backup_YYYY-MM-DD_HH-MM-SS.dump'

# MySQL: check the gzip stream and inspect the SQL header
docker compose -f compose.prod.yaml run --rm --no-deps --entrypoint sh snipeit-db-backup -c \
  'gzip -t /backups/snipeit_YYYY-MM-DD_HH-MM-SS.sql.gz && gunzip -c /backups/snipeit_YYYY-MM-DD_HH-MM-SS.sql.gz | head -30'

# File snapshots: list without extracting
docker compose -f compose.prod.yaml run --rm --no-deps --entrypoint sh files-backup -c \
  'tar -tzf /backups/strapi-uploads_YYYY-MM-DD_HH-MM-SS.tar.gz | head'
docker compose -f compose.prod.yaml run --rm --no-deps --entrypoint sh files-backup -c \
  'tar -tzf /backups/snipeit-data_YYYY-MM-DD_HH-MM-SS.tar.gz | head'
docker compose -f compose.prod.yaml run --rm --no-deps --entrypoint sh files-backup -c \
  'tar -tzf /backups/paper-sync-outputs_YYYY-MM-DD_HH-MM-SS.tar.gz | head'
```

Restore into a temporary database or a disposable copy of the stack at least
once, and repeat the test after major application upgrades.
