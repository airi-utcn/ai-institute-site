const assert = require('node:assert/strict');
const { before, after, test } = require('node:test');
const { randomBytes } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const databaseFile = `.tmp/publication-test-${process.pid}-${randomBytes(6).toString('hex')}.db`;
let app;
let person;
let replacement;
let legacyAuthor;
let video;
const uid = 'api::publication.publication';

before(async () => {
  Object.assign(process.env, {
    NODE_ENV: 'test', DATABASE_CLIENT: 'sqlite', DATABASE_FILENAME: databaseFile,
    HOST: '127.0.0.1', PUBLIC_STRAPI_URL: 'http://127.0.0.1:1337', STRAPI_ADMIN_URL: '/admin',
    DRAFT_NOTIFICATION_CRON_ENABLED: 'false', STRAPI_TELEMETRY_DISABLED: 'true',
  });
  for (const key of ['APP_KEYS', 'ADMIN_JWT_SECRET', 'API_TOKEN_SALT', 'TRANSFER_TOKEN_SALT', 'ENCRYPTION_KEY', 'JWT_SECRET']) {
    process.env[key] = randomBytes(32).toString('hex');
  }
  fs.mkdirSync(path.join(root, '.tmp'), { recursive: true });
  const { compileStrapi, createStrapi } = require('@strapi/strapi');
  app = createStrapi(await compileStrapi({ appDir: root }));
  await app.load();
  const portrait = await app.db.query('plugin::upload.file').create({
    data: { name: 'author.png', hash: 'author', ext: '.png', mime: 'image/png', size: 1, url: '/uploads/author.png', provider: 'local' },
  });
  video = await app.db.query('plugin::upload.file').create({
    data: { name: 'presentation.mp4', hash: 'presentation', ext: '.mp4', mime: 'video/mp4', size: 1, url: '/uploads/presentation.mp4', provider: 'local' },
  });
  person = await app.documents('api::person.person').create({
    data: {
      firstName: 'Internal', lastName: 'Author', bio: 'Researcher biography.', portrait: portrait.id,
      socialLinks: [{ label: 'Email', url: 'mailto:author@example.com', icon: 'mail' }],
    }, status: 'published',
  });
  for (const [firstName, lastName] of [['Second', 'Researcher'], ['Legacy', 'Researcher']]) {
    const created = await app.documents('api::person.person').create({
      data: {
        firstName, lastName, bio: 'Researcher biography.', portrait: portrait.id,
        socialLinks: [{ label: 'Email', url: 'mailto:author@example.com', icon: 'mail' }],
      }, status: 'published',
    });
    if (firstName === 'Second') replacement = created;
    else legacyAuthor = created;
  }
});

after(async () => {
  if (app) await app.destroy();
  for (const suffix of ['', '-wal', '-shm']) fs.rmSync(path.join(root, databaseFile + suffix), { force: true });
});

test('publishes and retrieves mixed ordered authors, portraits, citation, code and both video sources', async () => {
  const publication = await app.documents(uid).create({
    status: 'published', locale: 'en',
    data: {
      title: 'Publication details integration test',
      authorCredits: [
        { name: 'External Researcher', affiliation: 'Another University' },
        { person: person.documentId, affiliation: 'AIRi, Technical University of Cluj-Napoca' },
      ],
      bibtex: '@article{example, title={Example}}', codeUrl: 'https://github.com/example/research',
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', videoFile: video.id,
    },
  });
  const result = await app.documents(uid).findOne({
    documentId: publication.documentId, status: 'published', locale: 'en',
    populate: { authorCredits: { populate: { person: { populate: ['portrait'] } } }, authors: true, videoFile: true },
  });
  assert.equal(result.authorCredits[0].name, 'External Researcher');
  assert.equal(result.authorCredits[0].affiliation, 'Another University');
  assert.equal(result.authorCredits[1].person.documentId, person.documentId);
  assert.equal(result.authorCredits[1].person.portrait.url, '/uploads/author.png');
  assert.equal(result.authors.length, 1);
  assert.equal(result.bibtex, '@article{example, title={Example}}');
  assert.equal(result.codeUrl, 'https://github.com/example/research');
  assert.ok(result.videoUrl.includes('youtube.com'));
  assert.equal(result.videoFile.mime, 'video/mp4');
  const profile = await app.documents('api::person.person').findOne({
    documentId: person.documentId,
    status: 'published',
    populate: { publications: { filters: { documentId: publication.documentId, publishedAt: { $notNull: true } } } },
  });
  assert.equal(profile.publications.length, 1, 'the publication must appear in the linked person profile');
});

test('existing publications remain publishable without the new optional fields', async () => {
  const publication = await app.documents(uid).create({
    status: 'published', data: { title: 'Legacy publication integration test', authors: [person.documentId] },
  });
  assert.ok(publication.documentId);
});

test('author credits require an affiliation when publishing', async () => {
  await assert.rejects(app.documents(uid).create({
    status: 'published', data: { title: 'Missing affiliation test', authorCredits: [{ name: 'External Author' }] },
  }), (error) => error.name === 'ValidationError');
});

const populatedAuthors = { authors: true, authorCredits: { populate: { person: true } } };
const authorIds = (entry) => entry.authors.map((author) => author.documentId).sort();

test('saved responses include synchronized authors without duplicate relations', async () => {
  const publication = await app.documents(uid).create({
    data: {
      title: 'Automatic author response test', authors: [legacyAuthor.documentId, person.documentId],
      authorCredits: [
        { person: person.documentId, affiliation: 'AIRi' },
        { person: person.documentId, affiliation: 'Partner University' },
      ],
    },
    populate: populatedAuthors,
  });
  assert.deepEqual(authorIds(publication), [person.documentId, legacyAuthor.documentId].sort());

  const createdFromCreditsOnly = await app.documents(uid).create({
    data: {
      title: 'Automatic author populated response test',
      authorCredits: [{ person: person.documentId, affiliation: 'AIRi' }],
    },
    populate: { authors: { fields: ['firstName'] } },
  });
  assert.equal(createdFromCreditsOnly.authors.length, 1);
  assert.equal(createdFromCreditsOnly.authors[0].firstName, 'Internal');
  assert.equal(createdFromCreditsOnly.authors[0].lastName, undefined, 'respect requested field selection');
});

test('partial admin component edits, replacement and removal preserve independent authors', async () => {
  let publication = await app.documents(uid).create({
    data: {
      title: 'Component edit author synchronization test', authors: [legacyAuthor.documentId],
      authorCredits: [{ person: person.documentId, affiliation: 'AIRi' }],
    },
    populate: populatedAuthors,
  });
  const creditId = publication.authorCredits[0].id;
  publication = await app.documents(uid).update({
    documentId: publication.documentId,
    data: { authorCredits: [{ id: creditId, affiliation: 'AIRi and Partner University' }] },
    populate: populatedAuthors,
  });
  assert.deepEqual(authorIds(publication), [person.documentId, legacyAuthor.documentId].sort());

  publication = await app.documents(uid).update({
    documentId: publication.documentId,
    data: { authorCredits: [{
      id: creditId, affiliation: 'AIRi',
      person: { connect: [{ documentId: replacement.documentId }], disconnect: [{ documentId: person.documentId }] },
    }] },
    populate: populatedAuthors,
  });
  assert.deepEqual(authorIds(publication), [replacement.documentId, legacyAuthor.documentId].sort());

  publication = await app.documents(uid).update({
    documentId: publication.documentId, data: { authorCredits: [] }, populate: populatedAuthors,
  });
  assert.deepEqual(authorIds(publication), [legacyAuthor.documentId]);
});

test('unrelated updates and importer author changes keep people still linked in credits', async () => {
  let publication = await app.documents(uid).create({
    data: {
      title: 'Importer author synchronization test',
      authorCredits: [{ person: person.documentId, affiliation: 'AIRi' }],
    },
  });
  publication = await app.documents(uid).update({
    documentId: publication.documentId,
    data: { year: 2026, authors: { set: [legacyAuthor.documentId] } },
    populate: populatedAuthors,
  });
  assert.deepEqual(authorIds(publication), [person.documentId, legacyAuthor.documentId].sort());
  publication = await app.documents(uid).update({
    documentId: publication.documentId,
    data: { authors: { disconnect: [person.documentId] } },
    populate: populatedAuthors,
  });
  assert.deepEqual(authorIds(publication), [person.documentId, legacyAuthor.documentId].sort());
});

test('draft edits do not leak into published author links and publishing uses the current credits', async () => {
  const created = await app.documents(uid).create({
    status: 'published',
    data: {
      title: 'Draft published author synchronization test',
      authorCredits: [{ person: person.documentId, affiliation: 'AIRi' }],
    },
  });
  const read = (status) => app.documents(uid).findOne({
    documentId: created.documentId, status, populate: populatedAuthors,
  });
  assert.deepEqual(authorIds(await read('draft')), [person.documentId]);
  assert.deepEqual(authorIds(await read('published')), [person.documentId]);
  await app.documents(uid).update({
    documentId: created.documentId,
    data: { authorCredits: [{ person: replacement.documentId, affiliation: 'AIRi' }] },
  });
  assert.deepEqual(authorIds(await read('draft')), [replacement.documentId]);
  assert.deepEqual(authorIds(await read('published')), [person.documentId]);
  const published = await app.documents(uid).publish({ documentId: created.documentId, populate: populatedAuthors });
  assert.deepEqual(authorIds(published.entries[0]), [replacement.documentId]);
  assert.deepEqual(authorIds(await read('published')), [replacement.documentId]);

  await app.documents(uid).update({ documentId: created.documentId, data: { authorCredits: [] } });
  assert.deepEqual(authorIds(await read('draft')), []);
  await app.documents(uid).discardDraft({ documentId: created.documentId });
  assert.deepEqual(authorIds(await read('draft')), [replacement.documentId]);
});

test('saving and publishing external credits never creates or modifies People, even with a matching name', async () => {
  const existingPeople = await app.db.query('api::person.person').findMany({ orderBy: { id: 'asc' } });
  const publication = await app.documents(uid).create({
    data: { title: 'External only synchronization test', authorCredits: [
      { name: 'External Researcher', affiliation: 'Another University' },
      { name: `${person.firstName} ${person.lastName}`, affiliation: 'Another University' },
    ] },
    populate: populatedAuthors,
  });
  assert.deepEqual(publication.authors, []);
  await app.documents(uid).update({ documentId: publication.documentId, data: { year: 2026 } });
  const published = await app.documents(uid).publish({ documentId: publication.documentId, populate: populatedAuthors });
  assert.deepEqual(published.entries[0].authors, []);
  assert.deepEqual(await app.db.query('api::person.person').findMany({ orderBy: { id: 'asc' } }), existingPeople);
});

test('explicitly linking and unlinking an external profile preserves its type, visibility and existence', async () => {
  const external = await app.documents('api::person.person').create({
    data: { firstName: 'External', lastName: 'Collaborator', type: 'external', bio: 'Collaborator biography.', socialLinks: [{ label: 'Email', url: 'mailto:external@example.com', icon: 'mail' }] },
  });
  const before = await app.db.query('api::person.person').findMany({ where: { documentId: external.documentId } });
  const publication = await app.documents(uid).create({
    populate: populatedAuthors,
    data: { title: 'Opted-in external profile', authorCredits: [{ name: 'External Collaborator', affiliation: 'Partner University', person: external.documentId }] },
  });
  assert.deepEqual(authorIds(publication), [external.documentId]);
  await app.documents(uid).update({ documentId: publication.documentId, data: { authorCredits: [{ id: publication.authorCredits[0].id, person: null, name: 'External Collaborator', affiliation: 'Partner University' }] } });
  const published = await app.documents(uid).publish({ documentId: publication.documentId, populate: populatedAuthors });
  assert.deepEqual(published.entries[0].authors, []);
  assert.deepEqual(await app.db.query('api::person.person').findMany({ where: { documentId: external.documentId } }), before);
});

test('duplicating a publication preserves credits and independently selected authors', async () => {
  const source = await app.documents(uid).create({
    data: {
      title: 'Author synchronization clone source', authors: [legacyAuthor.documentId],
      authorCredits: [{ person: person.documentId, affiliation: 'AIRi' }],
    },
  });
  const clone = await app.documents(uid).clone({
    documentId: source.documentId, data: { title: 'Author synchronization clone target' }, populate: populatedAuthors,
  });
  assert.notEqual(clone.documentId, source.documentId);
  assert.deepEqual(authorIds(clone.entries[0]), [person.documentId, legacyAuthor.documentId].sort());
});

test('a synchronization failure rolls back the publication and its credits', async () => {
  const repository = app.db.query(uid);
  const originalUpdate = repository.update;
  repository.update = async (params) => {
    if (params.data?.authors?.connect && Object.keys(params.data).length === 1) throw new Error('Simulated author sync failure');
    return originalUpdate.call(repository, params);
  };
  try {
    await assert.rejects(app.documents(uid).create({
      status: 'published', data: {
        title: 'Atomic author synchronization test',
        authorCredits: [{ person: person.documentId, affiliation: 'AIRi' }],
      },
    }), /Simulated author sync failure/);
  } finally {
    repository.update = originalUpdate;
  }
  assert.equal(await app.db.query(uid).count({ where: { title: 'Atomic author synchronization test' } }), 0);
});
