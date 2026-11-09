import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildSlugBase,
  generateSlug,
  pickUniqueSlug,
  registerSlugMiddleware,
} from '../src/utils/slug.ts';

const partnerContentType = {
  options: { draftAndPublish: true },
  pluginOptions: { i18n: { localized: true } },
  attributes: { slug: { type: 'uid', targetField: 'name' } },
};

const publicationContentType = {
  options: { draftAndPublish: true },
  pluginOptions: { i18n: { localized: true } },
  attributes: { slug: { type: 'uid', targetField: 'title' } },
};

const matches = (row, where) =>
  Object.entries(where).every(([key, expected]) => {
    if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
      if ('$startsWith' in expected) {
        return String(row[key] || '').startsWith(expected.$startsWith);
      }
      if ('$ne' in expected) {
        return row[key] !== expected.$ne;
      }
      if ('$notNull' in expected) {
        return expected.$notNull ? row[key] != null : row[key] == null;
      }
    }
    return row[key] === expected;
  });

const createHarness = ({ contentType, rows = [] }) => {
  const middlewares = [];
  const updates = [];

  const strapi = {
    documents: {
      use(middleware) {
        middlewares.push(middleware);
      },
    },
    contentType() {
      return contentType;
    },
    db: {
      query() {
        return {
          findOne: async ({ where }) => rows.find((row) => matches(row, where)) ?? null,
          findMany: async ({ where }) => rows.filter((row) => matches(row, where)),
          updateMany: async (options) => {
            updates.push(options);
            return { count: 1 };
          },
        };
      },
    },
  };

  registerSlugMiddleware(strapi);

  return { middleware: middlewares[0], rows, updates };
};

const runMiddleware = async (middleware, ctx) => {
  const context = {
    ...ctx,
    params: { ...ctx.params, data: { ...ctx.params.data } },
  };
  let nextCalled = false;
  const result = await middleware(context, async () => {
    nextCalled = true;
    return { documentId: ctx.params.documentId || 'new-document' };
  });
  return { context, result, nextCalled };
};

test('slug helpers normalize values and append suffixes', () => {
  assert.equal(generateSlug('  Știință & AI  '), 'stiinta-ai');
  assert.equal(buildSlugBase('api::partner.partner', 'Partner'), 'partner');
  assert.equal(
    buildSlugBase('api::publication.publication', 'A Great Paper', 2024),
    'a-great-paper-2024',
  );
  assert.equal(pickUniqueSlug('partner', []), 'partner');
  assert.equal(pickUniqueSlug('partner', ['partner']), 'partner-1');
  assert.equal(pickUniqueSlug('partner', ['partner', 'partner-1']), 'partner-2');
});

test('creating an entry with a duplicate slug picks a free suffix', async () => {
  const { middleware } = createHarness({
    contentType: partnerContentType,
    rows: [
      { documentId: 'first', locale: 'en', slug: 'partner', name: 'Partner' },
      { documentId: 'second', locale: 'en', slug: 'partner-1', name: 'Partner' },
    ],
  });

  const { context } = await runMiddleware(middleware, {
    uid: 'api::partner.partner',
    action: 'create',
    params: { locale: 'en', data: { name: 'Partner' } },
  });

  assert.equal(context.params.data.slug, 'partner-2');
});

test('renaming regenerates a duplicate slug instead of leaving publication blocked', async () => {
  const { middleware } = createHarness({
    contentType: partnerContentType,
    rows: [
      {
        id: 1,
        documentId: 'first',
        locale: 'en',
        slug: 'partner',
        name: 'Partner',
        publishedAt: null,
      },
      {
        id: 2,
        documentId: 'second',
        locale: 'en',
        slug: 'partner',
        name: 'Partner',
        publishedAt: null,
      },
    ],
  });

  const { context } = await runMiddleware(middleware, {
    uid: 'api::partner.partner',
    action: 'update',
    params: {
      documentId: 'second',
      locale: 'en',
      data: { name: 'Acme Research' },
    },
  });

  assert.equal(context.params.data.slug, 'acme-research');
});

test('renaming regenerates the slug even when the admin sends the old slug back', async () => {
  const { middleware } = createHarness({
    contentType: partnerContentType,
    rows: [
      {
        id: 1,
        documentId: 'first',
        locale: 'en',
        slug: 'partner',
        name: 'Partner',
        publishedAt: null,
      },
    ],
  });

  const { context } = await runMiddleware(middleware, {
    uid: 'api::partner.partner',
    action: 'update',
    params: {
      documentId: 'first',
      locale: 'en',
      status: 'draft',
      data: { name: 'Acme Research', slug: 'partner' },
    },
  });

  assert.equal(context.params.data.slug, 'acme-research');
});

test('renaming to an already used slug picks a free suffix', async () => {
  const { middleware } = createHarness({
    contentType: partnerContentType,
    rows: [
      {
        id: 1,
        documentId: 'first',
        locale: 'en',
        slug: 'acme-research',
        name: 'Acme Research',
        publishedAt: null,
      },
      {
        id: 2,
        documentId: 'second',
        locale: 'en',
        slug: 'partner',
        name: 'Partner',
        publishedAt: null,
      },
    ],
  });

  const { context } = await runMiddleware(middleware, {
    uid: 'api::partner.partner',
    action: 'update',
    params: {
      documentId: 'second',
      locale: 'en',
      data: { name: 'Acme Research' },
    },
  });

  assert.equal(context.params.data.slug, 'acme-research-1');
});

test('updating unrelated fields keeps the existing slug', async () => {
  const { middleware } = createHarness({
    contentType: partnerContentType,
    rows: [
      {
        id: 1,
        documentId: 'first',
        locale: 'en',
        slug: 'partner',
        name: 'Partner',
        publishedAt: null,
      },
    ],
  });

  const { context } = await runMiddleware(middleware, {
    uid: 'api::partner.partner',
    action: 'update',
    params: {
      documentId: 'first',
      locale: 'en',
      data: { website: 'https://example.com' },
    },
  });

  assert.equal(context.params.data.slug, undefined);
});

test('publication slugs include the year and stay unique', async () => {
  const { middleware } = createHarness({
    contentType: publicationContentType,
    rows: [
      {
        documentId: 'old',
        locale: 'en',
        slug: 'a-great-paper-2024',
        title: 'A Great Paper',
        year: 2024,
      },
    ],
  });

  const { context } = await runMiddleware(middleware, {
    uid: 'api::publication.publication',
    action: 'create',
    params: { locale: 'en', data: { title: 'A Great Paper', year: 2024 } },
  });

  assert.equal(context.params.data.slug, 'a-great-paper-2024-1');
});

test('translations inherit the canonical slug and localizations are synchronized', async () => {
  const { middleware, updates } = createHarness({
    contentType: partnerContentType,
    rows: [
      {
        id: 1,
        documentId: 'doc-1',
        locale: 'en',
        slug: 'acme-research',
        name: 'Acme Research',
        publishedAt: null,
      },
    ],
  });

  const { context } = await runMiddleware(middleware, {
    uid: 'api::partner.partner',
    action: 'update',
    params: {
      documentId: 'doc-1',
      locale: 'ro',
      data: { name: 'Cercetare Acme' },
    },
  });

  assert.equal(context.params.data.slug, 'acme-research');
  assert.equal(updates.length, 0);

  const defaultLocaleResult = await runMiddleware(middleware, {
    uid: 'api::partner.partner',
    action: 'update',
    params: {
      documentId: 'doc-1',
      locale: 'en',
      data: { name: 'Acme Research Labs' },
    },
  });

  assert.equal(defaultLocaleResult.context.params.data.slug, 'acme-research-labs');
  assert.deepEqual(updates[0], {
    where: { documentId: 'doc-1', locale: { $ne: 'en' } },
    data: { slug: 'acme-research-labs' },
  });
});
