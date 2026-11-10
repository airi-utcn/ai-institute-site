# Workflow Notes (PROD ADMIN)

This folder holds GitHub Actions workflows.

Compose files: `compose.yaml` (local, production-like), `compose.dev.yaml` (development), `compose.prod.yaml` (production server).

## Image builds (`deploy.yml`)

- Runs on pushes to `master` and on manual dispatch.
- Changes that cannot affect an image — Markdown, `docs/`, the compose files, `scripts/`, and tooling folders — are ignored via `paths-ignore`.
- A `changes` job detects which service changed, so only the affected images are rebuilt: `server`, `web`, `paper-sync`, `snipe-it`. A manual dispatch rebuilds all of them.
- CI does not pull base images from public registries. Everything comes from GHCR:
  - `node:22-alpine`, `python:3.12-slim`, `moby/buildkit`, and `snipe/snipe-it` are mirrored into GHCR by `_mirror-images.yml`.
  - The Dockerfiles default to `public.ecr.aws/...` for local builds; `_build-image.yml` passes `NODE_IMAGE` / `PYTHON_IMAGE` build args that point at the GHCR mirrors.
  - `deploy.yml` calls the mirror workflow first, so a missing tag is copied before the builds start. Once a tag exists, only GHCR is contacted.

### Bumping mirrored versions

1. Update `NODE_VERSION` / `PYTHON_VERSION` / `SNIPE_IT_VERSION` / `BUILDKIT_VERSION` in `_mirror-images.yml`.
2. Update the matching `ARG` default in the Dockerfile and `BUILDKIT_VERSION` in `_build-image.yml`.
3. Merge. The next build copies the new tag, then uses it.

Why mirror at all: Docker Hub rate-limits anonymous pulls, and ECR Public caps anonymous use at **500 GB/month** (plus 1 pull/second). GitHub-hosted runners share IPs, so neither is reliable for CI. A pinned GHCR copy removes both.

The mirror packages are private by default and CI authenticates with `GITHUB_TOKEN`. A local build of `snipe-it/` needs `docker login ghcr.io`, or pass `--build-arg SNIPE_IT_IMAGE=snipe/snipe-it:v8.8.3`. The service Dockerfiles work locally without a login because they default to ECR Public.

## Backups (prod compose)

The production compose file includes daily backup services for both databases
and for uploaded files. They write to `${BACKUP_DIR:-./backups}` on the server
and keep the last `BACKUP_RETENTION_DAYS` (default: 7) snapshots.

See [docs/prod-backups.md](../../docs/prod-backups.md) for the full state
inventory, off-machine copy instructions, restore commands, and verification
steps.

## Restore Images from github (example)

1. Look in the repo for an image that is old enough:
2. Copy the SHA
3. Then change in the docker compose

```
image: ghcr.io/airi-utcn/ai-institute-site/web:abc123def
image: ghcr.io/airi-utcn/ai-institute-site/server:abc123def
```

4. Then `docker compose -f compose.prod.yaml up -d`