import { NextResponse } from 'next/server';
import { resetToSeed } from '@/lib/server/db';
import { IS_DEMO } from '@/lib/mode';
import { notAllowed, notSignedIn, sessionUser } from '@/lib/server/session';

export const dynamic = 'force-dynamic';

/** "Reset demo": wipe the database and put the sample data back. Only when allowed in the settings, and only head office. */
export async function POST() {
  if (!IS_DEMO || process.env.ALLOW_DEMO_RESET !== 'true') {
    return NextResponse.json({ error: 'Reset is turned off on this server' }, { status: 403 });
  }
  try {
    const user = await sessionUser();
    if (!user) return notSignedIn();
    if (user.role !== 'Super Admin') return notAllowed('Only head office can reset');
    await resetToSeed();
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('POST /api/reset failed', e);
    return NextResponse.json({ error: 'Could not reset the database' }, { status: 500 });
  }
}
