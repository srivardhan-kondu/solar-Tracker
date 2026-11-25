import 'server-only';
import { ensureDb, readAll, applyChanges, sql } from './db';
import { AllData, DbRecord, TableChanges, TableName } from '@/lib/tables';
import { Consumer, Installation, SiteSurvey, User, Village } from '@/types';
import { checkVillages, formatDistance } from '@/lib/fence';
import { villageLabel, villagesOf } from '@/lib/workArea';
import { isOfficeRole } from '@/lib/access';

/**
 * What each person may see and change. The phone applies the same rules on screen;
 * these are the ones that count, because they run on the server.
 *
 * Installers: only the homes assigned to them, and every photo must be taken
 * inside one of the villages the office approved for them.
 */

export interface Refusal {
  table: TableName;
  id: string;
  reason: string;
}

const consumerNumberOf = (r: DbRecord) => (typeof r.consumerNumber === 'string' ? r.consumerNumber : undefined);

/** The data this person is sent */
export const readFor = async (user: User): Promise<AllData> => {
  const all = await readAll();
  if (user.role !== 'Installer') return all;

  const consumers = all.consumers.filter((c) => c.assignedInstallerId === user.id);
  const mine = new Set(consumers.map((c) => consumerNumberOf(c)));
  const forMine = (rows: DbRecord[]) => rows.filter((r) => mine.has(consumerNumberOf(r)));
  return {
    ...all,
    users: all.users.filter((u) => u.id === user.id),
    consumers,
    installations: forMine(all.installations),
    surveys: forMine(all.surveys),
    exceptions: forMine(all.exceptions),
    // Only their own villages, so the phone can check where it is
    villages: all.villages.filter((v) => user.villageIds?.includes(v.id)),
    auditLogs: [],
    dcrRecords: [],
    serviceTickets: [],
  };
};

const existing = async (t: TableName, ids: string[]) => {
  if (!ids.length) return new Map<string, DbRecord>();
  const rows = (await sql.query(`select data from ${t} where id = any($1::text[])`, [ids])) as { data: DbRecord }[];
  return new Map(rows.map((r) => [r.data.id, r.data]));
};

const allVillages = async () => ((await sql.query(`select data from villages`)) as { data: Village }[]).map((r) => r.data);

type Fix = { latitude: number; longitude: number; accuracy: number };

/** Were these photos taken inside one of this installer's villages? Returns why not, or null. */
const outsideVillagesProblem = (user: User, villages: Village[], fixes: Fix[]): string | null => {
  if (!fixes.length) return null;
  const mine = villagesOf(user, villages);
  if (!mine.length) return 'The office has not given you any villages yet';
  for (const fix of fixes) {
    const r = checkVillages(fix, mine);
    if (!r.inside) {
      return r.nearest
        ? `Photo taken ${formatDistance(r.nearest.metres)} outside ${villageLabel(r.nearest.village)}, the nearest of your villages`
        : 'Photo taken outside your villages';
    }
  }
  return null;
};

type PhotoLike = { geo?: Fix };

const photosOf = (t: TableName, r: DbRecord): PhotoLike[] => {
  if (t === 'surveys') {
    const s = r as unknown as SiteSurvey;
    return [s.billPhoto, s.aadhaarPhoto, ...(s.roofPhotos ?? []), ...(s.surroundingsPhotos ?? [])].filter(Boolean) as PhotoLike[];
  }
  if (t === 'installations') return Object.values((r as unknown as Installation).photos ?? {}).filter(Boolean) as PhotoLike[];
  return [];
};

const SAME_FIELDS: Record<string, string[]> = {
  // An installer may correct a mobile number or move a home's status, but not reassign it
  consumers: ['consumerNumber', 'assignedInstallerId'],
  inventory: ['serialNumber', 'type'],
};

const changedField = (t: string, before: DbRecord, after: DbRecord) =>
  (SAME_FIELDS[t] ?? []).find((f) => JSON.stringify(before[f]) !== JSON.stringify(after[f]));

/** Check one installer's changes record by record. Returns the changes allowed and the ones refused. */
const checkInstaller = async (user: User, changes: TableChanges[]) => {
  const rows = (await sql.query(`select data from consumers where assigned_installer_id = $1`, [user.id])) as { data: Consumer }[];
  const mine = new Set(rows.map((r) => r.data.consumerNumber));
  const villages = await allVillages();
  const allowed: TableChanges[] = [];
  const refused: Refusal[] = [];
  const NOT_YOURS = 'This home is not assigned to you';

  // Survey comes first: homes whose survey was sent as Feasible (here, or earlier in this same send)
  const feasibleRows = (await sql.query(
    `select consumer_number from surveys where status = 'Submitted' and decision = 'Feasible' and consumer_number = any($1::text[])`,
    [Array.from(mine)]
  )) as { consumer_number: string }[];
  const feasible = new Set(feasibleRows.map((r) => r.consumer_number));
  const isFeasibleSurvey = (r: DbRecord) => r.status === 'Submitted' && r.decision === 'Feasible';
  // Check surveys before installations, so a survey and its installation can arrive together
  const ordered = [...changes].sort((a, b) => Number(b.table === 'surveys') - Number(a.table === 'surveys'));

  for (const c of ordered) {
    const ok: DbRecord[] = [];
    const before = await existing(c.table, c.upserts.map((r) => r.id));
    for (const id of c.deletes) refused.push({ table: c.table, id, reason: 'Field staff cannot delete records' });

    for (const r of c.upserts) {
      const old = before.get(r.id);
      const refuse = (reason: string) => refused.push({ table: c.table, id: r.id, reason });
      switch (c.table) {
        case 'consumers': {
          if (!old) { refuse('Field staff cannot add consumers'); continue; }
          if (!mine.has(String(old.consumerNumber))) { refuse(NOT_YOURS); continue; }
          const f = changedField('consumers', old, r);
          if (f) { refuse(`Field staff cannot change ${f}`); continue; }
          break;
        }
        case 'surveys':
        case 'installations': {
          const n = consumerNumberOf(r);
          if (!n || !mine.has(n)) { refuse(NOT_YOURS); continue; }
          if (old && consumerNumberOf(old) !== n) { refuse('Record belongs to another home'); continue; }
          // A new installation needs a Feasible survey; ones already accepted may still be updated
          if (c.table === 'installations' && !old && !feasible.has(n)) {
            refuse('Do the site survey first. Only homes marked Feasible can be installed');
            continue;
          }
          const fixes = photosOf(c.table, r).flatMap((p) => (p.geo ? [p.geo] : []));
          const problem = outsideVillagesProblem(user, villages, fixes);
          if (problem) { refuse(problem); continue; }
          if (c.table === 'surveys' && isFeasibleSurvey(r)) feasible.add(n);
          break;
        }
        case 'inventory': {
          if (!old) { refuse('Field staff cannot add stock'); continue; }
          const f = changedField('inventory', old, r);
          if (f) { refuse(`Field staff cannot change ${f}`); continue; }
          const linked = typeof r.linkedConsumerNumber === 'string' ? r.linkedConsumerNumber : undefined;
          if (linked && linked !== old.linkedConsumerNumber && !mine.has(linked)) { refuse(NOT_YOURS); continue; }
          break;
        }
        case 'exceptions': {
          const n = consumerNumberOf(r);
          if (old && !mine.has(consumerNumberOf(old) ?? '')) { refuse('Not yours to change'); continue; }
          if (n && !mine.has(n)) { refuse(NOT_YOURS); continue; }
          break;
        }
        case 'audit_logs': {
          if (old) { refuse('History cannot be changed'); continue; }
          break;
        }
        default:
          refuse('Field staff cannot change this');
          continue;
      }
      ok.push(r);
    }
    if (ok.length) allowed.push({ table: c.table, upserts: ok, deletes: [] });
  }
  return { allowed, refused };
};

const FIELD_TABLES: Partial<Record<User['role'], TableName[]>> = {
  'Service Engineer': ['service_tickets', 'exceptions', 'audit_logs'],
};

/** Save changes as this person. Records they may not change are left out and reported back. */
export const applyChangesAs = async (user: User, changes: TableChanges[]): Promise<Refusal[]> => {
  await ensureDb();
  let allowed: TableChanges[] = changes;
  let refused: Refusal[] = [];

  if (user.role === 'Installer') {
    ({ allowed, refused } = await checkInstaller(user, changes));
  } else if (!isOfficeRole(user.role)) {
    const tables = FIELD_TABLES[user.role] ?? [];
    allowed = [];
    for (const c of changes) {
      if (tables.includes(c.table)) {
        allowed.push({ ...c, deletes: [] });
        c.deletes.forEach((id) => refused.push({ table: c.table, id, reason: 'Field staff cannot delete records' }));
      } else {
        [...c.upserts.map((r) => r.id), ...c.deletes].forEach((id) =>
          refused.push({ table: c.table, id, reason: 'Not allowed for your role' })
        );
      }
    }
  } else if (user.role === 'Admin') {
    // Office staff may approve villages for installers and engineers, but not change head-office accounts or roles
    allowed = [];
    for (const c of changes) {
      if (c.table !== 'users') {
        allowed.push(c);
        continue;
      }
      const before = await existing('users', c.upserts.map((r) => r.id));
      const ok = c.upserts.filter((r) => {
        const old = before.get(r.id);
        const fine = !!old && (old.role === 'Installer' || old.role === 'Service Engineer') && old.role === r.role;
        if (!fine) refused.push({ table: 'users', id: r.id, reason: 'Only head office can change this person' });
        return fine;
      });
      c.deletes.forEach((id) => refused.push({ table: 'users', id, reason: 'Only head office can remove people' }));
      if (ok.length) allowed.push({ table: 'users', upserts: ok, deletes: [] });
    }
  }

  // No two people may share a username (it is how they sign in)
  const userChanges = allowed.find((c) => c.table === 'users');
  if (userChanges?.upserts.length) {
    const rows = (await sql.query(`select id, lower(username) as u from users`)) as { id: string; u: string }[];
    const taken = new Map(rows.map((r) => [r.u, r.id]));
    userChanges.upserts = userChanges.upserts.filter((r) => {
      const u = typeof r.username === 'string' ? r.username.trim().toLowerCase() : '';
      const other = taken.get(u);
      const bad = !u || (other !== undefined && other !== r.id);
      if (bad) refused.push({ table: 'users', id: r.id, reason: `Username ${u || '(empty)'} is already taken` });
      else taken.set(u, r.id);
      return !bad;
    });
  }

  await applyChanges(allowed);
  return refused;
};

/** May this person upload this photo for this home? Returns why not, or null. */
export const photoUploadProblem = async (user: User, folder: string, consumerNumber: string, fix: Fix): Promise<string | null> => {
  if (user.role !== 'Installer' || (folder !== 'surveys' && folder !== 'installations')) return null;
  const rows = (await sql.query(`select data from consumers where consumer_number = $1`, [consumerNumber])) as { data: Consumer }[];
  if (rows[0]?.data.assignedInstallerId !== user.id) return 'This home is not assigned to you';
  return outsideVillagesProblem(user, await allVillages(), [fix]);
};
