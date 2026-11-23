import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';

const publicOrigin = 'https://airi.example';
const strapiOrigin = 'http://strapi.example';
const routePath = '/api/lab-desk-reservations';
const strapiToken = 'test-content-api-token';

Object.assign(process.env, {
  AUTH_URL: publicOrigin,
  AUTH_OIDC_ISSUER: 'https://id.example',
  AUTH_CLIENT_ID: 'test-client',
  AUTH_SECRET: 'test-session-encryption-secret',
  STRAPI_INTERNAL_URL: strapiOrigin,
  STRAPI_API_TOKEN: strapiToken,
});

// Resolve Next's build-time aliases and supply only the request-scoped cookie store.
// The route, session encryption/verification, and Strapi request code all run as written.
const sourceRoot = new URL('../src/', import.meta.url);
const sessionUrl = new URL('lib/auth/session.js', sourceRoot).href;
const cookieModule = `data:text/javascript,${encodeURIComponent(`
  import { AsyncLocalStorage } from 'node:async_hooks';
  const requestCookies = new AsyncLocalStorage();
  export const withCookies = (store, fn) => requestCookies.run(store, fn);
  export const cookies = async () => requestCookies.getStore();
`)}`;

const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith('@/')) {
      return next(new URL(`${specifier.slice(2)}.js`, sourceRoot).href, context);
    }
    if (specifier === 'next/headers') return next(cookieModule, context);
    if (specifier === 'next/server' || specifier === 'next/navigation') {
      return next(`${specifier}.js`, context);
    }
    if (specifier === './config' && context.parentURL === sessionUrl) {
      return next('./config.js', context);
    }
    return next(specifier, context);
  },
});

const [{ GET, POST, DELETE }, { createSessionToken, sealOidcTransaction, OIDC_COOKIE, SESSION_COOKIE },
  { getAuthConfig }, { withCookies }, login, callback, signout] =
  await Promise.all([
    import('../src/app/api/lab-desk-reservations/route.js'),
    import('../src/lib/auth/session.js'),
    import('../src/lib/auth/config.js'),
    import(cookieModule),
    import('../src/app/api/auth/login/route.js'),
    import('../src/app/api/auth/callback/route.js'),
    import('../src/app/api/auth/signout/route.js'),
  ]).finally(() => hooks.deregister());

const booking = {
  laboratory: 'airi-lab', date: '2026-12-01', desk: 6, startTime: '09:00', endTime: '10:30',
};
const user = { sub: 'researcher-1', email: 'user@example.test', name: 'Researcher Name' };
const { desk, startTime, endTime } = booking;
const reservation = { id: 'booking-1', desk, startTime, endTime, bookedBy: user.name, mine: true };
const sessionConfig = getAuthConfig();
const sessionToken = await createSessionToken(user, sessionConfig);
const getQuery = `?laboratory=${booking.laboratory}&date=${booking.date}`;

test('sign-in can be retried from the same desk tab after discovery failure or a canceled login', async (t) => {
  const returnTo = '/research/laboratories/airi-lab?tab=desk-reservations';
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('Provider offline'); });
  t.mock.method(console, 'error', () => {});
  t.mock.method(console, 'warn', () => {});
  const initial = await login.GET(new Request(`${publicOrigin}/api/auth/login?${new URLSearchParams({ returnTo })}`));
  assert.equal(new URL(initial.headers.get('Location')).searchParams.get('returnTo'), returnTo);

  const state = 'test-login-state';
  const sealed = await sealOidcTransaction({ state, returnTo });
  const cookies = new Map([[OIDC_COOKIE, { value: sealed }]]);
  const canceled = await withCookies(cookies, () =>
    callback.GET(new Request(`${publicOrigin}/api/auth/callback?error=access_denied&state=${state}`))
  );
  const retry = new URL(canceled.headers.get('Location'));
  assert.equal(retry.origin, publicOrigin);
  assert.equal(retry.pathname, '/login');
  assert.equal(retry.searchParams.get('error'), 'access_denied');
  assert.equal(retry.searchParams.get('returnTo'), returnTo);
});

test('sign-out redirects with GET and clears both cookies on their original paths', async () => {
  const response = await signout.POST();
  assert.equal(response.status, 303);
  assert.equal(response.headers.get('location'), publicOrigin + '/');
  for (const [name, path] of [[SESSION_COOKIE, '/'], [OIDC_COOKIE, '/api/auth']]) {
    const cookie = response.cookies.get(name);
    assert.equal(cookie.path, path);
    assert.equal(cookie.maxAge, 0);
  }
});

function call(handler, method, { token = sessionToken, query = '', body, headers = {} } = {}) {
  const store = new Map([[SESSION_COOKIE, { value: token }]]);
  const request = new Request(`http://localhost:3000${routePath}${query}`, { method, body, headers });
  return withCookies(store, () => handler(request));
}

function createBooking(options = {}) {
  return call(POST, 'POST', {
    body: JSON.stringify(booking),
    headers: { 'Content-Type': 'application/json', Origin: publicOrigin },
    ...options,
  });
}

function mockStrapi(t, respond) {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    const request = new Request(url, options);
    calls.push(request);
    return respond(request, calls.length);
  });
  return calls;
}

function assertStatus(response, status) {
  assert.equal(response.status, status);
  assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
}

test('missing, invalid, expired and subjectless sessions cannot reach Strapi', async (t) => {
  const calls = mockStrapi(t, () => Response.json({ reservations: [] }));
  const expiredToken = await createSessionToken(user, { ...sessionConfig, sessionMaxAgeSeconds: -120 });
  const subjectlessToken = await createSessionToken({ email: user.email }, sessionConfig);

  for (const token of [null, 'invalid-cookie', expiredToken, subjectlessToken]) {
    assertStatus(await call(GET, 'GET', { token, query: getQuery }), 401);
    assertStatus(await createBooking({ token }), 401);
    assertStatus(await call(DELETE, 'DELETE', { token, query: `?id=${reservation.id}` }), 401);
  }
  assert.equal(calls.length, 0);
});

test('authenticated schedule uses the signed subject and exposes only booking display fields', async (t) => {
  const calls = mockStrapi(t, () => Response.json({
    reservations: [{ ...reservation, userObjectId: user.sub, email: user.email }],
    internal: 'private',
  }));
  const response = await call(GET, 'GET', {
    query: `${getQuery}&userObjectId=untrusted`,
    headers: { 'x-airi-user-id': 'untrusted' },
  });

  assertStatus(response, 200);
  assert.deepEqual(await response.json(), { reservations: [reservation] });
  const [request] = calls;
  assert.equal(request.url, `${strapiOrigin}${routePath}${getQuery}`);
  assert.equal(request.headers.get('x-airi-user-id'), user.sub);
  assert.equal(request.headers.get('Authorization'), `Bearer ${strapiToken}`);
  assert.equal(request.headers.has('Cookie'), false);
  assert.equal(request.cache, 'no-store');
  assert.equal(request.redirect, 'error');
});

test('booking derives the display name from the session without publishing an email fallback', async (t) => {
  const calls = mockStrapi(t, async (request) => {
    const { bookedBy } = await request.clone().json();
    return Response.json({ reservation: { ...reservation, bookedBy, userObjectId: user.sub } });
  });
  const emailOnlyToken = await createSessionToken({ ...user, name: user.email, givenName: user.email }, sessionConfig);

  for (const [token, bookedBy] of [[sessionToken, user.name], [emailOnlyToken, 'Researcher']]) {
    const response = await createBooking({
      token,
      body: JSON.stringify({ ...booking, bookedBy: 'Spoofed name', userObjectId: 'spoofed', email: user.email }),
    });
    assertStatus(response, 201);
    assert.deepEqual(await response.json(), { reservation: { ...reservation, bookedBy } });

    const request = calls.at(-1);
    assert.equal(request.headers.get('x-airi-user-id'), user.sub);
    assert.deepEqual(await request.json(), { ...booking, bookedBy });
  }
});

test('invalid request bodies, IDs and cross-origin writes are rejected locally', async (t) => {
  const calls = mockStrapi(t, () => Response.json(null));
  assertStatus(await createBooking({ headers: { 'Content-Type': 'text/plain' } }), 415);
  for (const body of ['{', 'null', '[]', '"text"']) {
    assertStatus(await createBooking({ body }), 400);
  }
  assertStatus(await call(DELETE, 'DELETE', { query: '?id=..' }), 400);

  for (const origin of ['https://other.example', 'null']) {
    const headers = { 'Content-Type': 'application/json', Origin: origin };
    assertStatus(await createBooking({ headers }), 403);
    assertStatus(await call(DELETE, 'DELETE', { headers, query: `?id=${reservation.id}` }), 403);
  }
  assert.equal(calls.length, 0);
});

test('validation and conflict errors reach callers with their status and message', async (t) => {
  const errors = [[400, 'Choose a valid time.'], [404, 'Laboratory not found.'], [409, 'This desk is already booked.']];
  mockStrapi(t, (_, attempt) => {
    const [status, message] = errors[attempt - 1];
    return Response.json({ error: { status, message, details: 'internal' } }, { status });
  });
  for (const [status, message] of errors) {
    const response = await createBooking();
    assertStatus(response, status);
    assert.deepEqual(await response.json(), { error: message });
  }
});

test('permission, network and malformed upstream failures stay private and can be retried', async (t) => {
  t.mock.method(console, 'error', () => {});
  const calls = mockStrapi(t, (_, attempt) => {
    if (attempt === 1) return Response.json({ error: { message: 'internal permission name' } }, { status: 403 });
    if (attempt === 2) throw new TypeError('internal network address');
    if (attempt === 3) return Response.json({ reservations: [null] });
    return Response.json({ reservations: [reservation] });
  });

  for (let attempt = 1; attempt <= 3; attempt++) {
    const response = await call(GET, 'GET', { query: getQuery });
    assertStatus(response, 502);
    assert.deepEqual(await response.json(), { error: 'Desk reservations are temporarily unavailable.' });
    assert.equal(calls.length, attempt);
  }
  const recovery = await call(GET, 'GET', { query: getQuery });
  assertStatus(recovery, 200);
  assert.deepEqual(await recovery.json(), { reservations: [reservation] });
});

test('cancellation returns no body, and retrying an already canceled booking leaves its 404 intact', async (t) => {
  const calls = mockStrapi(t, (_, attempt) => attempt === 1
    ? new Response(null, { status: 204 })
    : Response.json({ error: { message: 'Reservation not found.' } }, { status: 404 }));
  const options = { query: `?id=${reservation.id}`, headers: { Origin: publicOrigin } };

  const canceled = await call(DELETE, 'DELETE', options);
  assertStatus(canceled, 204);
  assert.equal(await canceled.text(), '');
  const retry = await call(DELETE, 'DELETE', options);
  assertStatus(retry, 404);
  assert.deepEqual(await retry.json(), { error: 'Reservation not found.' });
  for (const request of calls) {
    assert.equal(request.method, 'DELETE');
    assert.equal(request.url, `${strapiOrigin}${routePath}/${reservation.id}`);
    assert.equal(request.headers.get('x-airi-user-id'), user.sub);
  }
});
