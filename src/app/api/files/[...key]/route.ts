import { NextResponse } from 'next/server';
import { isValidKey, photoLink } from '@/lib/server/storage';
import { notSignedIn, sessionUser } from '@/lib/server/session';

export const dynamic = 'force-dynamic';

/** Show a stored photo: send the browser to a link that works for one hour */
export async function GET(_req: Request, { params }: { params: { key: string[] } }) {
  const key = params.key.join('/');
  if (!isValidKey(key)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  try {
    if (!(await sessionUser())) return notSignedIn();
    const res = NextResponse.redirect(await photoLink(key), 307);
    res.headers.set('Cache-Control', 'private, max-age=3000');
    return res;
  } catch (e) {
    console.error('GET /api/files failed', e);
    return NextResponse.json({ error: 'Could not load the photo' }, { status: 500 });
  }
}
