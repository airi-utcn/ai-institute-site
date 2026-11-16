'use strict';

/**
 * Consolidate single-type documents.
 *
 * Strapi single types are expected to have ONE document id shared by every
 * locale and by the draft + published versions. Some databases (including the
 * one this script was written for) contain one document per locale instead,
 * plus duplicated rows for the same locale/status. The Content Manager then
 * updates the "first" document it finds, which can be a different document
 * from the one it loaded. The visible symptoms are:
 *
 *   - saving a single type appears to succeed, but the form reverts;
 *   - edits show up in the preview/frontend but not in the editor (or vice
 *     versa);
 *   - `Some of the provided components in <field> are not related to the
 *     entity` when the type has components/dynamic zones.
 *
 * This script:
 *   1. picks one canonical document per single type (the one with the most
 *      component links, then the one with an English row, then the most recent
 *      update, then the lowest row id);
 *   2. keeps one row per locale + draft/published status (preferring the
 *      canonical document, then the most recently updated row);
 *   3. deletes the duplicate rows;
 *   4. rewrites the remaining rows to the canonical document id.
 *
 * It is idempotent and dry-run by default.
 *
 * Usage:
 *   npm run repair:single-types            # show the plan
 *   npm run repair:single-types -- --apply # execute it
 *
 * Back up the database before running with --apply.
 */

const { createStrapi, compileStrapi } = require('@strapi/strapi');

const APPLY = process.argv.includes('--apply');

const META_COLUMNS = new Set(['id', 'created_by_id', 'updated_by_id']);

const byLatest = (a, b) => {
  const aTime = a.updated_at ? new Date(a.updated_at).getTime() : 0;
  const bTime = b.updated_at ? new Date(b.updated_at).getTime() : 0;
  if (aTime !== bTime) return bTime - aTime;
  return Number(b.id) - Number(a.id);
};

async function componentCountsFor(knex, cmpsTable) {
  const exists = await knex.schema.hasTable(cmpsTable);
  if (!exists) return null;

  const rows = await knex(cmpsTable)
    .select('entity_id')
    .count({ count: '*' })
    .groupBy('entity_id');

  return new Map(rows.map((row) => [Number(row.entity_id), Number(row.count)]));
}

function pickCanonicalDocument(rows, componentCounts) {
  const docs = new Map();

  for (const row of rows) {
    const id = row.document_id;
    const count = componentCounts?.get(Number(row.id)) || 0;
    const entry = docs.get(id) || {
      documentId: id,
      componentCount: 0,
      hasEnglish: false,
      latestUpdate: 0,
      minRowId: Infinity,
    };

    entry.componentCount += count;
    entry.hasEnglish = entry.hasEnglish || row.locale === 'en';
    entry.latestUpdate = Math.max(
      entry.latestUpdate,
      row.updated_at ? new Date(row.updated_at).getTime() : 0
    );
    entry.minRowId = Math.min(entry.minRowId, Number(row.id));
    docs.set(id, entry);
  }

  return [...docs.values()].sort((a, b) => {
    if (a.componentCount !== b.componentCount) return b.componentCount - a.componentCount;
    if (a.hasEnglish !== b.hasEnglish) return a.hasEnglish ? -1 : 1;
    if (a.latestUpdate !== b.latestUpdate) return b.latestUpdate - a.latestUpdate;
    return a.minRowId - b.minRowId;
  })[0];
}

function groupKey(row) {
  return `${row.locale}::${row.published_at ? 'published' : 'draft'}`;
}

function hasDirectRelationOnlyOnDuplicate(duplicate, preferred) {
  for (const column of Object.keys(duplicate)) {
    if (META_COLUMNS.has(column) || !column.endsWith('_id')) continue;
    if (column === 'document_id') continue;
    if (duplicate[column] != null && preferred[column] == null) return column;
  }
  return null;
}

async function planType(knex, model) {
  const table = model.collectionName;
  const rows = await knex(table).select('*');
  if (!rows.length) return null;

  const cmpsTable = `${table}_cmps`;
  const componentCounts = await componentCountsFor(knex, cmpsTable);
  const canonical = pickCanonicalDocument(rows, componentCounts);

  const groups = new Map();
  for (const row of rows) {
    const key = groupKey(row);
    const group = groups.get(key) || [];
    group.push(row);
    groups.set(key, group);
  }

  const keep = [];
  const remove = [];
  const blocked = [];

  for (const [key, group] of groups) {
    const sorted = [...group].sort(byLatest);
    const preferred =
      sorted.find((row) => row.document_id === canonical.documentId) || sorted[0];

    keep.push(preferred);
    const duplicates = group.filter((row) => row.id !== preferred.id);

    for (const duplicate of duplicates) {
      const duplicateComponents = componentCounts?.get(Number(duplicate.id)) || 0;
      const preferredComponents = componentCounts?.get(Number(preferred.id)) || 0;
      const directRelation = hasDirectRelationOnlyOnDuplicate(duplicate, preferred);

      if (duplicateComponents > preferredComponents) {
        blocked.push(
          `${table} ${key}: row ${duplicate.id} has ${duplicateComponents} components ` +
            `but row ${preferred.id} has ${preferredComponents}`
        );
        continue;
      }

      if (directRelation) {
        blocked.push(
          `${table} ${key}: row ${duplicate.id} has ${directRelation} but row ${preferred.id} does not`
        );
        continue;
      }

      remove.push(duplicate);
    }
  }

  return {
    table,
    rowCount: rows.length,
    canonical,
    keep,
    remove,
    blocked,
    componentCounts,
  };
}

async function applyPlan(knex, plan) {
  await knex.transaction(async (trx) => {
    if (plan.remove.length) {
      await trx(plan.table).whereIn('id', plan.remove.map((row) => row.id)).del();
    }

    const keepIds = plan.keep.map((row) => row.id);
    if (keepIds.length) {
      await trx(plan.table)
        .whereIn('id', keepIds)
        .update({ document_id: plan.canonical.documentId });
    }
  });
}

async function verify(knex, model) {
  const table = model.collectionName;
  const docs = await knex(table).countDistinct({ count: 'document_id' }).first();
  const duplicates = await knex(table)
    .select('locale', knex.raw('(published_at IS NOT NULL) AS published'))
    .count({ count: '*' })
    .groupBy('locale', knex.raw('(published_at IS NOT NULL)'))
    .havingRaw('count(*) > 1');

  return {
    table,
    documents: Number(docs?.count || 0),
    duplicateGroups: duplicates.length,
  };
}

async function run() {
  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();
  app.log.level = 'error';

  const knex = app.db.connection;
  const models = Object.values(app.contentTypes).filter(
    (model) => model.uid.startsWith('api::') && model.kind === 'singleType'
  );

  const plans = [];
  for (const model of models) {
    const plan = await planType(knex, model);
    if (plan) plans.push(plan);
  }

  console.log(`\nSingle types found: ${plans.length}`);
  console.log(APPLY ? 'Mode: APPLY\n' : 'Mode: DRY RUN (pass --apply to write)\n');

  for (const plan of plans) {
    const docCount = new Set(plan.keep.map((row) => row.document_id)).size;
    console.log(`• ${plan.table}`);
    console.log(
      `    rows=${plan.rowCount} keep=${plan.keep.length} delete=${plan.remove.length} ` +
        `blocked=${plan.blocked.length} documentsInPlan=${docCount} ` +
        `canonical=${plan.canonical.documentId} components=${plan.canonical.componentCount}`
    );

    if (plan.remove.length) {
      const removed = plan.remove
        .map((row) => `${row.id}/${row.locale}/${row.published_at ? 'pub' : 'draft'}`)
        .join(', ');
      console.log(`    remove rows: ${removed}`);
    }

    for (const warning of plan.blocked) {
      console.log(`    ⛔ ${warning}`);
    }
  }

  const changes = plans.filter(
    (plan) =>
      plan.blocked.length === 0 &&
      (plan.remove.length > 0 ||
        plan.keep.some((row) => row.document_id !== plan.canonical.documentId))
  );

  const blocked = plans.filter((plan) => plan.blocked.length > 0);

  if (blocked.length) {
    console.log(
      `\n${blocked.length} single type(s) were blocked because deleting a duplicate ` +
        'could lose components or relations:'
    );
    for (const plan of blocked) console.log(`  ⛔ ${plan.table}`);
    console.log('Resolve these manually before re-running.');
  }

  if (!changes.length) {
    console.log('\nNo safe automatic changes left.');
  } else if (APPLY) {
    for (const plan of changes) {
      await applyPlan(knex, plan);
      console.log(`\n✅ Consolidated ${plan.table}`);
    }
  } else {
    console.log(
      `\n${changes.length} single type(s) need consolidation. ` +
        'Review the plan, back up the database, then re-run with --apply.'
    );
  }

  if (APPLY) {
    console.log('\nVerification:');
    for (const plan of plans) {
      const model = models.find((m) => m.collectionName === plan.table);
      const result = await verify(knex, model);
      console.log(
        `  ${result.table}: documents=${result.documents} duplicateGroups=${result.duplicateGroups}`
      );
    }
  }

  await app.destroy();
  process.exit(0);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
