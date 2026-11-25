import { NextResponse } from 'next/server';
import { backupConfigured, runBackup } from '@/lib/server/backup';
import { sameText } from '@/lib/server/pinHash';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Nightly backup, started by Vercel Cron (see vercel.json). Vercel sends CRON_SECRET as a bearer token;
 * anyone else is refused. Systems without backup settings (the demo) do nothing.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization') || '';
  if (!secret || !sameText(auth, `Bearer ${secret}`)) {
    return NextResponse.json({ error: 'Not allowed' }, { status: 401 });
  }
  if (!backupConfigured()) return NextResponse.json({ skipped: 'Backup is not set up on this system' });
  try {
    const result = await runBackup();
    console.log('Backup done', JSON.stringify(result));
    return NextResponse.json(result);
  } catch (e) {
    console.error('Backup failed', e);
    return NextResponse.json({ error: 'Backup failed' }, { status: 500 });
  }
}
