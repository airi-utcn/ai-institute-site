/**
 * Outlook published-calendar helpers.
 *
 * Outlook publishes an .ics feed, but the embeddable month view is the
 * matching .html URL. Content managers may paste either one into Strapi, so we
 * normalize the value and derive both links from it.
 */

export const DEFAULT_CALENDAR_ICS_URL =
  'https://outlook.office365.com/owa/calendar/03fcfa83c4ac48e1ba0031c55a958c35@campus.utcluj.ro/4deb95cb924d4d80ae21dd1a539599a014540741905280907663/calendar.ics';

const ALLOWED_CALENDAR_HOSTS = new Set([
  'outlook.office365.com',
  'outlook.office.com',
  'outlook.live.com',
]);

/**
 * Only allow https URLs on known Outlook hosts. This keeps the value coming
 * from Strapi from turning into an arbitrary third-party iframe.
 */
export function normalizeCalendarUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return '';

  try {
    const url = new URL(rawUrl.trim());
    if (url.protocol !== 'https:') return '';
    if (!ALLOWED_CALENDAR_HOSTS.has(url.hostname.toLowerCase())) return '';
    return url.toString();
  } catch {
    return '';
  }
}

export function toCalendarIcsUrl(rawUrl) {
  const url = normalizeCalendarUrl(rawUrl);
  if (!url) return '';
  return url.replace(/calendar\.html(\?.*)?$/i, 'calendar.ics$1');
}

export function toCalendarEmbedUrl(rawUrl) {
  const url = normalizeCalendarUrl(rawUrl);
  if (!url) return '';
  return url.replace(/calendar\.ics(\?.*)?$/i, 'calendar.html$1');
}

/**
 * Resolve the public links for the page. A valid Strapi override wins;
 * otherwise the institute's published Outlook calendar is used.
 */
export function resolveCalendarLinks(overrideUrl) {
  const source = normalizeCalendarUrl(overrideUrl) || DEFAULT_CALENDAR_ICS_URL;
  return {
    icsUrl: toCalendarIcsUrl(source) || source,
    embedUrl: toCalendarEmbedUrl(source) || source,
  };
}
