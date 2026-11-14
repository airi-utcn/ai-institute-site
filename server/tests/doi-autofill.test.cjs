const assert = require('node:assert/strict');
const { before, after, test } = require('node:test');
const { randomBytes } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const databaseFile = `.tmp/doi-test-${process.pid}-${randomBytes(6).toString('hex')}.db`;
let app, metadata, createHandler, formHelpers, person;
const uid = 'api::publication.publication';
const doi = '10.1234/research';
const work = {
  title: ['Research &amp; AI'], 'published-print': { 'date-parts': [[2026]] },
  author: [
    { given: 'Internal', family: 'Author', affiliation: [{ name: 'AIRi' }] },
    { given: 'External', family: 'Collaborator', affiliation: [{ name: 'Partner University' }] },
  ],
};
const jsonResponse = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
const proposal = () => ({ ...metadata.fromCrossref(doi, work), bibtex: '@article{research, title={Research and AI}}' });

before(async () => {
  Object.assign(process.env, {
    NODE_ENV: 'test', DATABASE_CLIENT: 'sqlite', DATABASE_FILENAME: databaseFile,
    HOST: '127.0.0.1', PUBLIC_STRAPI_URL: 'http://127.0.0.1:1337', STRAPI_ADMIN_URL: '/admin',
    DRAFT_NOTIFICATION_CRON_ENABLED: 'false', STRAPI_TELEMETRY_DISABLED: 'true',
  });
  for (const key of ['APP_KEYS', 'ADMIN_JWT_SECRET', 'API_TOKEN_SALT', 'TRANSFER_TOKEN_SALT', 'ENCRYPTION_KEY', 'JWT_SECRET']) process.env[key] = randomBytes(32).toString('hex');
  fs.mkdirSync(path.join(root, '.tmp'), { recursive: true });
  const { compileStrapi, createStrapi } = require('@strapi/strapi');
  app = createStrapi(await compileStrapi({ appDir: root }));
  await app.load();
  metadata = require('../dist/src/api/publication/doi-metadata.js');
  createHandler = require('../dist/src/api/publication/doi-route.js').createDoiLookupHandler;
  const source = fs.readFileSync(path.join(root, 'src/admin/publications/doi-form.ts'), 'utf8');
  const js = require('typescript').transpileModule(source, { compilerOptions: { module: require('typescript').ModuleKind.CommonJS } }).outputText;
  formHelpers = {};
  new Function('exports', js)(formHelpers);
  person = await app.documents('api::person.person').create({
    data: { firstName: 'Internal', lastName: 'Author', bio: 'Author biography.', socialLinks: [{ label: 'Email', url: 'mailto:author@example.com', icon: 'mail' }] },
    status: 'draft',
  });
});

after(async () => {
  if (app) await app.destroy();
  for (const suffix of ['', '-wal', '-shm']) fs.rmSync(path.join(root, databaseFile + suffix), { force: true });
});

test('normalizes bare DOIs, DOI labels and resolver URLs without accepting arbitrary URLs', () => {
  for (const value of [' 10.1234/Research ', 'doi: 10.1234/Research', 'https://doi.org/10.1234%2FResearch', 'http://dx.doi.org/10.1234/Research']) assert.equal(metadata.normalizeDoi(value), doi);
  for (const value of ['', null, 'https://example.com/10.1234/research', 'http://127.0.0.1/private', '10.1234/with spaces', '10.1234/test\nheader', ['10.1234/research']]) {
    assert.throws(() => metadata.normalizeDoi(value), (error) => error.status === 400);
  }
});

test('Crossref fills ordered authors, affiliations, year and registry BibTeX using fixed hosts', async () => {
  const calls = [];
  const result = await metadata.lookupDoi('https://doi.org/10.1234/Research', async (url, options) => {
    calls.push(url);
    assert.equal(new URL(url).hostname, 'api.crossref.org');
    assert.equal(options.redirect, 'error');
    return url.includes('/transform/') ? new Response('@article{research, title={Research}}') : jsonResponse({ message: work });
  });
  assert.equal(calls.length, 2);
  assert.equal(result.doi, doi);
  assert.equal(result.title, 'Research & AI');
  assert.equal(result.year, 2026);
  assert.deepEqual(result.authorCredits.map((author) => author.name), ['Internal Author', 'External Collaborator']);
  assert.equal(result.authorCredits[1].affiliation, 'Partner University');
  assert.equal(result.bibtex, '@article{research, title={Research}}');
});

test('DataCite provides a fallback and missing metadata is not invented', async () => {
  const result = await metadata.lookupDoi(doi, async (url) => url.includes('crossref.org') ? jsonResponse({}, 404) : jsonResponse({ data: { attributes: {
    titles: [{ title: 'A dataset' }], publicationYear: 2025,
    creators: [{ name: 'Research Consortium', nameType: 'Organizational', affiliation: [] }],
  } } }));
  assert.equal(result.source, 'DataCite');
  assert.equal(result.year, 2025);
  assert.equal(result.authorCredits[0].affiliation, '');
  assert.ok(result.bibtex.includes('author = {{Research Consortium}}'));
  assert.ok(result.bibtex.includes('doi = {10.1234/research}'));
});

test('a failed citation download uses valid escaped BibTeX from the metadata', async () => {
  const result = await metadata.lookupDoi(doi, async (url) => url.includes('/transform/') ? new Response('<html>Error</html>') : jsonResponse({ message: work }));
  assert.match(result.bibtex, /^@misc\{/);
  assert.ok(result.bibtex.includes('Research \\& AI'));
  assert.ok(result.bibtex.includes('Author, Internal and Collaborator, External'));
  assert.equal(metadata.fromCrossref(doi, { ...work, 'published-print': {}, issued: { 'date-parts': [[2024]] } }).year, 2024);
});

test('invalid input, unavailable providers and missing DOIs leave manual editing available', async () => {
  await assert.rejects(metadata.lookupDoi('invalid', async () => { throw new Error('must not fetch'); }), (error) => error.status === 400);
  await assert.rejects(metadata.lookupDoi(doi, async () => jsonResponse({}, 404)), (error) => error.status === 404 && error.message.includes('manually'));
  await assert.rejects(metadata.lookupDoi(doi, async () => { throw new Error('timeout'); }), (error) => error.status === 503 && error.message.includes('manually'));
});

test('lookup matches only unique internal profiles and never saves a publication', async () => {
  const count = await app.db.query(uid).count();
  const ctx = { query: { doi }, state: { userAbility: { can: () => true } }, set() {} };
  await createHandler(app, async () => proposal())(ctx);
  assert.equal(ctx.body.data.authorCredits[0].person.documentId, person.documentId);
  assert.equal(ctx.body.data.authorCredits[1].person, null);
  assert.equal(await app.db.query(uid).count(), count);
  const duplicate = await app.documents('api::person.person').create({
    data: { firstName: 'Internal', lastName: 'Author', bio: 'Another author biography.', socialLinks: [{ label: 'Email', url: 'mailto:other@example.com', icon: 'mail' }] },
  });
  await createHandler(app, async () => proposal())(ctx);
  assert.equal(ctx.body.data.authorCredits[0].person, null, 'ambiguous names must be resolved by the editor');
  await app.documents('api::person.person').delete({ documentId: duplicate.documentId });
});

test('lookup respects publication and person permissions', async () => {
  const denied = { query: { doi }, state: { userAbility: { can: () => false } }, forbidden() { this.status = 403; } };
  await createHandler(app, async () => { throw new Error('must not fetch'); })(denied);
  assert.equal(denied.status, 403);
  const ctx = { query: { doi }, state: { userAbility: { can: (_action, subject) => subject === uid } }, set() {} };
  await createHandler(app, async () => proposal())(ctx);
  assert.ok(ctx.body.data.authorCredits.every((author) => author.person === null));
  ctx.state.userAbility.can = (_action, subject, field) => subject === uid || field !== 'lastName';
  await createHandler(app, async () => proposal())(ctx);
  assert.ok(ctx.body.data.authorCredits.every((author) => author.person === null), 'name field permissions must also be respected');
});

test('existing fields are unselected by default and new author rows use admin relation payloads', () => {
  const all = { title: true, year: true, authorCredits: true, bibtex: true };
  assert.deepEqual(formHelpers.initialDoiSelection(proposal(), {}, all), all);
  assert.deepEqual(formHelpers.initialDoiSelection(proposal(), { title: 'My title', year: 2020, authors: { count: 2 }, bibFile: { id: 1 } }, all), { title: false, year: false, authorCredits: false, bibtex: false });
  assert.equal(formHelpers.initialDoiSelection(proposal(), {}, { ...all, authorCredits: false }).authorCredits, false);
  const author = { ...proposal().authorCredits[0], person };
  assert.equal(formHelpers.doiAuthorRow(author).person.connect[0].apiData.documentId, person.documentId);
  assert.deepEqual(formHelpers.doiAuthorRow(proposal().authorCredits[1]).person.connect, []);
});

test('the HTTP lookup is admin-only and returns suggestions without saving', async () => {
  await new Promise((resolve) => app.server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${app.server.httpServer.address().port}`;
  const anonymous = await fetch(`${base}/publication-doi/lookup?doi=${doi}`);
  assert.ok([401, 403].includes(anonymous.status));
  const contentToken = await app.admin.services['api-token'].create({ kind: 'content-api', name: 'DOI endpoint isolation test', type: 'full-access', lifespan: null });
  assert.ok([401, 403].includes((await fetch(`${base}/publication-doi/lookup?doi=${doi}`, { headers: { Authorization: `Bearer ${contentToken.accessKey}` } })).status));
  const role = await app.admin.services.role.getSuperAdmin();
  const admin = await app.admin.services.user.create({ firstname: 'DOI', lastname: 'Tester', email: 'doi-test@example.test', isActive: true, roles: [role.id] });
  const refresh = await app.sessionManager('admin').generateRefreshToken(String(admin.id), 'doi-integration');
  const access = await app.sessionManager('admin').generateAccessToken(refresh.token);
  const beforeCount = await app.db.query(uid).count();
  const realFetch = global.fetch;
  global.fetch = async (url, options) => String(url).startsWith('https://api.crossref.org/')
    ? String(url).includes('/transform/') ? new Response('@article{research,title={Research}}') : jsonResponse({ message: work })
    : realFetch(url, options);
  try {
    const response = await fetch(`${base}/publication-doi/lookup?doi=${doi}`, { headers: { Authorization: `Bearer ${access.token}` } });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.data.title, 'Research & AI');
    assert.equal(body.data.authorCredits[0].person.documentId, person.documentId);
    assert.equal(await app.db.query(uid).count(), beforeCount);
  } finally { global.fetch = realFetch; }
});
