import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  hasRequestedNonPublishedStatus,
  registerDraftAccessGuard,
  shouldBlockDraftRead,
} from '../src/utils/draft-access.ts';

const requestContext = (strategyName, routeType = 'content-api') => ({
  state: {
    route: { info: { type: routeType } },
    auth: { strategy: { name: strategyName } },
  },
});

test('treats every status value except exact "published" as non-published', () => {
  for (const status of ['draft', '', 'foo', 'all', 'preview', 'Draft', 'Published', null, ['draft']]) {
    assert.equal(hasRequestedNonPublishedStatus({ status }), true, `status=${JSON.stringify(status)}`);
  }

  assert.equal(hasRequestedNonPublishedStatus({ status: 'published' }), false);
  assert.equal(hasRequestedNonPublishedStatus({}), false);
  assert.equal(hasRequestedNonPublishedStatus(undefined), false);
});

test('blocks non-published status for public and user-authenticated content API reads', () => {
  for (const strategy of ['users-permissions', undefined]) {
    for (const status of ['draft', '', 'foo', 'Draft']) {
      assert.equal(
        shouldBlockDraftRead('findMany', { status }, requestContext(strategy)),
        true,
        `strategy=${strategy} status=${JSON.stringify(status)}`,
      );
    }
  }

  assert.equal(
    shouldBlockDraftRead('findOne', { status: 'draft' }, requestContext('users-permissions')),
    true,
  );
  assert.equal(
    shouldBlockDraftRead('findFirst', { status: 'draft' }, requestContext('users-permissions')),
    true,
  );
  assert.equal(
    shouldBlockDraftRead('count', { status: 'draft' }, requestContext('users-permissions')),
    true,
  );
});

test('allows published reads, missing status, and trusted content API token drafts', () => {
  assert.equal(
    shouldBlockDraftRead('findMany', { status: 'published' }, requestContext('users-permissions')),
    false,
  );
  assert.equal(
    shouldBlockDraftRead('findMany', {}, requestContext('users-permissions')),
    false,
  );
  assert.equal(
    shouldBlockDraftRead('findMany', { status: 'draft' }, requestContext('content-api-token')),
    false,
  );
});

test('ignores non-content-api routes and write actions', () => {
  assert.equal(
    shouldBlockDraftRead('findMany', { status: 'draft' }, requestContext('users-permissions', 'admin')),
    false,
  );
  assert.equal(
    shouldBlockDraftRead('create', { status: 'draft' }, requestContext('users-permissions')),
    false,
  );
});

test('blocks the document read and skips the handler', async () => {
  let middleware;
  let requestCtx = requestContext('users-permissions');
  const forbidden = Object.assign(new Error('Draft content is not available.'), {
    status: 403,
  });

  registerDraftAccessGuard(
    {
      documents: {
        use(fn) {
          middleware = fn;
        },
      },
      requestContext: { get: () => requestCtx },
    },
    () => forbidden,
  );

  let nextCalled = false;
  await assert.rejects(
    middleware(
      { action: 'findMany', params: { status: 'draft' } },
      async () => {
        nextCalled = true;
      },
    ),
    (error) => error === forbidden,
  );
  assert.equal(nextCalled, false);

  await middleware(
    { action: 'findMany', params: { status: 'published' } },
    async () => {
      nextCalled = true;
    },
  );
  assert.equal(nextCalled, true);

  requestCtx = requestContext('content-api-token');
  nextCalled = false;
  await middleware(
    { action: 'findMany', params: { status: 'draft' } },
    async () => {
      nextCalled = true;
    },
  );
  assert.equal(nextCalled, true);
});
