import { NextResponse } from 'next/server';
import { notSignedIn, sessionUser } from '@/lib/server/session';
import { appSettings } from '@/lib/server/settings';

export const dynamic = 'force-dynamic';

/** Switches the phone follows, e.g. whether survey photos must be inside the installer's villages */
export async function GET() {
  try {
    const user = await sessionUser();
    if (!user) return notSignedIn();
    return NextResponse.json(appSettings(), { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('GET /api/settings failed', e);
    return NextResponse.json({ error: 'Could not read settings' }, { status: 500 });
  }
}
