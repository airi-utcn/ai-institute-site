import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  addIsoDays,
  calendarTimetableUrl,
  eventIsOngoing,
  extractRoomEvents,
  fetchRoomSchedule,
  findRoomCalendars,
  inclusiveDayCount,
  isAiriBuilding,
  isAllDayEvent,
  isIsoDate,
  nowInTimetableTimeZone,
  parseTimetableDateTime,
  roomCalendarIsVerified,
  roomTimetableUrl,
  todayInTimetableTimeZone,
} from '../src/lib/timetable.js';

test('ISO dates are validated and shifted without time-zone drift', () => {
  assert.equal(isIsoDate('2026-11-23'), true);
  assert.equal(isIsoDate('2026-02-30'), false);
  assert.equal(isIsoDate('23-11-2026'), false);
  assert.equal(addIsoDays('2026-11-30', 1), '2026-12-01');
  assert.equal(addIsoDays('2026-11-23', 6), '2026-11-29');
  assert.equal(inclusiveDayCount('2026-11-23', '2026-11-29'), 7);
  assert.equal(inclusiveDayCount('2026-11-29', '2026-11-23'), 0);
});

test('timetable timestamps stay wall-clock values', () => {
  assert.deepEqual(parseTimetableDateTime('2026-11-25T08:30:00'), {
    date: '2026-11-25',
    minutes: 510,
  });
  assert.deepEqual(parseTimetableDateTime('2026-11-25'), {
    date: '2026-11-25',
    minutes: 0,
  });
  assert.equal(parseTimetableDateTime(''), null);
  assert.equal(parseTimetableDateTime('not a date'), null);
  assert.equal(parseTimetableDateTime('2026-11-25T25:00:00'), null);
});

test('today and now are read in the Bucharest time zone', () => {
  const lateUtc = new Date('2026-11-23T23:30:00Z');
  assert.equal(todayInTimetableTimeZone(lateUtc), '2026-11-24');

  const morningUtc = new Date('2026-11-23T08:05:00Z');
  assert.deepEqual(nowInTimetableTimeZone(morningUtc), {
    date: '2026-11-23',
    minutes: 10 * 60 + 5,
  });
});

test('only the exact room is returned, deduplicated and sorted', () => {
  const events = extractRoomEvents(
    [
      {
        room: 'L201',
        start: '2026-11-25T10:00:00',
        end: '2026-11-25T12:00:00',
        display_title: '  Lab   meeting ',
        professor: 'Ada Lovelace',
        source: 'src-a',
      },
      {
        room: 'Room L201',
        start: '2026-11-24T00:00:00',
        end: '2026-11-25T00:00:00',
        title: 'All day booking',
        source: 'src-b',
      },
      {
        room: 'L201',
        start: '2026-11-25T10:00:00',
        end: '2026-11-25T12:00:00',
        display_title: '  Lab   meeting ',
        professor: 'Ada Lovelace',
        source: 'src-a',
      },
      {
        room: 'Sala L201',
        start: '2026-11-26T09:00:00',
        end: '2026-11-26T10:00:00',
        title: 'Sala booking',
      },
      {
        room: 'L2010',
        start: '2026-11-26T09:00:00',
        end: '2026-11-26T10:00:00',
        title: 'Different room',
      },
      {
        room: 'L201',
        building: 'UTCN MUNCII 103-105 Corp G',
        start: '2026-11-27T09:00:00',
        end: '2026-11-27T10:00:00',
        title: 'Other building',
        source: 'src-other',
      },
      {
        room: 'L202',
        start: '2026-11-24T09:00:00',
        end: '2026-11-24T10:00:00',
        title: 'Other room',
      },
    ],
    'l201'
  );

  assert.equal(events.length, 3);
  assert.deepEqual(
    events.map((event) => event.title),
    ['All day booking', 'Lab meeting', 'Sala booking']
  );
  assert.equal(events[0].person, '');
  assert.equal(events[1].person, 'Ada Lovelace');
  assert.equal(events[2].person, '');
  assert.equal(isAllDayEvent(events[0]), true);
  assert.equal(isAllDayEvent(events[1]), false);
});

test('ongoing status uses the event wall-clock interval', () => {
  const event = {
    start: '2026-11-23T08:00:00',
    end: '2026-11-23T16:00:00',
  };
  assert.equal(
    eventIsOngoing(event, { date: '2026-11-23', minutes: 9 * 60 }),
    true
  );
  assert.equal(
    eventIsOngoing(event, { date: '2026-11-23', minutes: 16 * 60 }),
    false
  );
});

test('fetchRoomSchedule queries the timetable and sanitizes the result', async () => {
  const requested = [];
  const now = new Date().toISOString();
  const schedule = await fetchRoomSchedule({
    room: 'L201',
    from: '2026-11-23',
    to: '2026-11-29',
    fetchImpl: async (url, options) => {
      const path = new URL(url).pathname;
      requested.push({ path, url: new URL(url), options });

      if (path === '/calendars.json') {
        return {
          ok: true,
          json: async () => ({
            'src-a': {
              name: 'UTCN - AIRI - Sala L201',
              building: 'UTCN AIRI',
              room: 'L201',
              enabled: 1,
              freshness: {
                status: 'success',
                last_success: now,
                window: { from: '2026-10-24', to: '2027-07-21' },
              },
            },
            'src-other': {
              name: 'UTCN - Muncii - Sala L201',
              building: 'UTCN MUNCII 103-105 Corp G',
              room: 'L201',
              enabled: 1,
              freshness: {
                status: 'success',
                last_success: now,
                window: { from: '2026-10-24', to: '2027-07-21' },
              },
            },
          }),
        };
      }

      return {
        ok: true,
        json: async () => [
          {
            room: 'L201',
            start: '2026-11-23T08:00:00',
            end: '2026-11-23T09:00:00',
            display_title: 'Lecture',
            professor: 'Grace Hopper',
            source: 'src-a',
            ignored: 'not exposed',
          },
          {
            room: 'L201',
            building: 'UTCN MUNCII 103-105 Corp G',
            start: '2026-11-23T10:00:00',
            end: '2026-11-23T11:00:00',
            title: 'Other building lecture',
            source: 'src-other',
          },
        ],
      };
    },
  });

  const eventsRequest = requested.find((item) => item.path === '/events.json');
  const calendarsRequest = requested.find(
    (item) => item.path === '/calendars.json'
  );

  assert.equal(eventsRequest.url.searchParams.get('room'), 'L201');
  assert.equal(eventsRequest.url.searchParams.get('from'), '2026-11-23');
  assert.equal(eventsRequest.url.searchParams.get('to'), '2026-11-29');
  assert.equal(eventsRequest.options.headers.Accept, 'application/json');
  assert.equal(calendarsRequest.options.next.revalidate, 300);
  assert.equal(schedule.events.length, 1);
  assert.equal(schedule.calendar.verified, true);
  assert.equal(schedule.calendar.name, 'UTCN - AIRI - Sala L201');
  const timetableLink = new URL(schedule.timetableUrl);
  assert.equal(timetableLink.searchParams.has('room'), false);
  assert.equal(timetableLink.searchParams.get('date'), '2026-11-23');
  assert.equal(timetableLink.hash, '#sources=src-a');
  assert.deepEqual(schedule.calendar.sources, ['src-a']);
  assert.deepEqual(Object.keys(schedule.events[0]).sort(), [
    'end',
    'endDate',
    'endMinutes',
    'id',
    'person',
    'room',
    'start',
    'startDate',
    'startMinutes',
    'title',
  ]);
});

test('a missing or stale calendar list makes the schedule unverified', async () => {
  const events = [
    {
      room: 'L201',
      start: '2026-11-23T08:00:00',
      end: '2026-11-23T09:00:00',
      title: 'Lecture',
    },
  ];

  const missing = await fetchRoomSchedule({
    room: 'L201',
    from: '2026-11-23',
    to: '2026-11-29',
    fetchImpl: async (url) => {
      if (new URL(url).pathname === '/calendars.json') {
        return { ok: false, status: 503, statusText: 'Busy' };
      }
      return { ok: true, json: async () => events };
    },
  });
  assert.equal(missing.events.length, 1);
  assert.equal(missing.calendar.verified, false);

  const stale = await fetchRoomSchedule({
    room: 'L201',
    from: '2026-11-23',
    to: '2026-11-29',
    fetchImpl: async (url) => {
      if (new URL(url).pathname === '/calendars.json') {
        return {
          ok: true,
          json: async () => ({
            'src-a': {
              name: 'UTCN - AIRI - Sala L201',
              building: 'UTCN AIRI',
              room: 'L201',
              enabled: 1,
              freshness: {
                status: 'failed',
                last_success: '2026-11-20T08:00:00.000Z',
                window: { from: '2026-10-24', to: '2027-07-21' },
              },
            },
          }),
        };
      }
      return { ok: true, json: async () => events };
    },
  });
  assert.equal(stale.events.length, 1);
  assert.equal(stale.calendar.verified, false);
});

test('calendar verification checks status, age, and window coverage', () => {
  const now = Date.parse('2026-11-23T10:00:00Z');
  const calendar = {
    status: 'success',
    lastSuccess: '2026-11-23T09:00:00.000Z',
    windowFrom: '2026-10-24',
    windowTo: '2027-07-21',
  };

  assert.equal(
    roomCalendarIsVerified(calendar, '2026-11-23', '2026-11-29', now),
    true
  );
  assert.equal(
    roomCalendarIsVerified(
      { ...calendar, status: 'failed' },
      '2026-11-23',
      '2026-11-29',
      now
    ),
    false
  );
  assert.equal(
    roomCalendarIsVerified(
      { ...calendar, lastSuccess: '2026-11-23T07:00:00.000Z' },
      '2026-11-23',
      '2026-11-29',
      now
    ),
    false
  );
  assert.equal(
    roomCalendarIsVerified(
      { ...calendar, windowTo: '2026-11-25' },
      '2026-11-23',
      '2026-11-29',
      now
    ),
    false
  );
});

test('room calendars are matched by normalized room label and AIRI building', () => {
  const calendars = findRoomCalendars(
    {
      a: {
        room: 'L201',
        building: 'UTCN AIRI - Artificial Intelligence Research Institute',
        enabled: 1,
        name: 'Room L201',
      },
      b: {
        room: 'Room L201',
        building: 'UTCN AIRI Observatorului 2',
        enabled: 1,
        name: 'Duplicate',
      },
      c: {
        room: 'L201',
        building: 'UTCN AIRI',
        enabled: 0,
        name: 'Disabled',
      },
      d: {
        room: 'L202',
        building: 'UTCN AIRI',
        enabled: 1,
        name: 'Other',
      },
      e: {
        room: 'L201',
        building: 'UTCN MUNCII 103-105 Corp G',
        enabled: 1,
        name: 'Other building',
      },
    },
    'l201'
  );

  assert.deepEqual(
    calendars.map((calendar) => calendar.name),
    ['Room L201', 'Duplicate']
  );
});

test('only the AIRI building counts for laboratory schedules', () => {
  assert.equal(
    isAiriBuilding('UTCN AIRI - Artificial Intelligence Research Institute'),
    true
  );
  assert.equal(isAiriBuilding('UTCN AIRI Observatorului 2'), true);
  assert.equal(
    isAiriBuilding('UTCN CLUJ OBSERVATORULUI 2 Corp Laboratoare'),
    false
  );
  assert.equal(isAiriBuilding('UTCN MUNCII 103-105 Corp G'), false);
  assert.equal(isAiriBuilding(''), false);
});

test('fetchRoomSchedule surfaces upstream failures', async () => {
  await assert.rejects(
    () =>
      fetchRoomSchedule({
        room: 'L201',
        from: '2026-11-23',
        to: '2026-11-29',
        fetchImpl: async () => ({ ok: false, status: 503, statusText: 'Busy' }),
      }),
    (error) => error.status === 503
  );
});

test('the timetable link opens the room week view', () => {
  const url = new URL(roomTimetableUrl('L201', '2026-11-23'));

  assert.equal(url.hostname, 'timetable.utcluj.ro');
  assert.equal(url.searchParams.get('room'), 'L201');
  assert.equal(url.searchParams.get('view'), 'week');
  assert.equal(url.searchParams.get('date'), '2026-11-23');
});

test('the timetable link pins the exact AIRI calendar sources', () => {
  const url = new URL(
    calendarTimetableUrl(['src-a', 'src-b'], '2026-11-23')
  );

  assert.equal(url.searchParams.has('room'), false);
  assert.equal(url.hash, '#sources=src-a.src-b');
});
