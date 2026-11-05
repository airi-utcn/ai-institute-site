import { draftMode, cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { PREVIEW_COOKIE, resolveExitPath } from '@/lib/preview';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const draft = await draftMode();
  draft.disable();

  const cookieStore = await cookies();
  cookieStore.delete(PREVIEW_COOKIE);

  // The Location is intentionally relative. Behind a reverse proxy,
  // request.url can be the internal address (http://localhost:3000); the
  // browser resolves this path against the public origin it is already on.
  return new NextResponse(null, {
    status: 307,
    headers: {
      Location: resolveExitPath(request.headers.get('referer')),
      'Cache-Control': 'no-store',
    },
  });
}
