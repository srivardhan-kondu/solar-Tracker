import 'server-only';
import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { ensureDb, sql } from './db';
import { getPhotoBytes, putPhoto } from './storage';
import { LATE_UPLOAD_MS, MAX_PHOTO_ACCURACY_M } from '@/lib/photoRules';

/**
 * Every photo the server receives gets a record that is locked with a secret signature:
 * the photo's fingerprint (SHA-256), where and when it was taken, and when it arrived.
 * Later, the stored photo and its record can be checked against each other.
 */

const SECRET = process.env.PHOTO_SIGNING_SECRET || '';


interface PhotoRecord {
  storage_key: string;
  sha256: string;
  folder: string;
  group_ref: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  taken_at_ms: number;
  received_at_ms: number;
  clock_checked: boolean;
}

export interface PhotoGeoInput {
  latitude: number;
  longitude: number;
  accuracy: number;
  takenAt: number; // epoch ms, by the server-checked clock when possible
  clockChecked: boolean;
}

const fingerprint = (b: Buffer | Uint8Array) => createHash('sha256').update(b).digest('hex');

const canonical = (r: PhotoRecord) =>
  [
    r.storage_key,
    r.sha256,
    r.folder,
    r.group_ref,
    r.latitude.toFixed(7),
    r.longitude.toFixed(7),
    r.accuracy.toFixed(2),
    r.taken_at_ms,
    r.received_at_ms,
    r.clock_checked ? 1 : 0,
  ].join('|');

const sign = (r: PhotoRecord) => createHmac('sha256', SECRET).update(canonical(r)).digest('hex');

const sameSig = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** Check the location and time the phone sent. Returns a reason it is refused, or null. */
export const geoProblem = (g: unknown, now = Date.now()): string | null => {
  const x = g as Partial<PhotoGeoInput> | null;
  if (!x || typeof x !== 'object') return 'Photo has no location';
  const { latitude, longitude, accuracy, takenAt, clockChecked } = x;
  if (![latitude, longitude, accuracy, takenAt].every((n) => typeof n === 'number' && Number.isFinite(n))) return 'Photo has no location';
  if (typeof clockChecked !== 'boolean') return 'Photo has no location';
  if (Math.abs(latitude!) > 90 || Math.abs(longitude!) > 180) return 'Location is not valid';
  if (accuracy! <= 0 || accuracy! > MAX_PHOTO_ACCURACY_M) return `Location must be accurate to ${MAX_PHOTO_ACCURACY_M} m`;
  if (takenAt! > now + 2 * 60 * 1000) return 'Photo time is in the future';
  if (takenAt! < now - 60 * 24 * 60 * 60 * 1000) return 'Photo is too old';
  return null;
};

/** Store a photo and its signed record. Returns the storage key. */
export const storeSignedPhoto = async (folder: string, group: string, bytes: Buffer, geo: PhotoGeoInput) => {
  if (!SECRET) throw new Error('PHOTO_SIGNING_SECRET is not set');
  await ensureDb();
  const key = await putPhoto(folder, group, 'image/jpeg', bytes);
  const rec: PhotoRecord = {
    storage_key: key,
    sha256: fingerprint(bytes),
    folder,
    group_ref: key.split('/')[1],
    latitude: geo.latitude,
    longitude: geo.longitude,
    accuracy: geo.accuracy,
    taken_at_ms: Math.round(geo.takenAt),
    received_at_ms: Date.now(),
    clock_checked: geo.clockChecked,
  };
  await sql.query(
    `insert into photo_records (storage_key, sha256, folder, group_ref, latitude, longitude, accuracy, taken_at_ms, received_at_ms, clock_checked, signature)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [rec.storage_key, rec.sha256, rec.folder, rec.group_ref, rec.latitude, rec.longitude, rec.accuracy, rec.taken_at_ms, rec.received_at_ms, rec.clock_checked, sign(rec)]
  );
  return key;
};

export type VerifyResult =
  | { status: 'unknown' }
  | {
      status: 'verified' | 'changed';
      latitude: number;
      longitude: number;
      accuracy: number;
      takenAt: number;
      receivedAt: number;
      clockChecked: boolean;
      /** Things the office should look at even when the photo is unchanged */
      flags: ('late_upload' | 'clock_not_checked' | 'used_elsewhere')[];
    };

/** Check a stored photo against its signed record */
export const verifyPhoto = async (key: string): Promise<VerifyResult> => {
  await ensureDb();
  const rows = (await sql.query(`select * from photo_records where storage_key = $1`, [key])) as (PhotoRecord & { signature: string })[];
  if (!rows.length) return { status: 'unknown' };
  const r = rows[0];
  const rec: PhotoRecord = {
    ...r,
    latitude: Number(r.latitude),
    longitude: Number(r.longitude),
    accuracy: Number(r.accuracy),
    taken_at_ms: Number(r.taken_at_ms),
    received_at_ms: Number(r.received_at_ms),
  };
  const recordIntact = !!SECRET && sameSig(sign(rec), r.signature);
  let imageIntact = false;
  try {
    imageIntact = fingerprint(await getPhotoBytes(key)) === rec.sha256;
  } catch {
    imageIntact = false;
  }
  const elsewhere = (await sql.query(`select 1 from photo_records where sha256 = $1 and group_ref <> $2 limit 1`, [
    rec.sha256,
    rec.group_ref,
  ])) as unknown[];
  const flags: ('late_upload' | 'clock_not_checked' | 'used_elsewhere')[] = [];
  if (rec.received_at_ms - rec.taken_at_ms > LATE_UPLOAD_MS) flags.push('late_upload');
  if (!rec.clock_checked) flags.push('clock_not_checked');
  if (elsewhere.length) flags.push('used_elsewhere');
  return {
    status: recordIntact && imageIntact ? 'verified' : 'changed',
    latitude: rec.latitude,
    longitude: rec.longitude,
    accuracy: rec.accuracy,
    takenAt: rec.taken_at_ms,
    receivedAt: rec.received_at_ms,
    clockChecked: rec.clock_checked,
    flags,
  };
};
