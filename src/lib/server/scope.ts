import 'server-only';
import { ensureDb, readAll, applyChanges, sql, takeHome } from './db';
import { normalizeMobile } from '@/lib/mobile';
import { AllData, DbRecord, TableChanges, TableName } from '@/lib/tables';
import { Consumer, Installation, SiteSurvey, User, Village } from '@/types';
import { checkVillages, formatDistance } from '@/lib/fence';
import { villageLabel, villagesOf } from '@/lib/workArea';
import { isOfficeRole } from '@/lib/access';
import { surveyVillageCheck } from './settings';

/**
 * What each person may see and change. The phone applies the same rules on screen;
 * these are the ones that count, because they run on the server.
 *
 * Installers: only the homes assigned to them, and every photo must be taken
 * inside one of the villages the office approved for them. (Survey photos can be let off
 * the village check with SURVEY_VILLAGE_CHECK=false; see settings.ts. Installation photos never are.)
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
          const villageCheck = c.table === 'installations' || surveyVillageCheck();
          const problem = villageCheck ? outsideVillagesProblem(user, villages, fixes) : null;
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
  // The photo's own location is always checked (photos.ts); this is only "inside your villages"
  if (folder === 'surveys' && !surveyVillageCheck()) return null;
  return outsideVillagesProblem(user, await allVillages(), [fix]);
};

/* ---------- Installer starts a survey on their own ---------- */

/** Details an installer types for a home that is not in the office's list */
export interface NewHomeDetails {
  name: string;
  mobile: string;
  /** One of the installer's approved villages (when the village check is on) */
  villageId: string;
  /** Typed by the installer when the village check is on hold */
  village: string;
  mandal: string;
  district: string;
  /** Solar size applied for, in kW */
  capacityKw: number;
  /** Application (ULA) number, if the applicant has it */
  ula: string;
}

export type TakeHomeResult =
  | { consumer: Consumer; added: boolean; alreadyYours: boolean }
  | { problem: string; field?: keyof NewHomeDetails | 'consumerNumber' };

const TAKEN = 'This home is already given to another installer. Ask the office if it should be yours.';
const CLOSED_STATUSES = ['Completed', 'Received by Server', 'Saved Locally', 'Waiting to Sync', 'Needs Review'];

/** Consumer numbers are compared without spaces or letter case, so "ap-gnt 001" finds "AP-GNT-001" */
export const cleanConsumerNumber = (s: string) => s.trim().replace(/\s+/g, ' ').toUpperCase();
const sameKey = (s: string) => s.replace(/[\s-]/g, '').toUpperCase();

const findHome = async (consumerNumber: string) => {
  const rows = (await sql.query(
    `select data from consumers where upper(regexp_replace(consumer_number, '[\\s-]', '', 'g')) = $1 order by seq asc limit 1`,
    [sameKey(consumerNumber)]
  )) as { data: Consumer }[];
  return rows[0]?.data ?? null;
};

const istNow = () => new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
const istToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

const auditFor = (user: User, consumerNumber: string, details: string): DbRecord => ({
  id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  actorName: user.name,
  actorRole: user.role,
  action: 'SELF_ASSIGN_SURVEY',
  recordType: 'Assignment',
  recordId: consumerNumber,
  timestamp: istNow(),
  details,
});

/**
 * "New survey": an installer types a home's details and surveys it, without waiting for the office.
 * - Home not in the list: it is added with these details and given to them.
 * - Home in the list and given to nobody: it becomes theirs (the office's details are kept; blanks are filled in).
 * - Home already theirs: carry on.
 * - Home given to another installer: refused.
 */
export const takeHomeForSurvey = async (user: User, rawNumber: string, details: NewHomeDetails): Promise<TakeHomeResult> => {
  await ensureDb();
  const consumerNumber = cleanConsumerNumber(rawNumber);
  if (consumerNumber.length < 3 || consumerNumber.length > 40)
    return { problem: 'Please type the consumer number from the electricity bill.', field: 'consumerNumber' };
  const name = details.name.trim().replace(/\s+/g, ' ');
  if (name.length < 2 || name.length > 100) return { problem: 'Please type the name on the electricity bill.', field: 'name' };
  const mobile = normalizeMobile(details.mobile);
  if (!mobile) return { problem: 'Please enter a valid 10-digit mobile number (starting with 6, 7, 8 or 9).', field: 'mobile' };
  const capacityKw = Math.round(details.capacityKw * 100) / 100;
  if (!Number.isFinite(capacityKw) || capacityKw < 0.5 || capacityKw > 20)
    return { problem: 'Please type the solar size in kW (for example 3).', field: 'capacityKw' };
  const ula = details.ula.trim().slice(0, 60);

  // Where the home is. Normally one of the installer's approved villages (survey photos must be taken there).
  // With the village check on hold, the installer types the village, mandal and district.
  const text = (s: string) => s.trim().replace(/\s+/g, ' ').slice(0, 80);
  let place: { village: string; mandal: string; district: string; label: string };
  if (surveyVillageCheck()) {
    const mine = villagesOf(user, await allVillages());
    if (!mine.length) return { problem: 'The office has not given you any villages yet. Ask them to add your villages first.' };
    const v = mine.find((x) => x.id === details.villageId);
    if (!v) return { problem: 'Please choose one of your villages.', field: 'villageId' };
    place = { village: v.name, mandal: v.mandal ?? '', district: v.district ?? user.district ?? '', label: villageLabel(v) };
  } else {
    const [village, mandal, district] = [text(details.village), text(details.mandal), text(details.district)];
    if (village.length < 2) return { problem: 'Please type the village name.', field: 'village' };
    if (mandal.length < 2) return { problem: 'Please type the mandal.', field: 'mandal' };
    if (district.length < 2) return { problem: 'Please type the district.', field: 'district' };
    place = { village, mandal, district, label: `${village} (${mandal} mandal, ${district} district)` };
  }

  const home = await findHome(consumerNumber);
  if (home) {
    if (home.assignedInstallerId === user.id) return { consumer: home, added: false, alreadyYours: true };
    if (home.assignedInstallerId) return { problem: TAKEN };
    if (CLOSED_STATUSES.includes(home.status)) return { problem: 'This home has already been installed. Ask the office if it needs another visit.' };
    const patch = {
      assignedInstallerId: user.id,
      assignedInstallerName: user.name,
      assignedDate: istToday(),
      selfAssigned: true,
      // The office's details stay; the installer's fill only what the list left empty
      ...(home.name?.trim() ? {} : { name }),
      ...(home.mobile?.trim() ? {} : { mobile }),
      ...(home.village?.trim() ? {} : { village: place.village, mandal: place.mandal, district: place.district }),
      ...(home.capacityKw > 0 ? {} : { capacityKw }),
      ...(home.ula?.trim() || !ula ? {} : { ula }),
    };
    const saved = await takeHome(
      { claim: { id: home.id, patch, installerId: user.id } },
      auditFor(user, home.consumerNumber, `${user.name} started a new survey on their own and took ${home.consumerNumber} (${home.name || name}, ${home.village || place.village}).`)
    );
    if (saved) return { consumer: saved as unknown as Consumer, added: false, alreadyYours: false };
    // Someone else took it a moment ago
    const now = await findHome(consumerNumber);
    return now?.assignedInstallerId === user.id ? { consumer: now, added: false, alreadyYours: true } : { problem: TAKEN };
  }

  const consumer: Consumer = {
    // Built from the number, so two people adding the same new home at once cannot make two records
    id: `c_field_${sameKey(consumerNumber).replace(/[^A-Z0-9]/g, '_')}`,
    consumerNumber,
    name,
    mobile,
    village: place.village,
    mandal: place.mandal,
    district: place.district,
    division: user.division ?? '',
    ula,
    status: 'Assigned',
    assignedInstallerId: user.id,
    assignedInstallerName: user.name,
    assignedDate: istToday(),
    capacityKw,
    selfAssigned: true,
    addedByInstaller: true,
  };
  const saved = await takeHome(
    { add: consumer as unknown as DbRecord },
    auditFor(user, consumerNumber, `${user.name} started a new survey and added a home that was not in the consumer list: ${consumerNumber} (${name}, ${place.label}, ${mobile}, ${capacityKw} kW${ula ? `, ULA ${ula}` : ''}).`)
  );
  if (saved) return { consumer: saved as unknown as Consumer, added: true, alreadyYours: false };
  const now = await findHome(consumerNumber);
  return now?.assignedInstallerId === user.id ? { consumer: now, added: false, alreadyYours: true } : { problem: TAKEN };
};
