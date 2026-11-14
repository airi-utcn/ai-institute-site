const assert = require('node:assert/strict');
const { before, after, test } = require('node:test');
const { randomBytes } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const databaseFile = `.tmp/publication-test-${process.pid}-${randomBytes(6).toString('hex')}.db`;
let app;
let person;
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
});

after(async () => {
  if (app) await app.destroy();
  for (const suffix of ['', '-wal', '-shm']) fs.rmSync(path.join(root, databaseFile + suffix), { force: true });
});

test('publishes and retrieves mixed ordered authors, portraits, citation, code and both video sources', async () => {
  const publication = await app.documents(uid).create({
    status: 'published', locale: 'en',
    data: {
      title: 'Publication details integration test', authors: [person.documentId],
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
