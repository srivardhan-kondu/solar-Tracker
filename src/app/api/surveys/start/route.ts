import { NextResponse } from 'next/server';
import { notAllowed, notSignedIn, sessionUser } from '@/lib/server/session';
import { NewHomeDetails, takeHomeForSurvey } from '@/lib/server/scope';
import { installerNewSurvey } from '@/lib/server/settings';

export const dynamic = 'force-dynamic';

/**
 * "New survey": an installer types a home's details and surveys it, without the office assigning it.
 * Body: { consumerNumber, details: { name, mobile, villageId or village/mandal/district, capacityKw, ula } }.
 * Returns { consumer, added, alreadyYours } or { problem, field? }.
 */
export async function POST(req: Request) {
  let body: { consumerNumber?: unknown; details?: Partial<Record<keyof NewHomeDetails, unknown>> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  if (typeof body?.consumerNumber !== 'string') return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  const d = body.details;
  const details: NewHomeDetails = {
    name: String(d?.name ?? ''),
    mobile: String(d?.mobile ?? ''),
    villageId: String(d?.villageId ?? ''),
    village: String(d?.village ?? ''),
    mandal: String(d?.mandal ?? ''),
    district: String(d?.district ?? ''),
    capacityKw: Number(d?.capacityKw),
    ula: String(d?.ula ?? ''),
  };
  try {
    const user = await sessionUser();
    if (!user) return notSignedIn();
    if (user.role !== 'Installer') return notAllowed('Only installers start surveys this way');
    // Switched off (INSTALLER_NEW_SURVEY=false): only the office gives out homes
    if (!installerNewSurvey()) return NextResponse.json({ problem: 'New survey is switched off. The office will give you homes to survey.' });
    return NextResponse.json(await takeHomeForSurvey(user, body.consumerNumber, details));
  } catch (e) {
    console.error('POST /api/surveys/start failed', e);
    return NextResponse.json({ error: 'Could not start the survey' }, { status: 500 });
  }
}
