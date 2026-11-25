// Shows how many rows each table has, and the photos in storage.
// Run with: npm run db:check   (reads the settings in .env.local)
import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

dotenv.config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL);
const tables = ['users', 'consumers', 'inventory', 'installations', 'dcr_records', 'service_tickets', 'exceptions', 'audit_logs', 'surveys', 'villages'];
const existing = new Set((await sql`select table_name from information_schema.tables where table_schema = 'public'`).map((r) => r.table_name));
for (const t of tables) {
  if (!existing.has(t)) { console.log(`${t.padEnd(16)} (not created yet - open the app once)`); continue; }
  const [{ n }] = await sql.query(`select count(*)::int as n from ${t}`);
  console.log(`${t.padEnd(16)} ${n}`);
}
const s3 = new S3Client({ endpoint: process.env.AWS_ENDPOINT_URL_S3, region: process.env.AWS_REGION, forcePathStyle: true });
const objs = await s3.send(new ListObjectsV2Command({ Bucket: process.env.S3_BUCKET || 'images' }));
console.log(`photos in storage: ${objs.KeyCount ?? 0}`);
for (const o of (objs.Contents ?? []).slice(0, 10)) console.log(`  ${o.Key}  ${o.Size} bytes`);
