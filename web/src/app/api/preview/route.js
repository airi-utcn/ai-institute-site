import { draftMode, cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  PREVIEW_COOKIE,
  PREVIEW_MAX_AGE_SECONDS,
  PREVIEW_STATUSES,
  createPreviewToken,
  isValidPreviewSecret,
  resolvePreviewTarget,
} from '@/lib/preview';

export const dynamic = 'force-dynamic';

const isSafeLocale = (locale) =>
  typeof locale === 'string' && /^[a-z]{2,3}(?:-[A-Za-z]{2,4})?$/.test(locale);

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  const rawPath = searchParams.get('url') || '/';
  const requestedStatus = searchParams.get('status');
  const requestedLocale = searchParams.get('locale');

  if (!isValidPreviewSecret(secret)) {
    return new Response('Invalid preview token', {
      status: 401,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  const target = resolvePreviewTarget(rawPath);
  if (!target) {
    return new Response('Invalid preview path', {
      status: 400,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  const status = PREVIEW_STATUSES.has(requestedStatus) ? requestedStatus : 'draft';
  const locale = isSafeLocale(requestedLocale) ? requestedLocale : null;
  const expiresAt = Date.now() + PREVIEW_MAX_AGE_SECONDS * 1000;
  const token = createPreviewToken({ status, locale, expiresAt });

  if (!token) {
    return new Response('Preview is not configured', {
      status: 503,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  // Draft mode bypasses the Next.js fetch cache. The signed cookie above is
  // what actually authorises reading non-published Strapi content.
  const draft = await draftMode();
  draft.enable();

  const cookieStore = await cookies();
  cookieStore.set(PREVIEW_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: PREVIEW_MAX_AGE_SECONDS,
  });

  if (locale) {
    cookieStore.set('NEXT_LOCALE', locale, {
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });
  }

  return new NextResponse(null, {
    status: 307,
    headers: {
      Location: target.path,
      'Cache-Control': 'no-store',
      // The preview secret is in this URL. Do not forward it as the Referer
      // of the redirected page, and do not leak it to later requests.
      'Referrer-Policy': 'no-referrer',
    },
  });
}
