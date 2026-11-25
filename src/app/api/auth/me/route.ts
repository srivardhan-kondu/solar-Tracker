import { NextResponse } from 'next/server';
import { attachSession, notSignedIn, sessionUser } from '@/lib/server/session';

export const dynamic = 'force-dynamic';

/** Who is signed in on this device. Also renews the 30 days. */
export async function GET() {
  try {
    const user = await sessionUser();
    if (!user) return notSignedIn();
    return attachSession(NextResponse.json({ user }, { headers: { 'Cache-Control': 'no-store' } }), user.id);
  } catch (e) {
    console.error('GET /api/auth/me failed', e);
    return NextResponse.json({ error: 'Could not check sign-in' }, { status: 500 });
  }
}
