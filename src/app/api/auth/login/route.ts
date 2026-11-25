import { NextResponse } from 'next/server';
import { attachSession, checkLogin, validPin } from '@/lib/server/session';

export const dynamic = 'force-dynamic';

/** Sign in with username and PIN */
export async function POST(req: Request) {
  let body: { username?: unknown; pin?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  const { username, pin } = body;
  if (typeof username !== 'string' || !username.trim() || !validPin(pin)) {
    return NextResponse.json({ error: 'Wrong username or PIN' }, { status: 401 });
  }
  try {
    const result = await checkLogin(username, pin);
    if (!result) return NextResponse.json({ error: 'Wrong username or PIN' }, { status: 401 });
    if ('locked' in result) {
      return NextResponse.json({ error: 'locked', minutes: result.locked }, { status: 429 });
    }
    return attachSession(NextResponse.json({ user: result.user }), result.user.id);
  } catch (e) {
    console.error('POST /api/auth/login failed', e);
    return NextResponse.json({ error: 'Could not sign in' }, { status: 500 });
  }
}
