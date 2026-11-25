import { NextResponse } from 'next/server';
import { FOLDERS, MAX_PHOTO_BYTES } from '@/lib/server/storage';
import { geoProblem, PhotoGeoInput, storeSignedPhoto } from '@/lib/server/photos';
import { notSignedIn, sessionUser } from '@/lib/server/session';
import { photoUploadProblem } from '@/lib/server/scope';

export const dynamic = 'force-dynamic';

/**
 * Store a photo from the in-app camera with its location.
 * Body: { dataUrl, folder, group, geo: { latitude, longitude, accuracy, takenAt, clockChecked } }
 * The server fingerprints the photo and keeps a signed record, so later changes can be detected.
 * Refused when the home is outside the installer's work area, or the photo was taken away from the home.
 * Returns the app link to show it: /api/files/<key>
 */
export async function POST(req: Request) {
  let body: { dataUrl?: unknown; folder?: unknown; group?: unknown; geo?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  const { dataUrl, folder, group, geo } = body;
  if (typeof dataUrl !== 'string' || typeof folder !== 'string' || !(FOLDERS as readonly string[]).includes(folder)) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  // The in-app camera always makes JPEG photos
  const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m) return NextResponse.json({ error: 'Only photos from the app camera' }, { status: 400 });
  const problem = geoProblem(geo);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  const bytes = Buffer.from(m[1], 'base64');
  // Must really be a JPEG (starts with FF D8 FF)
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
    return NextResponse.json({ error: 'Only photos from the app camera' }, { status: 400 });
  }
  if (bytes.length > MAX_PHOTO_BYTES) return NextResponse.json({ error: 'Photo is too large' }, { status: 413 });
  try {
    const user = await sessionUser();
    if (!user) return notSignedIn();
    const g = geo as PhotoGeoInput;
    const placeProblem = await photoUploadProblem(user, folder, typeof group === 'string' ? group : '', g);
    if (placeProblem) return NextResponse.json({ error: placeProblem }, { status: 400 });
    const key = await storeSignedPhoto(folder, typeof group === 'string' ? group : 'misc', bytes, geo as PhotoGeoInput);
    return NextResponse.json({ url: `/api/files/${key}` });
  } catch (e) {
    console.error('POST /api/uploads failed', e);
    return NextResponse.json({ error: 'Could not store the photo' }, { status: 500 });
  }
}
