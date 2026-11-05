import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

process.env.PREVIEW_SECRET = 'preview-test-secret';

const { previewTargets, PREVIEW_EXCLUDED_CONTENT_TYPES, resolvePreviewPath } = await import(
  '../src/utils/preview-targets.ts'
);
const {
  ALLOWED_PATH_PATTERNS,
  ALLOWED_STATIC_PATHS,
  PREVIEW_COOKIE,
  createPreviewToken,
  isAllowedPreviewPath,
  isValidPreviewSecret,
  resolveExitPath,
  resolvePreviewTarget,
  verifyPreviewToken,
} = await import('../../web/src/lib/preview.js');

const apiRoot = new URL('../src/api/', import.meta.url);

const discoverContentTypes = () => {
  const contentTypes = [];

  for (const apiName of readdirSync(apiRoot, { withFileTypes: true })) {
    if (!apiName.isDirectory()) continue;
    const contentTypesDir = new URL(`${apiName.name}/content-types/`, apiRoot);

    let entries;
    try {
      entries = readdirSync(contentTypesDir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const schemaUrl = new URL(`${entry.name}/schema.json`, contentTypesDir);
      let schema;
      try {
        schema = JSON.parse(readFileSync(schemaUrl, 'utf8'));
      } catch {
        continue;
      }

      contentTypes.push({
        uid: `api::${apiName.name}.${schema.info.singularName}`,
        kind: schema.kind,
        schema,
      });
    }
  }

  return contentTypes;
};

const contentTypes = discoverContentTypes();

const sampleDocument = {
  slug: 'sample-slug',
  title: 'Sample Title',
  year: 2026,
  category: 'announcement',
  macro: { slug: 'sample-macro' },
};

const fakeStrapi = (document = sampleDocument) => ({
  documents: () => ({
    findOne: async () => document,
    findFirst: async () => document,
  }),
});

test('every content type has a preview target', () => {
  const known = new Set(contentTypes.map((entry) => entry.uid));

  for (const { uid } of contentTypes) {
    assert.ok(
      previewTargets[uid] || PREVIEW_EXCLUDED_CONTENT_TYPES.has(uid),
      `missing preview target for ${uid}`,
    );
  }

  for (const uid of Object.keys(previewTargets)) {
    assert.ok(known.has(uid), `preview target references unknown content type ${uid}`);
  }
});

test('every static preview target passes the frontend allowlist', () => {
  for (const [uid, target] of Object.entries(previewTargets)) {
    if (target.type !== 'static') continue;
    assert.ok(
      isAllowedPreviewPath(target.path),
      `${uid} target ${target.path} is not allowed by web/src/lib/preview.js`,
    );
  }
});

test('every document preview target can produce an allowed path', async () => {
  for (const [uid, target] of Object.entries(previewTargets)) {
    if (target.type !== 'document') continue;

    const path = await resolvePreviewPath(
      uid,
      { documentId: 'doc-1', locale: 'en', status: 'draft' },
      fakeStrapi(),
    );

    assert.ok(path, `${uid} did not resolve a path`);
    assert.ok(
      isAllowedPreviewPath(path),
      `${uid} resolved ${path}, which is not allowed by web/src/lib/preview.js`,
    );
  }
});

test('special preview targets build the expected routes', async () => {
  const award = await resolvePreviewPath(
    'api::news-article.news-article',
    { documentId: 'doc-1', status: 'draft' },
    fakeStrapi({ ...sampleDocument, category: 'award' }),
  );
  assert.equal(award, '/news&events/awards/sample-slug');

  const news = await resolvePreviewPath(
    'api::news-article.news-article',
    { documentId: 'doc-1', status: 'draft' },
    fakeStrapi({ ...sampleDocument, category: 'press' }),
  );
  assert.equal(news, '/news&events/news/sample-slug');

  const leadership = await resolvePreviewPath(
    'api::team.team',
    { documentId: 'doc-1', status: 'draft' },
    fakeStrapi({ ...sampleDocument, category: 'leadership' }),
  );
  assert.equal(leadership, '/about/leadership');

  const researchTeam = await resolvePreviewPath(
    'api::team.team',
    { documentId: 'doc-1', status: 'draft' },
    fakeStrapi({ ...sampleDocument, category: 'research' }),
  );
  assert.equal(researchTeam, '/people');

  const publicationWithoutSlug = await resolvePreviewPath(
    'api::publication.publication',
    { documentId: 'doc-1', status: 'draft' },
    fakeStrapi({ title: 'A Great Paper', year: 2024, slug: '' }),
  );
  assert.equal(publicationWithoutSlug, '/research/publications/a-great-paper-2024');

  const meso = await resolvePreviewPath(
    'api::graph-meso.graph-meso',
    { documentId: 'doc-1', status: 'draft' },
    fakeStrapi({ slug: 'topic', macro: { slug: 'macro' } }),
  );
  assert.equal(meso, '/research/paper-graph/macro/topic');

  const mesoWithoutMacro = await resolvePreviewPath(
    'api::graph-meso.graph-meso',
    { documentId: 'doc-1', status: 'draft' },
    fakeStrapi({ slug: 'topic', macro: null }),
  );
  assert.equal(mesoWithoutMacro, '/research/paper-graph');
});

test('document resolution falls back across status and locale', async () => {
  const attempts = [];
  const fallbackStrapi = {
    documents: () => ({
      findOne: async (query) => {
        attempts.push(query);
        if (query.status === 'draft' || query.locale === 'ro') return null;
        return { slug: 'fallback-slug' };
      },
      findFirst: async (query) => {
        attempts.push(query);
        return null;
      },
    }),
  };

  const path = await resolvePreviewPath(
    'api::project.project',
    { documentId: 'doc-1', locale: 'ro', status: 'draft' },
    fallbackStrapi,
  );

  assert.equal(path, '/research/projects/fallback-slug');
  assert.ok(attempts.length > 1);
  assert.ok(attempts.some((attempt) => attempt.locale === 'en'));
  assert.ok(attempts.some((attempt) => attempt.status === 'published'));
});

test('preview session tokens are signed, scoped and expiring', () => {
  const now = Date.now();
  const token = createPreviewToken({
    status: 'draft',
    locale: 'ro',
    expiresAt: now + 60_000,
  });

  assert.ok(token);
  assert.deepEqual(verifyPreviewToken(token), {
    status: 'draft',
    locale: 'ro',
    expiresAt: now + 60_000,
  });

  const [payload, signature] = token.split('.');
  assert.equal(verifyPreviewToken(`${payload}.${signature.slice(0, -1)}x`), null);
  assert.equal(verifyPreviewToken(`${payload}.`), null);
  assert.equal(verifyPreviewToken('not-a-token'), null);
  assert.equal(verifyPreviewToken(token.replace(payload, 'eyJzdGF0dXMiOiJkcmFmdCJ9')), null);

  const expired = createPreviewToken({
    status: 'draft',
    locale: null,
    expiresAt: now - 1,
  });
  assert.equal(verifyPreviewToken(expired), null);
});

test('preview secret comparison rejects wrong values', () => {
  assert.equal(isValidPreviewSecret('preview-test-secret'), true);
  assert.equal(isValidPreviewSecret('wrong'), false);
  assert.equal(isValidPreviewSecret(''), false);
  assert.equal(isValidPreviewSecret(undefined), false);
});

test('preview targets reject open redirects and unknown paths', () => {
  assert.deepEqual(resolvePreviewTarget('/people'), {
    pathname: '/people',
    path: '/people',
  });
  assert.deepEqual(resolvePreviewTarget('/people/alice?tab=projects'), {
    pathname: '/people/alice',
    path: '/people/alice?tab=projects',
  });

  for (const candidate of [
    'https://evil.example',
    '//evil.example/path',
    '/\\evil.example',
    '/admin',
    '/api/preview',
    '/people/../../etc/passwd',
    '',
    null,
    undefined,
  ]) {
    assert.equal(resolvePreviewTarget(candidate), null, `should reject ${candidate}`);
  }
});

test('exit preview always returns a relative, allowlisted path', () => {
  // A public production referer must produce the same path regardless of the
  // internal request URL the proxy exposes to Next.js.
  assert.equal(
    resolveExitPath('https://airi.utcluj.ro/engagement'),
    '/engagement',
  );
  assert.equal(
    resolveExitPath('https://airi.utcluj.ro/people/alice?tab=projects'),
    '/people/alice?tab=projects',
  );
  assert.equal(
    resolveExitPath('http://localhost:3000/research/projects/hedge-iot'),
    '/research/projects/hedge-iot',
  );

  assert.equal(resolveExitPath(null), '/');
  assert.equal(resolveExitPath(''), '/');
  assert.equal(resolveExitPath('not a url'), '/');
  assert.equal(resolveExitPath('https://airi.utcluj.ro/admin'), '/');
  assert.equal(resolveExitPath('https://evil.example/people/alice'), '/people/alice');
  assert.equal(
    resolveExitPath('javascript:alert(1)//people/alice'),
    '/',
  );
});

test('allowlist covers the routes generated by the registry', () => {
  assert.ok(ALLOWED_STATIC_PATHS.size > 0);
  assert.ok(ALLOWED_PATH_PATTERNS.length > 0);
  assert.ok(PREVIEW_COOKIE.startsWith('airi_'));
});

test('the Strapi client never requests drafts without a preview session', () => {
  const source = readFileSync(
    new URL('../../web/src/lib/strapi.js', import.meta.url),
    'utf8',
  );

  assert.equal(source.includes('publicationState'), false);
  assert.ok(source.includes("import { getPreviewSession } from './preview-session'"));
  assert.ok(source.includes("target.searchParams.set('status', previewSession.status)"));
  assert.ok(source.includes("const effectiveCache = previewSession ? 'no-store' : cache;"));
});
