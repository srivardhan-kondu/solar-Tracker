import 'server-only';
import { gzipSync } from 'zlib';
import { neon } from '@neondatabase/serverless';
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { ensureDb, SCHEMA_STATEMENTS, sql } from './db';
import { BUCKET, s3 } from './storage';
import { TABLE_NAMES } from '@/lib/tables';

/**
 * Nightly backup of the production system, to a separate Neon project (its own database and storage):
 *
 * 1. The backup database becomes an exact copy of every table (replaced each night).
 * 2. A dated file of every record (database/YYYY-MM-DD.json.gz) is kept for KEEP_DAYS days.
 * 3. Photos not yet copied are copied to the backup storage (photos/<same key>).
 *
 * Settings: BACKUP_DATABASE_URL, BACKUP_S3_ENDPOINT, BACKUP_S3_REGION, BACKUP_S3_BUCKET,
 * BACKUP_S3_ACCESS_KEY_ID, BACKUP_S3_SECRET_ACCESS_KEY.
 */

const KEEP_DAYS = 35;
const INSERT_BATCH = 500;
// Stop copying photos after this long; the rest are copied the next night
const PHOTO_TIME_BUDGET_MS = 35_000;

/** Everything that is backed up: the app's tables plus sign-in PINs and the photo fingerprints */
export const BACKUP_TABLES = [...TABLE_NAMES, 'photo_records', 'user_pins', 'app_meta'] as const;

export const backupConfigured = () =>
  !!(
    process.env.BACKUP_DATABASE_URL &&
    process.env.BACKUP_S3_ENDPOINT &&
    process.env.BACKUP_S3_BUCKET &&
    process.env.BACKUP_S3_ACCESS_KEY_ID &&
    process.env.BACKUP_S3_SECRET_ACCESS_KEY
  );

const backupS3 = () =>
  new S3Client({
    endpoint: process.env.BACKUP_S3_ENDPOINT,
    region: process.env.BACKUP_S3_REGION || 'ap-southeast-1',
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.BACKUP_S3_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.BACKUP_S3_SECRET_ACCESS_KEY || '',
    },
  });

const listKeys = async (client: S3Client, bucket: string, prefix: string) => {
  const keys: { key: string; modified?: Date }[] = [];
  let token: string | undefined;
  do {
    const res = await client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: token }));
    for (const o of res.Contents ?? []) if (o.Key) keys.push({ key: o.Key, modified: o.LastModified });
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return keys;
};

export interface BackupResult {
  at: string;
  rows: Record<string, number>;
  file: string;
  photosCopied: number;
  photosWaiting: number;
  oldFilesRemoved: number;
}

export const runBackup = async (): Promise<BackupResult> => {
  if (!backupConfigured()) throw new Error('Backup settings are missing');
  await ensureDb();
  const started = Date.now();
  const at = new Date().toISOString();

  // 1. Read every table in one consistent snapshot
  const results = await sql.transaction(
    BACKUP_TABLES.map((t) => sql.query(`select * from ${t}`)),
    { readOnly: true, isolationLevel: 'RepeatableRead' }
  );
  const data: Record<string, Record<string, unknown>[]> = {};
  BACKUP_TABLES.forEach((t, i) => (data[t] = results[i] as Record<string, unknown>[]));
  const rows = Object.fromEntries(Object.entries(data).map(([t, r]) => [t, r.length]));

  // 2. Make the backup database an exact copy, in one transaction (all or nothing)
  const backupDb = neon(process.env.BACKUP_DATABASE_URL!);
  for (const stmt of SCHEMA_STATEMENTS()) await backupDb.query(stmt);
  const copy = [backupDb.query(`truncate ${BACKUP_TABLES.join(', ')}`)];
  for (const t of BACKUP_TABLES) {
    for (let i = 0; i < data[t].length; i += INSERT_BATCH) {
      copy.push(
        backupDb.query(`insert into ${t} select * from jsonb_populate_recordset(null::${t}, $1::jsonb)`, [
          JSON.stringify(data[t].slice(i, i + INSERT_BATCH)),
        ])
      );
    }
  }
  copy.push(backupDb.query(`select setval('row_seq', greatest((select coalesce(max(seq), 1) from (${TABLE_NAMES.map((t) => `select max(seq) as seq from ${t}`).join(' union all ')}) s), 1))`));
  await backupDb.transaction(copy);

  // 3. A dated file of everything, kept for KEEP_DAYS days
  const store = backupS3();
  const bucket = process.env.BACKUP_S3_BUCKET!;
  const file = `database/${at.slice(0, 10)}.json.gz`;
  await store.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: file,
      Body: gzipSync(JSON.stringify({ at, rows, data })),
      ContentType: 'application/gzip',
    })
  );
  const cutoff = Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000;
  const old = (await listKeys(store, bucket, 'database/')).filter((k) => k.modified && k.modified.getTime() < cutoff);
  if (old.length) {
    await store.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: old.map((k) => ({ Key: k.key })) } }));
  }

  // 4. Photos not yet in the backup
  const have = new Set((await listKeys(store, bucket, 'photos/')).map((k) => k.key.slice('photos/'.length)));
  const missing = (await listKeys(s3, BUCKET, '')).map((k) => k.key).filter((k) => !have.has(k));
  let photosCopied = 0;
  for (const key of missing) {
    if (Date.now() - started > PHOTO_TIME_BUDGET_MS) break;
    const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    if (!obj.Body) continue;
    await store.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: `photos/${key}`,
        Body: Buffer.from(await obj.Body.transformToByteArray()),
        ContentType: obj.ContentType,
      })
    );
    photosCopied++;
  }

  const result: BackupResult = {
    at,
    rows,
    file,
    photosCopied,
    photosWaiting: missing.length - photosCopied,
    oldFilesRemoved: old.length,
  };
  await sql.query(
    `insert into app_meta (key, value, updated_at) values ('last_backup', $1, now()) on conflict (key) do update set value = excluded.value, updated_at = now()`,
    [JSON.stringify(result)]
  );
  return result;
};
