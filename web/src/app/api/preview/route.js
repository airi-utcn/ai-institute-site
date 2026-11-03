import { draftMode } from 'next/headers';
import { NextResponse } from 'next/server';

const PREVIEW_PATHS = new Set(['/engagement']);

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  const path = searchParams.get('url') || '/';
  const status = searchParams.get('status');
  const locale = searchParams.get('locale');

  if (!process.env.PREVIEW_SECRET || secret !== process.env.PREVIEW_SECRET) {
    return new Response('Invalid preview token', { status: 401 });
  }

  if (!PREVIEW_PATHS.has(path)) {
    return new Response('Invalid preview path', { status: 400 });
  }

  const draft = await draftMode();
  if (status === 'published') {
    draft.disable();
  } else {
    draft.enable();
  }

  const response = new NextResponse(null, {
    status: 307,
    headers: {
      Location: path,
    },
  });
  if (locale) {
    response.cookies.set('NEXT_LOCALE', locale, {
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });
  }

  return response;
}
