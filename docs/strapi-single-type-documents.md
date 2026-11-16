# Repairing Strapi single-type documents

## Symptoms

- Saving a single type in the Content Manager appears to succeed, but reopening it
  shows the previous values ("it reverts").
- Changes sometimes appear in the frontend/preview but not in the editor (or the
  reverse).
- Editing a single type with components (for example `Global → Navbar`) fails with:

  ```
  Some of the provided components in navbar are not related to the entity
  ```

- New duplicates keep appearing after saves/publishes.

## Root cause

A Strapi single type is expected to have **one `document_id` shared by all
locales**, with one draft row and one published row per locale. In this database
the i18n migration created **one document per locale** instead, and some locales
(usually `en`) ended up with duplicate rows spread over several documents.

The Content Manager's save path (`createOrUpdateDocument`) loads the draft for
the requested locale, but then resolves the target `document_id` with
`strapi.db.query(model).findOne()`, i.e. the first document in the table. When
there are multiple documents:

- the save writes to a different document than the one that was loaded;
- the editor and the public API can read different documents;
- if the write target has no row with the submitted component ids, Strapi throws
  `Some of the provided components in <field> are not related to the entity`.

This is a data-shape problem, not a frontend problem. It cannot be fixed by
clearing the browser cache or re-saving in the admin.

## The repair

`server/scripts/consolidate-single-type-documents.js`:

1. finds every `api::*` single type;
2. picks one canonical `document_id` per type (most component links, then the
   document that has an `en` row, then the most recent update, then the lowest
   row id);
3. keeps one draft row and one published row per locale, preferring the
   canonical document and then the most recently updated row;
4. deletes the other duplicate rows;
5. rewrites the remaining rows to the canonical `document_id`.

It is **dry-run by default**, idempotent, and refuses to delete a duplicate when
that would lose components or direct relations (`*_id` columns).

### 1. Back up the database

Always take a full backup first.

```bash
docker compose -f compose.prod.yaml exec -T postgres \
  sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-privileges' \
  > strapi-before-single-type-repair.sql
```

### 2. Review the plan (dry run)

Run the script as a **separate one-off container** so it does not share the
live server's compiled `dist` directory:

```bash
docker compose -f compose.prod.yaml run --rm --no-deps strapi \
  npm run repair:single-types
```

Read the output. Types that still have one document per locale will show
`documentsInPlan` greater than 1 in the dry run — that is the problem being
fixed. Check that `blocked=0` and that the `remove rows` list only contains the
duplicate rows you expect. If a type is blocked, resolve it manually — the
script will not touch it.

### 3. Apply

```bash
docker compose -f compose.prod.yaml run --rm --no-deps strapi \
  npm run repair:single-types -- --apply
```

The script verifies each table afterwards and should report
`documents=1 duplicateGroups=0`.

Where duplicates contained different copy, the script keeps the newest row per
locale/status and discards the older one. Spot-check the affected pages after
applying, and re-enter any content that only existed in a discarded test row.

### 4. Verify in the admin

Open a single type, change a small field, click **Save**, then reload the page.
The value should persist. Repeat for the `Global → Navbar` save that previously
failed.

### 5. Refresh the public pages

The repair writes directly to the database, so it does **not** emit Strapi
webhooks. After applying it, refresh the affected Next.js pages once — either
call the revalidation endpoint or restart the `nextjs` service:

```bash
curl -X POST https://<site>/api/revalidate \
  -H "x-revalidate-secret: $REVALIDATION_SECRET" \
  -H 'Content-Type: application/json' \
  -d '{"paths":["/","/people","/news&events/awards"]}'
```

Draft saves and publishes made in the admin afterwards are handled by the
webhook described below.

## Revalidation webhook

Fixing persistence is only half of the pipeline: the Next.js app caches Strapi
responses, so the public site also needs a revalidation call.

In **Settings → Webhooks**, the Strapi webhook should be:

- **URL:** `https://<site>/api/revalidate`
- **Header:** `x-revalidate-secret: <REVALIDATION_SECRET>` (the same value as the
  Next.js `REVALIDATION_SECRET` environment variable)
- **Events:** at least `entry.publish` and `entry.unpublish`; include
  `entry.update` / `entry.delete` if you want draft saves to refresh too.
- **Enabled:** yes.

Do not put the secret in the query string. The endpoint rejects `?secret=` by
default; `REVALIDATION_ALLOW_QUERY_SECRET=true` exists only as a temporary
migration escape hatch.

For local Docker development the webhook should target
`http://nextjs:3000/api/revalidate` with the local secret.

## Prevention

`server/scripts/migrate-i18n.js` now:

- deletes every locale of an orphan document (previously it could delete only one
  row, leaving the orphan document alive);
- verifies after each single type that only one `document_id` remains, and warns
  with instructions to run the repair script if not.

If the i18n migration is ever re-run, check its output for these warnings.
