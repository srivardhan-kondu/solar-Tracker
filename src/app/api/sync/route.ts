import { NextResponse } from 'next/server';
import { applyChanges, parseChanges } from '@/lib/server/db';

export const dynamic = 'force-dynamic';

/** Save the records the app changed */
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
    await applyChanges(changes);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('POST /api/sync failed', e);
    return NextResponse.json({ error: 'Could not save to the database' }, { status: 500 });
  }
}
