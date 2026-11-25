// Put production back from the backup: copies every table from the backup database
// (last night's copy) into a target database, replacing what is there.
//
//   RESTORE_FROM_URL=<backup database url> RESTORE_TO_URL=<target database url> \
//     node scripts/restore-from-backup.mjs --yes-replace-everything
//
// Safest: restore into a NEW empty Neon branch or project first, check it, then point the app at it.
// Older days: each dated file in the backup storage (database/YYYY-MM-DD.json.gz) holds the same data;
// pass FROM_FILE=<path to downloaded .json.gz> instead of RESTORE_FROM_URL.
import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { gunzipSync } from 'zlib';

const TABLES = [
  'users', 'consumers', 'inventory', 'installations', 'dcr_records', 'service_tickets',
  'exceptions', 'audit_logs', 'surveys', 'villages', 'photo_records', 'user_pins', 'app_meta',
];
const BATCH = 500;

if (!process.argv.includes('--yes-replace-everything')) {
  console.error('This replaces ALL data in RESTORE_TO_URL. Re-run with --yes-replace-everything to go ahead.');
  process.exit(1);
}
const to = process.env.RESTORE_TO_URL;
if (!to || (!process.env.RESTORE_FROM_URL && !process.env.FROM_FILE)) {
  console.error('Set RESTORE_TO_URL, and RESTORE_FROM_URL or FROM_FILE.');
  process.exit(1);
}

let data;
if (process.env.FROM_FILE) {
  data = JSON.parse(gunzipSync(readFileSync(process.env.FROM_FILE)).toString('utf8')).data;
} else {
  const from = neon(process.env.RESTORE_FROM_URL);
  data = {};
  for (const t of TABLES) data[t] = await from.query(`select * from ${t}`);
}

const target = neon(to);
const missing = [];
for (const t of TABLES) {
  const [{ ok }] = await target.query(`select to_regclass($1) is not null as ok`, [t]);
  if (!ok) missing.push(t);
}
if (missing.length) {
  console.error(`The target has no tables yet (${missing.join(', ')}). Open the app once against it so it creates them, then run this again.`);
  process.exit(1);
}

const queries = [target.query(`truncate ${TABLES.join(', ')}`)];
for (const t of TABLES) {
  const rows = data[t] ?? [];
  for (let i = 0; i < rows.length; i += BATCH) {
    queries.push(target.query(`insert into ${t} select * from jsonb_populate_recordset(null::${t}, $1::jsonb)`, [JSON.stringify(rows.slice(i, i + BATCH))]));
  }
}
await target.transaction(queries);
for (const t of TABLES) console.log(`${t.padEnd(16)} ${(data[t] ?? []).length} rows restored`);
console.log('Done. Photos: copy the backup storage "photos/" folder back into the photo bucket if any were lost.');
