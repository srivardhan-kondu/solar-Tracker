import { NextResponse } from 'next/server';
import { createUserWithPin, sql } from '@/lib/server/db';
import { hashPin, notAllowed, notSignedIn, sessionUser } from '@/lib/server/session';
import { checkNewPerson, NewPerson, rolesYouCanAdd } from '@/lib/onboarding';
import { User } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * Onboard an employee: their details and sign-in PIN, saved together.
 * Head office can add anyone; office staff can add installers and service engineers.
 * Returns { user } or { problems } (by field).
 */
export async function POST(req: Request) {
  let body: Partial<NewPerson>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  try {
    const me = await sessionUser();
    if (!me) return notSignedIn();
    const input: NewPerson = {
      name: String(body.name ?? ''),
      username: String(body.username ?? ''),
      pin: String(body.pin ?? ''),
      mobile: String(body.mobile ?? ''),
      role: body.role as NewPerson['role'],
      division: String(body.division ?? ''),
      address: String(body.address ?? ''),
      joiningDate: String(body.joiningDate ?? ''),
      employeeId: String(body.employeeId ?? ''),
      emergencyContactName: String(body.emergencyContactName ?? ''),
      emergencyContactPhone: String(body.emergencyContactPhone ?? ''),
    };
    if (!rolesYouCanAdd(me.role).includes(input.role)) return notAllowed('You cannot add this kind of person');

    const taken = ((await sql.query(`select data->>'username' as u from users`)) as { u: string }[]).map((r) => r.u);
    const { problems, clean } = checkNewPerson(input, taken);
    if (Object.keys(problems).length) return NextResponse.json({ problems }, { status: 400 });

    const user: User = {
      ...clean,
      id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      status: 'Active',
      lastLogin: '',
      onboardedBy: me.name,
      onboardedAt: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }),
      ...(clean.role === 'Installer' ? { villageIds: [] } : {}),
    };
    await createUserWithPin(user as unknown as { id: string }, await hashPin(input.pin));
    return NextResponse.json({ user });
  } catch (e) {
    console.error('POST /api/users failed', e);
    return NextResponse.json({ error: 'Could not add the person' }, { status: 500 });
  }
}
