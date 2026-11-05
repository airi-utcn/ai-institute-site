import { draftMode, cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { PREVIEW_COOKIE, isAllowedPreviewPath } from '@/lib/preview';

export const dynamic = 'force-dynamic';

const redirectTarget = (request) => {
  const referer = request.headers.get('referer');
  if (!referer) return '/';

  try {
    const source = new URL(request.url);
    const ref = new URL(referer);
    if (ref.origin !== source.origin) return '/';
    if (!isAllowedPreviewPath(ref.pathname)) return '/';
    return `${ref.pathname}${ref.search}`;
  } catch {
    return '/';
  }
};

export async function GET(request) {
  const draft = await draftMode();
  draft.disable();

  const cookieStore = await cookies();
  cookieStore.delete(PREVIEW_COOKIE);

  return NextResponse.redirect(new URL(redirectTarget(request), request.url), {
    status: 307,
    headers: { 'Cache-Control': 'no-store' },
  });
}
