import { NextResponse } from 'next/server';
import { readAll } from '@/lib/server/db';

export const dynamic = 'force-dynamic';

/** Everything the app shows, from the database */
export async function GET() {
  try {
    return NextResponse.json(await readAll(), { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('GET /api/data failed', e);
    return NextResponse.json({ error: 'Could not read from the database' }, { status: 500 });
  }
}
