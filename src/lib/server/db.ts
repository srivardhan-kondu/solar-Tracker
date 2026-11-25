import 'server-only';
import { neon, NeonQueryFunction } from '@neondatabase/serverless';
import {
  SEED_AUDIT_LOGS,
  SEED_CONSUMERS,
  SEED_DCR_RECORDS,
  SEED_EXCEPTIONS,
  SEED_INSTALLATIONS,
  SEED_INVENTORY,
  SEED_SERVICE_TICKETS,
  SEED_SURVEYS,
  SEED_USERS,
  SEED_VILLAGES,
} from '@/data/seedData';
import { AllData, chronological, DbRecord, TABLE_NAMES, TableChanges, TableName, TABLES } from '@/lib/tables';
import { IS_DEMO } from '@/lib/mode';
import { hashPinForSetup } from './pinHash';

/**
 * Connect only when a request needs the database, not while the app is being built.
 * (Hosting services build the app before their settings are available to it.)
 */
let client: NeonQueryFunction<false, false> | null = null;
const connect = () => {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set. Add it to the server settings (or .env.local).');
    client = neon(url);
  }
  return client;
};
export const sql = new Proxy({} as NeonQueryFunction<false, false>, {
  get: (_target, prop) => {
    const c = connect();
    const value = Reflect.get(c, prop);
    return typeof value === 'function' ? value.bind(c) : value;
  },
});

/**
 * Every table keeps the full record in `data`, plus a few readable columns
 * (filled from the record) so the data is easy to search and report on in Neon.
 * Column expressions read from `r`, the record as jsonb. They are fixed here, never user input.
 */
const COLUMNS: Record<TableName, [name: string, type: string, expr: string][]> = {
  users: [
    ['name', 'text', "r->>'name'"],
    ['username', 'text', "r->>'username'"],
    ['role', 'text', "r->>'role'"],
    ['division', 'text', "r->>'division'"],
    ['status', 'text', "r->>'status'"],
  ],
  consumers: [
    ['consumer_number', 'text', "r->>'consumerNumber'"],
    ['name', 'text', "r->>'name'"],
    ['mobile', 'text', "r->>'mobile'"],
    ['village', 'text', "r->>'village'"],
    ['mandal', 'text', "r->>'mandal'"],
    ['district', 'text', "r->>'district'"],
    ['division', 'text', "r->>'division'"],
    ['ula', 'text', "r->>'ula'"],
    ['status', 'text', "r->>'status'"],
    ['assigned_installer_id', 'text', "r->>'assignedInstallerId'"],
    ['capacity_kw', 'numeric', "(r->>'capacityKw')::numeric"],
  ],
  inventory: [
    ['serial_number', 'text', "r->>'serialNumber'"],
    ['type', 'text', "r->>'type'"],
    ['brand', 'text', "r->>'brand'"],
    ['model', 'text', "r->>'model'"],
    ['status', 'text', "r->>'status'"],
    ['linked_consumer_number', 'text', "r->>'linkedConsumerNumber'"],
  ],
  installations: [
    ['consumer_number', 'text', "r->>'consumerNumber'"],
    ['installer_id', 'text', "r->>'installerId'"],
    ['installer_name', 'text', "r->>'installerName'"],
    ['status', 'text', "r->>'status'"],
    ['office_approval_status', 'text', "r->>'officeApprovalStatus'"],
    ['inverter_serial', 'text', "r->>'inverterSerial'"],
  ],
  dcr_records: [
    ['ula', 'text', "r->>'ula'"],
    ['dcr_number', 'text', "r->>'dcrNumber'"],
    ['consumer_number', 'text', "r->>'consumerNumber'"],
    ['status', 'text', "r->>'status'"],
  ],
  service_tickets: [
    ['ticket_number', 'text', "r->>'ticketNumber'"],
    ['consumer_number', 'text', "r->>'consumerNumber'"],
    ['issue_category', 'text', "r->>'issueCategory'"],
    ['priority', 'text', "r->>'priority'"],
    ['status', 'text', "r->>'status'"],
    ['assigned_engineer_id', 'text', "r->>'assignedEngineerId'"],
  ],
  exceptions: [
    ['type', 'text', "r->>'type'"],
    ['consumer_number', 'text', "r->>'consumerNumber'"],
    ['priority', 'text', "r->>'priority'"],
    ['status', 'text', "r->>'status'"],
    ['title', 'text', "r->>'title'"],
  ],
  audit_logs: [
    ['action', 'text', "r->>'action'"],
    ['record_type', 'text', "r->>'recordType'"],
    ['record_id', 'text', "r->>'recordId'"],
    ['actor_name', 'text', "r->>'actorName'"],
    ['logged_at', 'text', "r->>'timestamp'"],
  ],
  surveys: [
    ['consumer_number', 'text', "r->>'consumerNumber'"],
    ['surveyor_id', 'text', "r->>'surveyorId'"],
    ['status', 'text', "r->>'status'"],
    ['decision', 'text', "r->>'decision'"],
    ['roof_type', 'text', "r->>'roofType'"],
    ['shade_level', 'text', "r->>'shadeLevel'"],
  ],
  villages: [
    ['name', 'text', "r->>'name'"],
    ['mandal', 'text', "r->>'mandal'"],
    ['district', 'text', "r->>'district'"],
    ['latitude', 'double precision', "(r->>'latitude')::double precision"],
    ['longitude', 'double precision', "(r->>'longitude')::double precision"],
    ['radius_m', 'double precision', "(r->>'radiusM')::double precision"],
  ],
};

const INDEXED = ['consumer_number', 'status', 'record_id', 'serial_number'];

const schemaStatements = (): string[] => {
  const out = [
    'create sequence if not exists row_seq',
    'create table if not exists app_meta (key text primary key, value text not null, updated_at timestamptz not null default now())',
  ];
  for (const t of TABLE_NAMES) {
    const cols = COLUMNS[t].map(([n, type]) => `${n} ${type}`).join(', ');
    out.push(
      `create table if not exists ${t} (id text primary key, ${cols}, data jsonb not null, ` +
        `seq bigint not null default nextval('row_seq'), created_at timestamptz not null default now(), ` +
        `updated_at timestamptz not null default now())`
    );
    for (const [n] of COLUMNS[t]) if (INDEXED.includes(n)) out.push(`create index if not exists ${t}_${n}_idx on ${t} (${n})`);
  }
  out.push(...PHOTO_SCHEMA);
  // Sign-in PINs (hashed). Kept out of the app's tables so they are never sent to any phone.
  out.push('create table if not exists user_pins (user_id text primary key, pin_hash text not null, updated_at timestamptz not null default now())');
  // No two people may share a username, even if two offices add someone at the same moment
  out.push('create unique index if not exists users_username_unique on users (lower(username))');
  // Wrong-PIN counts, so a PIN cannot be guessed by trying every number
  out.push('create table if not exists login_attempts (username text primary key, failures int not null default 0, locked_until timestamptz, updated_at timestamptz not null default now())');
  return out;
};

/** Signed record of every photo received: see photos.ts */
const PHOTO_SCHEMA = [
  `create table if not exists photo_records (
    storage_key text primary key,
    sha256 text not null,
    folder text not null,
    group_ref text not null,
    latitude double precision not null,
    longitude double precision not null,
    accuracy double precision not null,
    taken_at_ms bigint not null,
    received_at_ms bigint not null,
    clock_checked boolean not null,
    signature text not null
  )`,
  'create index if not exists photo_records_sha256_idx on photo_records (sha256)',
  'create index if not exists photo_records_group_idx on photo_records (group_ref)',
];

/** Insert or update many records with one statement. Rows must be oldest first. */
const upsertQuery = (t: TableName, rows: DbRecord[]) => {
  const cols = COLUMNS[t];
  const names = ['id', ...cols.map(([n]) => n), 'data'].join(', ');
  const exprs = ["r->>'id'", ...cols.map(([, , e]) => e), 'r'].join(', ');
  const updates = [...cols.map(([n]) => `${n} = excluded.${n}`), 'data = excluded.data', 'updated_at = now()'].join(', ');
  return sql.query(
    `insert into ${t} (${names}) select ${exprs} from jsonb_array_elements($1::jsonb) with ordinality as e(r, i) ` +
      `order by i on conflict (id) do update set ${updates}`,
    [JSON.stringify(rows)]
  );
};

const SEED: Record<TableName, DbRecord[]> = {
  users: SEED_USERS as unknown as DbRecord[],
  consumers: SEED_CONSUMERS as unknown as DbRecord[],
  inventory: SEED_INVENTORY as unknown as DbRecord[],
  installations: SEED_INSTALLATIONS as unknown as DbRecord[],
  dcr_records: SEED_DCR_RECORDS as unknown as DbRecord[],
  service_tickets: SEED_SERVICE_TICKETS as unknown as DbRecord[],
  exceptions: SEED_EXCEPTIONS as unknown as DbRecord[],
  audit_logs: SEED_AUDIT_LOGS as unknown as DbRecord[],
  surveys: SEED_SURVEYS as unknown as DbRecord[],
  villages: SEED_VILLAGES as unknown as DbRecord[],
};

const seedQueries = () => TABLE_NAMES.map((t) => upsertQuery(t, chronological(t, SEED[t])));

let ready: Promise<void> | null = null;

/** Every statement that creates the tables, for this database or a backup copy */
export const SCHEMA_STATEMENTS = schemaStatements;

/**
 * Production starts with one head-office account so someone can sign in and add everyone else.
 * Its PIN comes from BOOTSTRAP_ADMIN_PIN, used once; the setting can be removed afterwards.
 */
const firstAdminQueries = async () => {
  const pin = process.env.BOOTSTRAP_ADMIN_PIN;
  if (!pin || !/^\d{4,8}$/.test(pin)) throw new Error('BOOTSTRAP_ADMIN_PIN (4 to 8 digits) is needed to create the first account');
  const admin = {
    id: 'usr_admin',
    name: 'Head Office',
    username: 'admin',
    mobile: '',
    role: 'Super Admin',
    division: 'All Divisions',
    district: 'Head Office',
    status: 'Active',
    lastLogin: '',
  };
  return [
    upsertQuery('users', [admin]),
    sql.query(`insert into user_pins (user_id, pin_hash) values ($1, $2) on conflict (user_id) do nothing`, ['usr_admin', await hashPinForSetup(pin)]),
  ];
};

/** Create the tables, and the first time: sample data (demo) or the first account (production). Safe to call on every request. */
export const ensureDb = () => {
  if (!ready) {
    ready = (async () => {
      for (const stmt of schemaStatements()) await sql.query(stmt);
      const seeded = await sql.query(`select 1 from app_meta where key = 'seeded'`);
      if (seeded.length === 0) {
        await sql.transaction([
          ...(IS_DEMO ? seedQueries() : await firstAdminQueries()),
          sql.query(`insert into app_meta (key, value) values ('seeded', $1) on conflict (key) do nothing`, [
            `${IS_DEMO ? 'demo data' : 'first account'} at ${new Date().toISOString()}`,
          ]),
        ]);
      }
    })().catch((e) => {
      ready = null; // try again on the next request
      throw e;
    });
  }
  return ready;
};

export const readAll = async (): Promise<AllData> => {
  await ensureDb();
  const results = await sql.transaction(
    TABLE_NAMES.map((t) => sql.query(`select data from ${t} order by seq ${TABLES[t].newestFirst ? 'desc' : 'asc'}`)),
    { readOnly: true }
  );
  const out = {} as AllData;
  TABLE_NAMES.forEach((t, i) => {
    out[TABLES[t].collection] = (results[i] as { data: DbRecord }[]).map((r) => r.data);
  });
  return out;
};

/** Apply changes from the app in one transaction: deletes first, then inserts/updates. */
export const applyChanges = async (changes: TableChanges[]) => {
  await ensureDb();
  const queries = [];
  for (const c of changes) {
    if (c.deletes.length) queries.push(sql.query(`delete from ${c.table} where id = any($1::text[])`, [c.deletes]));
    if (c.upserts.length) queries.push(upsertQuery(c.table, c.upserts));
  }
  if (queries.length) await sql.transaction(queries);
};

/** Add a person and their sign-in PIN together (both or neither) */
export const createUserWithPin = async (user: DbRecord, pinHash: string) => {
  await ensureDb();
  await sql.transaction([
    upsertQuery('users', [user]),
    sql.query(`insert into user_pins (user_id, pin_hash) values ($1, $2) on conflict (user_id) do update set pin_hash = excluded.pin_hash, updated_at = now()`, [user.id, pinHash]),
  ]);
};

/** Wipe everything and put the sample data back. Demo only: never on the production system. */
export const resetToSeed = async () => {
  if (!IS_DEMO) throw new Error('Reset is only possible on the demo');
  await ensureDb();
  await sql.transaction([sql.query(`truncate ${TABLE_NAMES.join(', ')}`), ...seedQueries()]);
};

/** Check what the app sent before it touches the database */
export const parseChanges = (body: unknown): TableChanges[] | null => {
  const list = (body as { changes?: unknown })?.changes;
  if (!Array.isArray(list)) return null;
  const out: TableChanges[] = [];
  for (const c of list) {
    if (!c || typeof c !== 'object') return null;
    const { table, upserts = [], deletes = [] } = c as Record<string, unknown>;
    if (typeof table !== 'string' || !(TABLE_NAMES as string[]).includes(table)) return null;
    if (!Array.isArray(upserts) || !Array.isArray(deletes)) return null;
    if (!upserts.every((r) => r && typeof r === 'object' && typeof (r as DbRecord).id === 'string' && (r as DbRecord).id)) return null;
    if (!deletes.every((d) => typeof d === 'string')) return null;
    out.push({ table: table as TableName, upserts: upserts as DbRecord[], deletes: deletes as string[] });
  }
  return out;
};
