import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** The server's clock, so a wrong phone clock cannot change the time printed on photos */
export async function GET() {
  return NextResponse.json({ now: Date.now() }, { headers: { 'Cache-Control': 'no-store' } });
}
