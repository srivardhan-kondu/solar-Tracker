import { NextResponse } from 'next/server';
import { notSignedIn, sessionUser } from '@/lib/server/session';
import { readFor } from '@/lib/server/scope';

export const dynamic = 'force-dynamic';

/** Everything the signed-in person may see, from the database */
export async function GET() {
  try {
    const user = await sessionUser();
    if (!user) return notSignedIn();
    return NextResponse.json(await readFor(user), { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('GET /api/data failed', e);
    return NextResponse.json({ error: 'Could not read from the database' }, { status: 500 });
  }
}
