const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');
const { randomBytes } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const databaseFile = `.tmp/news-test-${process.pid}-${randomBytes(6).toString('hex')}.db`;
const uid = 'api::news-article.news-article';
let app;
let fixtures;
let sequence = 0;

before(async () => {
  // Always use a fresh local database, regardless of the developer's .env.
  Object.assign(process.env, {
    NODE_ENV: 'test',
    DATABASE_CLIENT: 'sqlite',
    DATABASE_FILENAME: databaseFile,
    HOST: '127.0.0.1',
    PUBLIC_STRAPI_URL: 'http://127.0.0.1:1337',
    STRAPI_ADMIN_URL: '/admin',
    DRAFT_NOTIFICATION_CRON_ENABLED: 'false',
    STRAPI_TELEMETRY_DISABLED: 'true',
  });
  for (const key of ['APP_KEYS', 'ADMIN_JWT_SECRET', 'API_TOKEN_SALT',
    'TRANSFER_TOKEN_SALT', 'ENCRYPTION_KEY', 'JWT_SECRET']) {
    process.env[key] = randomBytes(32).toString('hex');
  }
  fs.mkdirSync(path.join(root, '.tmp'), { recursive: true });
  const { compileStrapi, createStrapi } = require('@strapi/strapi');
  const context = await compileStrapi({ appDir: root });
  app = createStrapi(context);
  await app.load();

  await app.plugin('i18n').service('locales').create({ name: 'Romanian (ro)', code: 'ro' });

  const image = await app.db.query('plugin::upload.file').create({
    data: {
      name: 'news-test.png', hash: 'news-test', ext: '.png',
      mime: 'image/png', size: 1, url: '/uploads/news-test.png', provider: 'local',
    },
  });
  const person = await app.documents('api::person.person').create({
    data: {
      firstName: 'Test',
      lastName: 'Author',
      bio: 'Test author biography.',
      portrait: image.id,
      socialLinks: [{
        label: 'Email',
        url: 'mailto:test.author@example.com',
        icon: 'mail',
      }],
    },
    status: 'published',
  });
  const department = await app.documents('api::department.department').create({
    data: { name: 'Test Department' }, status: 'published', locale: 'en',
  });
  const project = await app.documents('api::project.project').create({
    data: { title: 'Test Project', startDate: '2026-01-01' },
    status: 'published', locale: 'en',
  });
  await app.documents('api::department.department').update({
    documentId: department.documentId, locale: 'ro', status: 'published',
    data: { name: 'Departament de test' },
  });
  await app.documents('api::project.project').update({
    documentId: project.documentId, locale: 'ro', status: 'published',
    data: { title: 'Proiect de test', startDate: '2026-01-01' },
  });
  fixtures = {
    summary: 'A complete news summary.', publishedDate: '2026-10-26',
    heroImage: image.id, relatedDepartments: [department.documentId],
    relatedProjects: [project.documentId], featuredPeople: [person.documentId],
    author: person.documentId,
  };
});

after(async () => {
  if (app) await app.destroy();
  for (const suffix of ['', '-wal', '-shm']) {
    fs.rmSync(path.join(root, databaseFile + suffix), { force: true });
  }
});

function newsData() {
  return { ...fixtures, title: `Test News ${++sequence}` };
}

function missingField(field) {
  return (error) => {
    assert.equal(error.name, 'ValidationError');
    assert.ok(error.details.errors.some((item) => item.path.includes(field)),
      `Expected a validation error for ${field}: ${JSON.stringify(error.details)}`);
    return true;
  };
}

function blankField(field) {
  return (error) => {
    assert.equal(error.name, 'ValidationError');
    assert.ok(error.details.errors.some((item) =>
      item.path.includes(field) && item.message.includes('non-whitespace text')),
    `Expected non-blank validation for ${field}: ${JSON.stringify(error.details)}`);
    return true;
  };
}

for (const field of ['title', 'summary', 'publishedDate', 'heroImage',
  'relatedDepartments', 'relatedProjects', 'featuredPeople', 'author']) {
  test(`allows a draft but rejects publication without ${field}`, async () => {
    const data = newsData();
    delete data[field];
    const draft = await app.documents(uid).create({ data, locale: 'en' });
    assert.equal(draft.publishedAt, null);
    await assert.rejects(
      app.documents(uid).publish({ documentId: draft.documentId, locale: 'en' }),
      missingField(field),
    );
    assert.equal(await app.documents(uid).findOne({
      documentId: draft.documentId, locale: 'en', status: 'published',
    }), null);
  });
}

for (const field of ['title', 'summary']) {
  for (const [label, value] of [
    ['empty', ''], ['spaces', '   '], ['tabs and newlines', '\t\r\n'],
    ['Unicode spaces', '\u00a0\u2003'],
  ]) {
    test(`saves a draft but rejects ${label} ${field} on publication`, async () => {
      const data = { ...newsData(), slug: `blank-${field}-${sequence}`, [field]: value };
      const draft = await app.documents(uid).create({ data, locale: 'en' });
      assert.equal(draft.publishedAt, null);
      assert.equal(draft[field], value);
      await app.documents(uid).update({
        documentId: draft.documentId, locale: 'en', data: { [field]: value },
      });
      await assert.rejects(
        app.documents(uid).publish({ documentId: draft.documentId, locale: 'en' }),
        blankField(field),
      );
      assert.equal(await app.documents(uid).findOne({
        documentId: draft.documentId, locale: 'en', status: 'published',
      }), null);

      // Remove the draft so the direct-create check cannot fail due to title uniqueness.
      await app.documents(uid).delete({ documentId: draft.documentId, locale: 'en' });
      await assert.rejects(app.documents(uid).create({
        data, locale: 'en', status: 'published',
      }), blankField(field));
    });
  }
}

test('publishes a complete article with its image and relations', async () => {
  const data = newsData();
  const article = await app.documents(uid).create({
    data, locale: 'en', status: 'published',
    populate: ['heroImage', 'relatedDepartments', 'relatedProjects', 'featuredPeople', 'author'],
  });
  assert.ok(article.publishedAt);
  assert.equal(article.heroImage.id, fixtures.heroImage);
  assert.equal(article.relatedProjects.length, 1);
  assert.equal(article.relatedDepartments.length, 1);
  assert.equal(article.featuredPeople.length, 1);
  assert.equal(article.author.documentId, fixtures.author);

  // A partial draft update must preserve the existing required relations.
  await app.documents(uid).update({
    documentId: article.documentId, locale: 'en', data: { summary: 'Updated summary.' },
  });
  const result = await app.documents(uid).publish({ documentId: article.documentId, locale: 'en' });
  assert.equal(result.entries[0].summary, 'Updated summary.');
});

test('rejects a direct publish request with an empty required relation', async () => {
  await assert.rejects(app.documents(uid).create({
    data: { ...newsData(), relatedProjects: [] }, locale: 'en', status: 'published',
  }), missingField('relatedProjects'));
});

test('removing the last related project blocks republication and preserves the public version', async () => {
  const article = await app.documents(uid).create({ data: newsData(), locale: 'en', status: 'published' });
  await app.documents(uid).update({
    documentId: article.documentId, locale: 'en',
    data: { relatedProjects: { disconnect: fixtures.relatedProjects } },
  });
  await assert.rejects(
    app.documents(uid).publish({ documentId: article.documentId, locale: 'en' }),
    missingField('relatedProjects'),
  );
  const published = await app.documents(uid).findOne({
    documentId: article.documentId, locale: 'en', status: 'published', populate: ['relatedProjects'],
  });
  assert.equal(published.relatedProjects.length, 1);
});

for (const field of ['title', 'summary']) {
  for (const [label, value] of [['empty', ''], ['whitespace', ' \t\n ']]) {
    test(`rejects ${label} ${field} on republication, preserves public content and permits repair`, async () => {
      const data = newsData();
      const article = await app.documents(uid).create({ data, locale: 'en', status: 'published' });
      const query = {
        documentId: article.documentId, locale: 'en', status: 'published',
        populate: ['heroImage', 'relatedDepartments', 'relatedProjects', 'featuredPeople', 'author'],
      };
      const before = await app.documents(uid).findOne(query);
      await app.documents(uid).update({
        documentId: article.documentId, locale: 'en', data: { [field]: value },
      });
      await assert.rejects(
        app.documents(uid).publish({ documentId: article.documentId, locale: 'en' }),
        blankField(field),
      );
      assert.deepEqual(await app.documents(uid).findOne(query), before);
      await assert.rejects(app.documents(uid).update({
        documentId: article.documentId, locale: 'en', status: 'published',
        data: { [field]: value },
      }), blankField(field));
      assert.deepEqual(await app.documents(uid).findOne(query), before);

      const restoredValue = `${data[field]} Restored.`;
      await app.documents(uid).update({
        documentId: article.documentId, locale: 'en', data: { [field]: restoredValue },
      });
      await app.documents(uid).publish({ documentId: article.documentId, locale: 'en' });
      assert.equal((await app.documents(uid).findOne(query))[field], restoredValue);
    });
  }
}

test('accepts valid Unicode and multiline text without rewriting it', async () => {
  const data = newsData();
  data.title = `  Știre de verificare ${sequence}  `;
  data.summary = '\n  Rezumat cu diacritice.\nAl doilea paragraf.  \n';
  const article = await app.documents(uid).create({ data, locale: 'en', status: 'published' });
  assert.ok(article.publishedAt);
  assert.equal(article.title, data.title);
  assert.equal(article.summary, data.summary);
});

test('validates the Romanian summary independently from the English version', async () => {
  const article = await app.documents(uid).create({ data: newsData(), locale: 'en', status: 'published' });
  await app.documents(uid).update({
    documentId: article.documentId, locale: 'ro',
    data: { ...newsData(), title: `Știre ${sequence}`, summary: ' \t\n ' },
  });
  await assert.rejects(
    app.documents(uid).publish({ documentId: article.documentId, locale: 'ro' }),
    missingField('summary'),
  );
  assert.ok(await app.documents(uid).findOne({
    documentId: article.documentId, locale: 'en', status: 'published',
  }));
});

test('REST API permits incomplete drafts and returns 400 for blank published text', async () => {
  // The token and HTTP listener exist only in this disposable test application.
  const token = await app.admin.services['api-token'].create({
    kind: 'content-api', name: 'News validation integration test',
    type: 'full-access', lifespan: null,
  });
  await new Promise((resolve) => app.server.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${app.server.httpServer.address().port}/api/news-articles`;
  async function request(method, query, data) {
    const response = await fetch(`${baseUrl}${query}`, {
      method,
      headers: { Authorization: `Bearer ${token.accessKey}`, 'Content-Type': 'application/json' },
      ...(data === undefined ? {} : { body: JSON.stringify({ data }) }),
    });
    return { status: response.status, body: await response.json() };
  }

  for (const field of ['title', 'summary']) {
    for (const value of ['', ' \t\n ']) {
      const data = { ...newsData(), slug: `http-${field}-${sequence}`, [field]: value };
      const draft = await request('POST', '?locale=en&status=draft', data);
      assert.equal(draft.status, 201);
      assert.equal(draft.body.data.publishedAt, null);
      assert.equal(draft.body.data[field], value);
      const rejectedUpdate = await request('PUT', `/${draft.body.data.documentId}?locale=en&status=published`, {
        [field]: value,
      });
      assert.equal(rejectedUpdate.status, 400);
      blankField(field)(rejectedUpdate.body.error);
      assert.equal(await app.documents(uid).findOne({
        documentId: draft.body.data.documentId, locale: 'en', status: 'published',
      }), null);
      await app.documents(uid).delete({ documentId: draft.body.data.documentId, locale: 'en' });

      const rejectedCreate = await request('POST', '?locale=en&status=published', data);
      assert.equal(rejectedCreate.status, 400);
      blankField(field)(rejectedCreate.body.error);
    }
  }

  const complete = await request('POST', '?locale=en&status=published', newsData());
  assert.equal(complete.status, 201);
  assert.ok(complete.body.data.publishedAt);
  const publicPath = `/${complete.body.data.documentId}?locale=en&status=published&populate=*`;
  const before = await request('GET', publicPath);
  assert.equal(before.status, 200);
  const rejected = await request('PUT', `/${complete.body.data.documentId}?locale=en&status=published`, {
    summary: ' \t\n ',
  });
  assert.equal(rejected.status, 400);
  blankField('summary')(rejected.body.error);
  const after = await request('GET', publicPath);
  assert.equal(after.status, 200);
  assert.deepEqual(after.body.data, before.body.data);
  const repaired = await request('PUT', `/${complete.body.data.documentId}?locale=en&status=published`, {
    summary: 'Valid summary after the rejected API request.',
  });
  assert.equal(repaired.status, 200);
  assert.equal(repaired.body.data.summary, 'Valid summary after the rejected API request.');
  assert.ok(repaired.body.data.publishedAt);
});
