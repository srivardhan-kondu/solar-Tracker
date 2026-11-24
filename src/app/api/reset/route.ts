import { NextResponse } from 'next/server';
import { resetToSeed } from '@/lib/server/db';

export const dynamic = 'force-dynamic';

/** "Reset demo": wipe the database and put the sample data back. Only when allowed in the settings. */
export async function POST() {
  if (process.env.ALLOW_DEMO_RESET !== 'true') {
    return NextResponse.json({ error: 'Reset is turned off on this server' }, { status: 403 });
  }
  try {
    await resetToSeed();
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('POST /api/reset failed', e);
    return NextResponse.json({ error: 'Could not reset the database' }, { status: 500 });
  }
}
