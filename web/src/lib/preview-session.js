import { cookies } from 'next/headers';
import { PREVIEW_COOKIE, verifyPreviewToken } from './preview';

/**
 * Return the current preview session, or null for ordinary visitors.
 *
 * Only a valid, unexpired, HMAC-signed cookie created by /api/preview counts.
 * A leftover Next.js draft-mode cookie is never accepted on its own.
 */
export async function getPreviewSession() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(PREVIEW_COOKIE)?.value;
    return verifyPreviewToken(token);
  } catch {
    // cookies() is unavailable during some build/static phases; treat those
    // requests as ordinary published-only traffic.
    return null;
  }
}
