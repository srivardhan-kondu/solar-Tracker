import { NextResponse } from 'next/server';
import { clearLoginLock, notAllowed, notSignedIn, sessionUser, setPin, validPin } from '@/lib/server/session';
import { sql } from '@/lib/server/db';
import { User } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * Set someone's PIN. Body: { userId, pin }
 * Head office can set anyone's; office staff can set installers' and service engineers'.
 */
export async function POST(req: Request) {
  let body: { userId?: unknown; pin?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  try {
    const me = await sessionUser();
    if (!me) return notSignedIn();
    const { userId, pin } = body;
    if (typeof userId !== 'string' || !validPin(pin)) {
      return NextResponse.json({ error: 'PIN must be 4 to 8 digits' }, { status: 400 });
    }
    const rows = (await sql.query(`select data from users where id = $1`, [userId])) as { data: User }[];
    const target = rows[0]?.data;
    if (!target) return NextResponse.json({ error: 'Person not found' }, { status: 404 });
    const allowed =
      me.role === 'Super Admin' ||
      (me.role === 'Admin' && (target.role === 'Installer' || target.role === 'Service Engineer'));
    if (!allowed) return notAllowed('Only head office can set this PIN');
    await setPin(userId, pin);
    await clearLoginLock(target.username);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('POST /api/auth/pin failed', e);
    return NextResponse.json({ error: 'Could not set the PIN' }, { status: 500 });
  }
}
