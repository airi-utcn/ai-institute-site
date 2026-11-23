import { normalizeRoomNumber } from './rooms.js';

const DEFAULT_TIMETABLE_URL = 'https://timetable.utcluj.ro';
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/;
const AIRI_BUILDING = /\bAIRI\b/i;

export const MAX_ROOM_SCHEDULE_DAYS = 7;
export const ROOM_SCHEDULE_TIME_ZONE = 'Europe/Bucharest';

function cleanText(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function roomMatches(value, target) {
  const normalized = normalizeRoomNumber(value);
  return (
    normalized === target ||
    normalized.endsWith(` ${target}`) ||
    normalized.endsWith(`-${target}`) ||
    normalized.endsWith(`/${target}`)
  );
}

/**
 * The timetable has many buildings with similar room numbers. Laboratory
 * pages on this site only refer to the AIRi building (Observatorului 2).
 */
export function isAiriBuilding(value) {
  return AIRI_BUILDING.test(String(value ?? ''));
}

function configuredUrl(...names) {
  for (const name of names) {
    const value = process.env[name];
    if (typeof value === 'string' && value.trim()) {
      return value.trim().replace(/\/+$/, '');
    }
  }
  return '';
}

/**
 * Server-side base URL for the UTCN timetable service.
 */
export function getTimetableUrl() {
  return configuredUrl('TIMETABLE_URL', 'TIMETABLE_API_URL') || DEFAULT_TIMETABLE_URL;
}

/**
 * Browser-facing timetable URL used for "open the full timetable" links.
 * It is resolved on the server so the browser bundle needs no public env var.
 */
export function getPublicTimetableUrl() {
  return configuredUrl('TIMETABLE_PUBLIC_URL') || getTimetableUrl();
}

export function isIsoDate(value) {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

/**
 * Add whole days to a calendar date without involving the local time zone.
 */
export function addIsoDays(value, days) {
  if (!isIsoDate(value) || !Number.isFinite(days)) return '';
  const parsed = new Date(`${value}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

/**
 * Inclusive number of calendar days between two ISO dates.
 */
export function inclusiveDayCount(from, to) {
  if (!isIsoDate(from) || !isIsoDate(to) || to < from) return 0;
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  return Math.round((end - start) / 86_400_000) + 1;
}

/**
 * Parse a timetable timestamp as wall-clock time. The service publishes local
 * Romanian times without an offset, so parsing it into a JS Date would shift
 * the value for visitors in another time zone.
 *
 * @returns {{date: string, minutes: number}|null}
 */
export function parseTimetableDateTime(value) {
  if (typeof value !== 'string') return null;
  const match = DATE_TIME.exec(value.trim());
  if (!match) return null;

  const [, year, month, day, hour = '00', minute = '00'] = match;
  const hours = Number(hour);
  const minutes = Number(minute);

  if (hours > 23 || minutes > 59) return null;
  if (!isIsoDate(`${year}-${month}-${day}`)) return null;

  return {
    date: `${year}-${month}-${day}`,
    minutes: hours * 60 + minutes,
  };
}

/**
 * Convert a timetable date/time to a comparable scalar (minutes since epoch).
 * Returns NaN for malformed values.
 */
export function timetableInstant(value) {
  const parsed =
    value && typeof value === 'object' ? value : parseTimetableDateTime(value);
  if (!parsed) return NaN;
  return Date.parse(`${parsed.date}T00:00:00Z`) / 60_000 + parsed.minutes;
}

/**
 * A full-day booking, such as 00:00 on one day until 00:00 the next.
 */
export function isAllDayEvent(event) {
  const start = parseTimetableDateTime(event?.start);
  if (!start) return false;

  const end = parseTimetableDateTime(event?.end);
  if (!end) return start.minutes === 0;
  return start.minutes === 0 && end.minutes === 0 && end.date > start.date;
}

/**
 * True when the current wall-clock instant falls inside the event.
 */
export function eventIsOngoing(event, now) {
  const start = timetableInstant(event?.start);
  const end = timetableInstant(event?.end);
  const current = timetableInstant(now);

  if (!Number.isFinite(start) || !Number.isFinite(current)) return false;
  const effectiveEnd = Number.isFinite(end) ? end : start + 1;
  return start <= current && current < effectiveEnd;
}

/**
 * Today's date in the timetable's time zone.
 */
export function todayInTimetableTimeZone(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: ROOM_SCHEDULE_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const value = (type) => parts.find((part) => part.type === type)?.value || '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

/**
 * Current wall-clock time in the timetable's time zone.
 *
 * @returns {{date: string, minutes: number}}
 */
export function nowInTimetableTimeZone(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: ROOM_SCHEDULE_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);

  const value = (type) => parts.find((part) => part.type === type)?.value || '';

  return {
    date: `${value('year')}-${value('month')}-${value('day')}`,
    minutes: Number(value('hour')) * 60 + Number(value('minute')),
  };
}

/**
 * Turn a room into the URL of its timetable week view.
 */
export function roomTimetableUrl(room, date, baseUrl = DEFAULT_TIMETABLE_URL) {
  const url = new URL(baseUrl || DEFAULT_TIMETABLE_URL);
  url.searchParams.set('room', String(room ?? '').trim());
  url.searchParams.set('view', 'week');
  if (isIsoDate(date)) url.searchParams.set('date', date);
  return url.toString();
}

/**
 * Open the timetable with specific calendars selected. The timetable stores
 * calendar selections in the URL fragment, which is also the only reliable way
 * to open a room whose calendar currently has no events.
 */
export function calendarTimetableUrl(
  sources,
  date,
  baseUrl = DEFAULT_TIMETABLE_URL
) {
  const url = new URL(baseUrl || DEFAULT_TIMETABLE_URL);
  url.searchParams.set('view', 'week');
  if (isIsoDate(date)) url.searchParams.set('date', date);

  const selected = (Array.isArray(sources) ? sources : [sources])
    .map((source) => String(source ?? '').trim())
    .filter(Boolean);

  if (selected.length) {
    url.hash = new URLSearchParams({ sources: selected.join('.') }).toString();
  }

  return url.toString();
}

function toRoomEvent(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const start = parseTimetableDateTime(raw.start);
  if (!start) return null;

  const end = parseTimetableDateTime(raw.end);
  const title = cleanText(raw.display_title || raw.title || raw.raw_title) || 'Reserved';
  const person = cleanText(raw.professor);
  const room = cleanText(raw.room);

  return {
    id: [raw.source, raw.start, raw.end, title].filter(Boolean).join('|'),
    title,
    person,
    room,
    start: String(raw.start).trim(),
    end: end ? String(raw.end).trim() : '',
    startDate: start.date,
    startMinutes: start.minutes,
    endDate: end?.date || '',
    endMinutes: end?.minutes ?? start.minutes,
  };
}

/**
 * Keep only the events assigned to the requested room. The timetable's room
 * query is a substring match, so the exact comparison happens here. Events
 * from other buildings with a similar room number are ignored.
 */
export function extractRoomEvents(payload, room, { sources = null } = {}) {
  const events = Array.isArray(payload) ? payload : payload?.events;
  const target = normalizeRoomNumber(room);
  if (!target || !Array.isArray(events)) return [];

  const seen = new Set();
  const result = [];

  for (const raw of events) {
    if (!roomMatches(raw?.room, target)) continue;
    if (raw?.building && !isAiriBuilding(raw.building)) continue;
    if (sources && raw?.source && !sources.has(raw.source)) continue;

    const event = toRoomEvent(raw);
    if (!event || seen.has(event.id)) continue;
    seen.add(event.id);
    result.push(event);
  }

  return result.sort(
    (left, right) =>
      left.start.localeCompare(right.start) ||
      left.end.localeCompare(right.end) ||
      left.title.localeCompare(right.title)
  );
}

/**
 * Find the timetable calendar entries for one room.
 */
export function findRoomCalendars(payload, room) {
  const target = normalizeRoomNumber(room);
  if (
    !target ||
    !payload ||
    typeof payload !== 'object' ||
    Array.isArray(payload)
  ) {
    return [];
  }

  return Object.entries(payload)
    .filter(
      ([, calendar]) =>
        calendar &&
        calendar.enabled !== 0 &&
        isAiriBuilding(calendar.building) &&
        roomMatches(calendar.room, target)
    )
    .map(([source, calendar]) => ({
      source,
      name: cleanText(calendar.name),
      building: cleanText(calendar.building),
      status: cleanText(calendar.freshness?.status),
      lastSuccess:
        typeof calendar.freshness?.last_success === 'string'
          ? calendar.freshness.last_success
          : '',
      windowFrom:
        typeof calendar.freshness?.window?.from === 'string'
          ? calendar.freshness.window.from
          : '',
      windowTo:
        typeof calendar.freshness?.window?.to === 'string'
          ? calendar.freshness.window.to
          : '',
    }));
}

const FRESHNESS_MAX_AGE_MS = 2 * 60 * 60 * 1000;

/**
 * A room is only "verified" when its calendar imported successfully recently
 * and covers the whole requested window. Otherwise the timetable cannot prove
 * that an empty result means the room is free.
 */
export function roomCalendarIsVerified(calendar, from, to, now = Date.now()) {
  if (!calendar || calendar.status === 'failed') return false;

  const lastSuccess = Date.parse(calendar.lastSuccess);
  if (!Number.isFinite(lastSuccess)) return false;

  const age = now - lastSuccess;
  if (age < 0 || age > FRESHNESS_MAX_AGE_MS) return false;

  if (calendar.windowFrom && calendar.windowFrom > from) return false;
  if (calendar.windowTo && calendar.windowTo < to) return false;

  return true;
}

async function fetchTimetableJson(fetchImpl, url, { revalidate, signal }) {
  const response = await fetchImpl(url, {
    headers: { Accept: 'application/json' },
    cache: 'force-cache',
    next: { revalidate },
    signal: signal || AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const error = new Error(
      `Timetable request failed (${response.status} ${response.statusText})`
    );
    error.status = response.status;
    throw error;
  }

  try {
    return await response.json();
  } catch {
    const error = new Error('Timetable returned invalid JSON');
    error.status = 502;
    throw error;
  }
}

/**
 * Fetch the public timetable for one room and return a small, sanitized list.
 */
export async function fetchRoomSchedule({
  room,
  from,
  to,
  fetchImpl = fetch,
  signal,
}) {
  const base = getTimetableUrl();

  const eventsUrl = new URL(`${base}/events.json`);
  eventsUrl.searchParams.set('from', from);
  eventsUrl.searchParams.set('to', to);
  eventsUrl.searchParams.set('room', room);

  const calendarsUrl = new URL(`${base}/calendars.json`);

  // A missing calendar list only makes the result unverified; it should not
  // hide the bookings that are still available from /events.json.
  const calendarsPromise = fetchTimetableJson(fetchImpl, calendarsUrl, {
    revalidate: 300,
    signal,
  }).catch(() => null);

  const eventsPayload = await fetchTimetableJson(fetchImpl, eventsUrl, {
    revalidate: 120,
    signal,
  });
  const calendarsPayload = await calendarsPromise;

  if (!Array.isArray(eventsPayload) && !Array.isArray(eventsPayload?.events)) {
    const error = new Error('Timetable returned an unexpected payload');
    error.status = 502;
    throw error;
  }

  const calendars = findRoomCalendars(calendarsPayload, room);
  const sources = calendars.map((calendar) => calendar.source);
  const airiSources = sources.length ? new Set(sources) : null;

  return {
    room,
    from,
    to,
    events: extractRoomEvents(eventsPayload, room, { sources: airiSources }),
    timetableUrl:
      sources.length > 0
        ? calendarTimetableUrl(sources, from, getPublicTimetableUrl())
        : roomTimetableUrl(room, from, getPublicTimetableUrl()),
    calendar: {
      source: calendars[0]?.source || '',
      sources,
      name: calendars[0]?.name || '',
      building: calendars[0]?.building || '',
      verified:
        calendars.length > 0 &&
        calendars.every((calendar) =>
          roomCalendarIsVerified(calendar, from, to)
        ),
      lastSuccess: calendars[0]?.lastSuccess || '',
    },
    checkedAt: new Date().toISOString(),
  };
}
