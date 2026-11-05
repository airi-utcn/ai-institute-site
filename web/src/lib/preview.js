import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Preview sessions are deliberately independent from Next.js draft mode.
 *
 * Draft mode alone only controls caching. It is a long-lived browser cookie and
 * gives no guarantee that the visitor started a preview or that the preview is
 * still allowed. The signed cookie below is the single source of truth for
 * whether a request may read unpublished content.
 */

export const PREVIEW_COOKIE = 'airi_preview';
export const PREVIEW_MAX_AGE_SECONDS = 60 * 60; // one hour

export const PREVIEW_STATUSES = new Set(['draft', 'published']);

const getPreviewSecret = () => process.env.PREVIEW_SECRET || '';

const encode = (value) => Buffer.from(value, 'utf8').toString('base64url');

const sign = (value, secret) =>
  createHmac('sha256', secret).update(value).digest();

export function createPreviewToken({ status, locale, expiresAt }) {
  const secret = getPreviewSecret();
  if (!secret) return null;
  if (!PREVIEW_STATUSES.has(status)) return null;

  const payload = JSON.stringify({
    status,
    locale: locale || null,
    expiresAt,
  });
  const encodedPayload = encode(payload);
  const signature = sign(encodedPayload, secret).toString('base64url');

  return `${encodedPayload}.${signature}`;
}

export function verifyPreviewToken(token) {
  const secret = getPreviewSecret();
  if (!secret || typeof token !== 'string') return null;

  const separator = token.lastIndexOf('.');
  if (separator <= 0) return null;

  const encodedPayload = token.slice(0, separator);
  const providedSignature = token.slice(separator + 1);
  if (!encodedPayload || !providedSignature) return null;

  const expectedSignature = sign(encodedPayload, secret);
  let providedBuffer;
  try {
    providedBuffer = Buffer.from(providedSignature, 'base64url');
  } catch {
    return null;
  }

  if (
    providedBuffer.length !== expectedSignature.length ||
    !timingSafeEqual(providedBuffer, expectedSignature)
  ) {
    return null;
  }

  let payload;
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }

  if (!payload || typeof payload.expiresAt !== 'number') return null;
  if (payload.expiresAt <= Date.now()) return null;
  if (!PREVIEW_STATUSES.has(payload.status)) return null;

  return {
    status: payload.status,
    locale: typeof payload.locale === 'string' ? payload.locale : null,
    expiresAt: payload.expiresAt,
  };
}

/**
 * Compare the supplied preview secret without leaking its length through an
 * early return. Hashing both values first also makes timingSafeEqual safe for
 * inputs of different lengths.
 */
export function isValidPreviewSecret(candidate) {
  const secret = getPreviewSecret();
  if (!secret || typeof candidate !== 'string') return false;

  const hash = (value) => createHmac('sha256', 'preview-secret').update(value).digest();
  return timingSafeEqual(hash(candidate), hash(secret));
}

// Static pages that may be opened as a preview target.
export const ALLOWED_STATIC_PATHS = new Set([
  '/',
  '/about',
  '/about/leadership',
  '/collaborators',
  '/contact',
  '/engagement',
  '/engagement/partners',
  '/engagement/partners/previous',
  '/equipment',
  '/media',
  '/news&events/awards',
  '/news&events/careers',
  '/news&events/events',
  '/news&events/news',
  '/news&events/news/archive',
  '/news&events/open-project-calls',
  '/news&events/seminars',
  '/people',
  '/research/departments',
  '/research/laboratories',
  '/research/paper-graph',
  '/research/projects',
  '/research/projects/archive',
  '/research/publications',
  '/research/results',
  '/research/themes',
  '/resources',
  '/search',
  '/timeline',
]);

// Detail routes. Keep this in sync with the Strapi preview target registry;
// server/tests/preview-targets.test.mjs checks both sides.
export const ALLOWED_PATH_PATTERNS = [
  /^\/engagement\/partners\/[^/?#]+$/,
  /^\/news&events\/awards\/[^/?#]+$/,
  /^\/news&events\/events\/[^/?#]+$/,
  /^\/news&events\/news\/[^/?#]+$/,
  /^\/people\/[^/?#]+$/,
  /^\/people\/[^/?#]+\/[^/?#]+$/,
  /^\/research\/departments\/[^/?#]+$/,
  /^\/research\/laboratories\/[^/?#]+$/,
  /^\/research\/paper-graph\/[^/?#]+$/,
  /^\/research\/paper-graph\/[^/?#]+\/[^/?#]+$/,
  /^\/research\/projects\/[^/?#]+$/,
  /^\/research\/publications\/[^/?#]+$/,
  /^\/research\/results\/[^/?#]+$/,
];

export function isAllowedPreviewPath(path) {
  if (!path || typeof path !== 'string') return false;
  // Security check: must start with a single '/' to prevent open redirects
  // (for example //attacker.com, https://attacker.com or /\\attacker.com).
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) {
    return false;
  }

  const pathname = path.split('?')[0].split('#')[0];
  if (ALLOWED_STATIC_PATHS.has(pathname)) return true;
  return ALLOWED_PATH_PATTERNS.some((pattern) => pattern.test(pathname));
}

/**
 * Resolve and validate a preview target coming from Strapi. Absolute URLs,
 * protocol-relative URLs and backslashes are rejected so a compromised or
 * misconfigured Strapi instance cannot turn preview into an open redirect.
 */
export function resolvePreviewTarget(rawPath) {
  if (!rawPath || typeof rawPath !== 'string') return null;
  if (rawPath.includes('\\')) return null;
  if (!rawPath.startsWith('/') || rawPath.startsWith('//')) return null;

  let target;
  try {
    target = new URL(rawPath, 'http://preview.invalid');
  } catch {
    return null;
  }

  if (target.origin !== 'http://preview.invalid') return null;
  if (!isAllowedPreviewPath(target.pathname)) return null;

  return {
    pathname: target.pathname,
    path: `${target.pathname}${target.search}`,
  };
}
