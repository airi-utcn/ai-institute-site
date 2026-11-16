import assert from 'node:assert/strict';
import { test } from 'node:test';

import { subscribeToNewsletter, validateSubscription } from '../src/utils/newsletter.ts';

// fake for strapi.documents(uid)
function fakeDocuments(rows = []) {
  return {
    rows,
    async findFirst({ filters }) {
      return rows.find((row) => row.email === filters.email) ?? null;
    },
    async create({ data }) {
      rows.push({ documentId: `doc-${rows.length + 1}`, ...data });
    },
    async update({ documentId, data }) {
      Object.assign(rows.find((row) => row.documentId === documentId), data);
    },
  };
}

test('valid email is lowercased and trimmed', () => {
  const check = validateSubscription({ email: ' Jane@UTCluj.ro ', consentGiven: true, source: ' footer ' });
  assert.deepEqual(check, { ok: true, value: { email: 'jane@utcluj.ro', source: 'footer' } });
});

test('invalid emails are rejected', () => {
  for (const email of ['', '   ', 'plain', 'a@b', 'a b@c.ro', '@c.ro', 'a@@c.ro', null, undefined, 5]) {
    const check = validateSubscription({ email, consentGiven: true });
    assert.equal(check.ok, false, String(email));
    assert.equal(check.code, 'invalid_email');
  }
  assert.equal(validateSubscription(undefined).code, 'invalid_email');
});

test('consent has to be exactly true', () => {
  for (const consentGiven of [false, undefined, 'true', 1, null]) {
    const check = validateSubscription({ email: 'a@b.ro', consentGiven });
    assert.equal(check.code, 'consent_required', String(consentGiven));
  }
});

test('source is cut to 64 characters', () => {
  const check = validateSubscription({ email: 'a@b.ro', consentGiven: true, source: 'x'.repeat(100) });
  assert.equal(check.value.source.length, 64);
});

test('new subscriber is saved with consent and a timestamp', async () => {
  const docs = fakeDocuments();
  assert.equal(await subscribeToNewsletter(docs, { email: 'a@b.ro', source: 'footer' }), 'subscribed');

  const [row] = docs.rows;
  assert.equal(row.email, 'a@b.ro');
  assert.equal(row.source, 'footer');
  assert.equal(row.status, 'subscribed');
  assert.equal(row.consentGiven, true);
  assert.ok(!Number.isNaN(Date.parse(row.consentTimestamp)));
});

test('same email twice is only saved once', async () => {
  const docs = fakeDocuments([{ documentId: 'd1', email: 'a@b.ro', status: 'subscribed' }]);
  assert.equal(await subscribeToNewsletter(docs, { email: 'a@b.ro', source: '' }), 'already_subscribed');
  assert.equal(docs.rows.length, 1);
});

test('unsubscribed email can subscribe again', async () => {
  const docs = fakeDocuments([{ documentId: 'd1', email: 'a@b.ro', status: 'unsubscribed' }]);
  assert.equal(await subscribeToNewsletter(docs, { email: 'a@b.ro', source: '' }), 'subscribed');
  assert.equal(docs.rows.length, 1);
  assert.equal(docs.rows[0].status, 'subscribed');
  assert.equal(docs.rows[0].consentGiven, true);
});

test('a duplicate from a parallel request counts as already subscribed', async () => {
  const docs = fakeDocuments();
  docs.create = async ({ data }) => {
    docs.rows.push({ documentId: 'other', ...data });
    throw new Error('unique constraint');
  };
  assert.equal(await subscribeToNewsletter(docs, { email: 'a@b.ro', source: '' }), 'already_subscribed');
});

test('other errors are not swallowed', async () => {
  const docs = fakeDocuments();
  docs.create = async () => {
    throw new Error('database down');
  };
  await assert.rejects(() => subscribeToNewsletter(docs, { email: 'a@b.ro', source: '' }), /database down/);
});
