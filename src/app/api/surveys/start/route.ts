import { NextResponse } from 'next/server';
import { notAllowed, notSignedIn, sessionUser } from '@/lib/server/session';
import { NewHomeDetails, takeHomeForSurvey } from '@/lib/server/scope';

export const dynamic = 'force-dynamic';

/**
 * An installer starts a survey on their own, on a home the office has not given them.
 * Body: { consumerNumber, details?: { name, mobile, villageId } } (details only for a home not in the list).
 * Returns { consumer, added, alreadyYours }, { notFound: true } or { problem, field? }.
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
  const details: NewHomeDetails | undefined = d
    ? { name: String(d.name ?? ''), mobile: String(d.mobile ?? ''), villageId: String(d.villageId ?? '') }
    : undefined;
  try {
    const user = await sessionUser();
    if (!user) return notSignedIn();
    if (user.role !== 'Installer') return notAllowed('Only installers start surveys this way');
    return NextResponse.json(await takeHomeForSurvey(user, body.consumerNumber, details));
  } catch (e) {
    console.error('POST /api/surveys/start failed', e);
    return NextResponse.json({ error: 'Could not start the survey' }, { status: 500 });
  }
}
