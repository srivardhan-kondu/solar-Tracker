import { NextResponse } from 'next/server';
import { parseChanges } from '@/lib/server/db';
import { notSignedIn, sessionUser } from '@/lib/server/session';
import { applyChangesAs } from '@/lib/server/scope';

export const dynamic = 'force-dynamic';

/**
 * Save the records the app changed. Records this person may not change
 * (for example, a home outside an installer's work area) are left out and listed in `refused`.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  const changes = parseChanges(body);
  if (!changes) return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  try {
    const user = await sessionUser();
    if (!user) return notSignedIn();
    const refused = await applyChangesAs(user, changes);
    if (refused.length) console.warn(`Refused ${refused.length} change(s) from ${user.username}`, refused);
    return NextResponse.json({ ok: true, refused });
  } catch (e) {
    console.error('POST /api/sync failed', e);
    return NextResponse.json({ error: 'Could not save to the database' }, { status: 500 });
  }
}
