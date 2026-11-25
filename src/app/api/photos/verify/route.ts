import { NextResponse } from 'next/server';
import { isValidKey } from '@/lib/server/storage';
import { verifyPhoto } from '@/lib/server/photos';
import { notSignedIn, sessionUser } from '@/lib/server/session';

export const dynamic = 'force-dynamic';

/** Is this stored photo exactly as it was received? GET /api/photos/verify?key=<storage key> */
export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get('key') || '';
  if (!isValidKey(key)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  try {
    if (!(await sessionUser())) return notSignedIn();
    return NextResponse.json(await verifyPhoto(key), { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('GET /api/photos/verify failed', e);
    return NextResponse.json({ error: 'Could not check the photo' }, { status: 500 });
  }
}
