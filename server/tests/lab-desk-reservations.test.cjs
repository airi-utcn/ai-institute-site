const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { after, before, test } = require('node:test');

const root = path.resolve(__dirname, '..');
const databaseFile = `.tmp/lab-desk-test-${process.pid}-${randomBytes(6).toString('hex')}.db`;
const postgresUrl = process.env.LAB_DESK_TEST_DATABASE_URL;
const laboratory = 'desk-reservation-test-lab';
const secondLab = 'second-desk-test-lab';
const day = futureDate(2);
const baseBooking = { laboratory, date: day, desk: 1, startTime: '08:30', endTime: '10:15' };
const alice = { id: 'alice-test-id', name: 'Alice Researcher' };
const bob = { id: 'bob-test-id', name: 'Bob Researcher' };
const laboratoryUid = 'api::laboratory.laboratory';
const reservationUid = 'api::lab-desk-reservation.lab-desk-reservation';

let app;
let endpoint;
let accessKey;
let readOnlyKey;
let scheduleOnlyKey;

function futureDate(days) {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

before(async () => {
  Object.assign(process.env, {
    NODE_ENV: 'test',
    DATABASE_CLIENT: postgresUrl ? 'postgres' : 'sqlite',
    DATABASE_FILENAME: databaseFile,
    HOST: '127.0.0.1',
    PUBLIC_STRAPI_URL: 'http://127.0.0.1:1337',
    STRAPI_ADMIN_URL: '/admin',
    DRAFT_NOTIFICATION_CRON_ENABLED: 'false',
    STRAPI_TELEMETRY_DISABLED: 'true',
  });
  if (postgresUrl) process.env.DATABASE_URL = postgresUrl;
  for (const key of ['APP_KEYS', 'ADMIN_JWT_SECRET', 'API_TOKEN_SALT', 'TRANSFER_TOKEN_SALT', 'ENCRYPTION_KEY', 'JWT_SECRET']) {
    process.env[key] = randomBytes(32).toString('hex');
  }
  fs.mkdirSync(path.join(root, '.tmp'), { recursive: true });
  const { compileStrapi, createStrapi } = require('@strapi/strapi');
  app = createStrapi(await compileStrapi({ appDir: root }));
  await app.load();
  const labs = app.documents(laboratoryUid);
  await labs.create({ status: 'published', data: { title: 'Desk Reservation Test Lab', slug: laboratory } });
  await labs.create({ status: 'published', data: { title: 'Second Desk Test Lab', slug: secondLab } });
  await labs.create({ status: 'draft', data: { title: 'Unpublished Desk Test Lab', slug: 'unpublished-desk-test-lab' } });
  const tokens = app.admin.services['api-token'];
  const token = await tokens.create({
    kind: 'content-api',
    name: 'Lab desk reservations test',
    type: 'custom',
    lifespan: null,
    permissions: ['find', 'create', 'cancel'].map((action) => `${reservationUid}.${action}`),
  });
  accessKey = token.accessKey;
  const readOnlyToken = await tokens.create({
    kind: 'content-api', name: 'Generic read-only desk test', type: 'read-only', lifespan: null,
  });
  readOnlyKey = readOnlyToken.accessKey;
  const scheduleOnlyToken = await tokens.create({
    kind: 'content-api',
    name: 'Desk schedule test',
    type: 'custom',
    lifespan: null,
    permissions: [`${reservationUid}.find`],
  });
  scheduleOnlyKey = scheduleOnlyToken.accessKey;
  await new Promise((resolve) => app.server.listen(0, '127.0.0.1', resolve));
  endpoint = `http://127.0.0.1:${app.server.httpServer.address().port}/api/lab-desk-reservations`;
});

after(async () => {
  if (app) await app.destroy();
  for (const suffix of ['', '-wal', '-shm']) fs.rmSync(path.join(root, databaseFile + suffix), { force: true });
});

function schedule(actor, query = { laboratory, date: day }, token) {
  return fetch(`${endpoint}?${new URLSearchParams(query)}`, { headers: requestHeaders(actor, token) });
}

function requestHeaders(actor, token = accessKey) {
  return { Authorization: `Bearer ${token}`, 'x-airi-user-id': actor.id };
}

function reserve(actor, changes = {}, token) {
  return fetch(endpoint, {
    method: 'POST',
    headers: { ...requestHeaders(actor, token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...baseBooking, bookedBy: actor.name, ...changes }),
  });
}

function cancel(actor, id, token) {
  return fetch(`${endpoint}/${encodeURIComponent(id)}`, { method: 'DELETE', headers: requestHeaders(actor, token) });
}

async function createBooking(actor, changes) {
  const response = await reserve(actor, changes);
  const payload = await response.json();
  assert.equal(response.status, 201, JSON.stringify(payload));
  return payload.reservation;
}

test('desk schedules require a server token and a researcher identity', async () => {
  const url = `${endpoint}?${new URLSearchParams({ laboratory, date: day })}`;
  const guest = await fetch(url, { headers: { 'x-airi-user-id': alice.id } });
  assert.ok([401, 403].includes(guest.status));
  const missingResearcher = await fetch(url, { headers: { Authorization: `Bearer ${accessKey}` } });
  assert.equal(missingResearcher.status, 403);
  assert.equal((await schedule(alice, undefined, readOnlyKey)).status, 403);
  assert.equal((await schedule(alice, { laboratory: 'unpublished-desk-test-lab', date: day })).status, 404);
  const response = await schedule(alice, undefined, scheduleOnlyKey);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.deepEqual(await response.json(), { reservations: [] });

  assert.equal((await reserve(alice, {}, scheduleOnlyKey)).status, 403);
  const booking = await createBooking(alice, { date: futureDate(3) });
  assert.equal((await cancel(alice, booking.id, scheduleOnlyKey)).status, 403);
  await assert.rejects(
    () => app.documents(reservationUid).delete({ documentId: booking.id }),
    { name: 'ForbiddenError' },
  );
});

test('reservations validate the date, opening hours and desk number', async () => {
  for (const changes of [
    { date: '2000-01-01' }, { date: '2099-02-29' }, { date: '0000-02-29' },
    { desk: 0 }, { desk: 13 }, { desk: 1.5 }, { desk: '1' },
    { startTime: '07:59' }, { endTime: '20:01' },
    { startTime: '10:15' }, { startTime: '8:30' }, { startTime: '08:30:00' },
  ]) {
    assert.equal((await reserve(alice, changes)).status, 400, JSON.stringify(changes));
  }
  assert.equal((await reserve(alice, { laboratory: 'unpublished-desk-test-lab' })).status, 404);
});

test('Bucharest clock uses local winter and summer time and rejects starts in the current minute', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-01-15T05:59:59Z') });
  const date = '2026-01-15';
  const opening = { date, startTime: '08:00', endTime: '08:30' };
  const reservation = await createBooking(alice, opening);

  t.mock.timers.setTime(Date.parse('2026-01-15T06:00:00Z'));
  assert.equal((await reserve(bob, { ...opening, desk: 2 })).status, 400);
  assert.equal((await cancel(alice, reservation.id)).status, 409);
  const { reservations } = await (await schedule(alice, { laboratory, date })).json();
  assert.deepEqual(reservations, [reservation]);

  t.mock.timers.setTime(Date.parse('2026-07-15T06:30:59Z'));
  const summer = { date: '2026-07-15', endTime: '10:00' };
  assert.equal((await reserve(alice, { ...summer, startTime: '09:29' })).status, 400);
  assert.equal((await reserve(alice, { ...summer, startTime: '09:30' })).status, 400);
  await createBooking(alice, { ...summer, startTime: '09:31' });
});

test('only the owner can cancel a future booking and repeated cancellation reports it missing', async () => {
  const reservation = await createBooking(alice);
  assert.deepEqual(reservation, {
    id: reservation.id,
    desk: 1,
    startTime: '08:30',
    endTime: '10:15',
    bookedBy: alice.name,
    mine: true,
  });
  const otherSchedule = await (await schedule(bob)).json();
  assert.deepEqual(otherSchedule.reservations, [{ ...reservation, mine: false }]);
  assert.equal((await cancel(bob, reservation.id)).status, 404);
  assert.equal((await cancel(alice, reservation.id)).status, 204);
  assert.equal((await cancel(alice, reservation.id)).status, 404);
  assert.deepEqual(await (await schedule(alice)).json(), { reservations: [] });
  await createBooking(bob);
});

test('adjacent bookings fit on the same desk and all overlap shapes conflict', async () => {
  const desk = 2;
  const middle = await createBooking(alice, { desk, startTime: '10:00', endTime: '14:00' });
  for (const [startTime, endTime] of [
    ['11:00', '12:00'], ['08:00', '11:00'], ['13:00', '16:00'],
    ['10:00', '14:00'], ['09:00', '15:00'],
  ]) {
    const response = await reserve(bob, { desk, startTime, endTime });
    assert.equal(response.status, 409, `${startTime}–${endTime}`);
    assert.match((await response.json()).error.message, /already booked/);
  }
  const before = await createBooking(bob, { desk, startTime: '08:00', endTime: '10:00' });
  const after = await createBooking(bob, { desk, startTime: '14:00', endTime: '20:00' });
  const { reservations } = await (await schedule(bob)).json();
  assert.deepEqual(reservations.filter((reservation) => reservation.desk === desk), [
    before, { ...middle, mine: false }, after,
  ]);
});

test('sixteen concurrent overlapping requests leave exactly one booking', async () => {
  const desk = 4;
  const attempts = await Promise.all(Array.from({ length: 16 }, (_, index) => {
    const minute = String(index).padStart(2, '0');
    return reserve(index % 2 === 0 ? alice : bob, { desk, startTime: `09:${minute}`, endTime: '11:00' });
  }));
  assert.equal(attempts.filter(({ status }) => status === 201).length, 1);
  assert.equal(attempts.filter(({ status }) => status === 409).length, 15);
  const { reservation } = await attempts.find(({ status }) => status === 201).json();
  const { reservations } = await (await schedule(alice)).json();
  assert.deepEqual(reservations.filter((booking) => booking.desk === desk).map(({ id }) => id), [reservation.id]);
});

test('identical times are available on separate desks, dates, and laboratories', async () => {
  const date = futureDate(5);
  const desk = 5;
  const booking = await createBooking(alice, { date, desk });
  const nextDay = futureDate(6);
  const [otherDesk, otherDate, otherLab] = await Promise.all([
    createBooking(bob, { date, desk: 12 }),
    createBooking(bob, { date: nextDay, desk }),
    createBooking(bob, { date, laboratory: secondLab, desk }),
  ]);

  assert.deepEqual(await (await schedule(alice, { laboratory, date })).json(), {
    reservations: [booking, { ...otherDesk, mine: false }],
  });
  assert.deepEqual(await (await schedule(bob, { laboratory, date: nextDay })).json(), { reservations: [otherDate] });
  assert.deepEqual(await (await schedule(bob, { laboratory: secondLab, date })).json(), { reservations: [otherLab] });
});

test('a booking survives republishing and switching the published localization of its laboratory', async () => {
  await app.plugin('i18n').service('locales').create({ code: 'ro', name: 'Romanian (ro)' });
  const labs = app.documents(laboratoryUid);
  const { documentId, slug } = await labs.create({
    locale: 'en', status: 'published', data: { title: 'Localized Desk Laboratory' },
  });
  const booking = await createBooking(alice, { laboratory: slug });
  await labs.publish({ documentId, locale: 'en' });
  assert.deepEqual(await (await schedule(alice, { laboratory: slug, date: day })).json(), { reservations: [booking] });

  const translation = await labs.update({
    documentId, locale: 'ro', status: 'published', data: { title: 'Laborator cu rezervări' },
  });
  assert.equal(translation.documentId, documentId);
  assert.equal(translation.slug, slug);
  await labs.unpublish({ documentId, locale: 'en' });
  assert.deepEqual(await (await schedule(alice, { laboratory: slug, date: day })).json(), { reservations: [booking] });
  assert.equal((await reserve(bob, { laboratory: slug })).status, 409);
});
