'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AllData, chronological, CollectionKey, DbRecord, TABLE_NAMES, TableChanges, TableName, TABLES } from './tables';

/**
 * Keeps the app's lists in step with the database.
 *
 * - On start: sends anything not yet saved, then loads everything from the server.
 * - After each change: works out which records changed and sends only those.
 * - Changes not yet saved are kept on this device (so a refresh or no internet never loses them)
 *   and are sent again until the server accepts them.
 * - Every 30 seconds, and when the window gets focus, it reloads so other people's work shows up.
 */

export type SyncState = 'loading' | 'saved' | 'saving' | 'not_saved';

const PENDING_KEY = 'SOLAR_TRACKER_PENDING_V1';
const IMPORTED_KEY = 'SOLAR_TRACKER_IMPORTED_V1';
// Where the app kept everything before the database existed
const OLD_DATA_KEY = 'SOLAR_TRACKER_DATA_V1';
const OLD_SURVEY_KEY = 'SOLAR_TRACKER_SURVEYS_V1';

const LOAD_TIMEOUT_MS = 10000;
const RETRY_MS = 15000;
const REFRESH_MS = 30000;

const readJson = <T,>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

const isEmpty = (p: Pending) => Object.values(p).every((c) => !c || (c.upserts.length === 0 && c.deletes.length === 0));

/** A change the server would not accept, e.g. a home outside an installer's work area */
export interface Refusal {
  table: TableName;
  id: string;
  reason: string;
}

/** True when this device has work not yet sent to the server */
export const hasUnsentWork = () => {
  const p = readJson<Pending>(PENDING_KEY);
  return !!p && !isEmpty(p);
};

/** Forget unsent work (only when the person chooses to discard it) */
export const discardUnsentWork = () => {
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch {
    /* ignore */
  }
};

type Pending = Partial<Record<TableName, { upserts: DbRecord[]; deletes: string[] }>>;


/** Add newer changes on top of older ones. The newest version of a record wins. */
const merge = (older: Pending, newer: Pending): Pending => {
  const out: Pending = {};
  for (const t of TABLE_NAMES) {
    const a = older[t] ?? { upserts: [], deletes: [] };
    const b = newer[t] ?? { upserts: [], deletes: [] };
    const touched = new Set([...b.upserts.map((r) => r.id), ...b.deletes]);
    const upserts = new Map<string, DbRecord>();
    for (const r of a.upserts) if (!touched.has(r.id)) upserts.set(r.id, r);
    for (const r of b.upserts) {
      upserts.delete(r.id); // keep the latest position
      upserts.set(r.id, r);
    }
    const deletes = new Set(a.deletes.filter((id) => !touched.has(id)));
    b.deletes.forEach((id) => deletes.add(id));
    if (upserts.size || deletes.size) out[t] = { upserts: Array.from(upserts.values()), deletes: Array.from(deletes) };
  }
  return out;
};

const toChanges = (p: Pending): TableChanges[] =>
  TABLE_NAMES.filter((t) => p[t]).map((t) => ({ table: t, upserts: p[t]!.upserts, deletes: p[t]!.deletes }));

/** What this browser had saved before the database existed, as one batch to send once */
const oldDeviceData = (): Pending | null => {
  if (readJson(IMPORTED_KEY)) return null;
  const old = readJson<Record<string, DbRecord[]>>(OLD_DATA_KEY) ?? {};
  const surveys = readJson<DbRecord[]>(OLD_SURVEY_KEY);
  if (surveys) old.surveys = surveys;
  const p: Pending = {};
  for (const t of TABLE_NAMES) {
    const rows = old[TABLES[t].collection];
    if (Array.isArray(rows) && rows.length) {
      const valid = rows.filter((r) => r && typeof r.id === 'string' && r.id);
      p[t] = { upserts: chronological(t, valid), deletes: [] };
    }
  }
  return p;
};

type Snapshot = Record<TableName, Map<string, string>>;

const snapshotOf = (data: Partial<AllData>): Snapshot => {
  const s = {} as Snapshot;
  for (const t of TABLE_NAMES) {
    s[t] = new Map((data[TABLES[t].collection] ?? []).map((r) => [r.id, JSON.stringify(r)]));
  }
  return s;
};

export const useServerSync = ({
  collections,
  setters,
  paused,
  onSignedOut,
  onRefused,
}: {
  collections: AllData;
  setters: Record<CollectionKey, (rows: DbRecord[]) => void>;
  paused: boolean;
  /** The server no longer knows who this is (signed out elsewhere, or 30 days passed) */
  onSignedOut: () => void;
  /** Some changes were not accepted and will not be sent again */
  onRefused: (refused: Refusal[]) => void;
}) => {
  const [syncState, setSyncState] = useState<SyncState>('loading');
  // Read the old device data during the first render, before anything overwrites it
  const [importBatch] = useState(() => (typeof window === 'undefined' ? null : oldDeviceData()));

  const ready = useRef(false);
  const snapshot = useRef<Snapshot | null>(null);
  const pending = useRef<Pending>({});
  const version = useRef(0); // goes up on every local change
  const flushing = useRef(false);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(collections);
  latest.current = collections;
  const settersRef = useRef(setters);
  settersRef.current = setters;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const callbacks = useRef({ onSignedOut, onRefused });
  callbacks.current = { onSignedOut, onRefused };

  const savePending = () => {
    try {
      if (isEmpty(pending.current)) localStorage.removeItem(PENDING_KEY);
      else localStorage.setItem(PENDING_KEY, JSON.stringify(pending.current));
    } catch {
      /* storage full: the changes are still in memory and will be sent */
    }
  };

  /** Show the server's data. The snapshot is set first so this does not count as a change. */
  const applyServerData = (data: AllData) => {
    snapshot.current = snapshotOf(data);
    for (const t of TABLE_NAMES) {
      const key = TABLES[t].collection;
      settersRef.current[key](Array.isArray(data[key]) ? data[key] : []);
    }
  };

  const flush = useCallback(async (): Promise<boolean> => {
    if (flushing.current) return false;
    if (isEmpty(pending.current)) return true;
    if (pausedRef.current) {
      setSyncState('not_saved');
      return false;
    }
    flushing.current = true;
    setSyncState('saving');
    const batch = pending.current;
    pending.current = {};
    let ok = false;
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changes: toChanges(batch) }),
      });
      if (res.status === 400) {
        // The server will never accept this batch; keeping it would block every later save
        console.error('Server refused changes', await res.text());
        ok = true;
      } else if (res.status === 401) {
        ok = false; // kept on this device until the same person signs in again
        callbacks.current.onSignedOut();
      } else {
        ok = res.ok;
        if (ok) {
          const { refused } = (await res.json().catch(() => ({}))) as { refused?: Refusal[] };
          if (refused?.length) callbacks.current.onRefused(refused);
        }
      }
    } catch {
      ok = false;
    }
    if (!ok) pending.current = merge(batch, pending.current);
    savePending();
    flushing.current = false;
    if (ok && !isEmpty(pending.current)) return flush();
    setSyncState(ok ? 'saved' : 'not_saved');
    return ok;
  }, []);

  const loadFromServer = useCallback(async (): Promise<boolean> => {
    const startVersion = version.current;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), LOAD_TIMEOUT_MS);
    try {
      const res = await fetch('/api/data', { cache: 'no-store', signal: ctrl.signal });
      if (res.status === 401) callbacks.current.onSignedOut();
      if (!res.ok) return false;
      const data = (await res.json()) as AllData;
      // Something changed here while loading: keep the local work, load again later
      if (version.current !== startVersion || !isEmpty(pending.current)) return false;
      applyServerData(data);
      return true;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  }, []);

  // Start: send what is waiting, then load everything
  useEffect(() => {
    (async () => {
      pending.current = readJson<Pending>(PENDING_KEY) ?? {};
      if (importBatch) {
        pending.current = merge(importBatch, pending.current);
        savePending();
        try {
          localStorage.setItem(IMPORTED_KEY, new Date().toISOString());
        } catch {
          /* ignore */
        }
      }
      const sent = await flush();
      const loaded = sent && (await loadFromServer());
      if (!loaded) {
        // No server: carry on with what this device has, and keep trying
        snapshot.current = snapshotOf(latest.current);
        setSyncState('not_saved');
      } else setSyncState('saved');
      ready.current = true;
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // After each change: queue the records that changed and send them shortly
  const deps = TABLE_NAMES.map((t) => collections[TABLES[t].collection]);
  useEffect(() => {
    if (!ready.current || !snapshot.current) return;
    const changes: Pending = {};
    for (const t of TABLE_NAMES) {
      const rows = collections[TABLES[t].collection];
      const before = snapshot.current[t];
      const now = new Map<string, string>();
      const byId = new Map<string, DbRecord>();
      for (const r of rows) {
        now.set(r.id, JSON.stringify(r));
        byId.set(r.id, r);
      }
      const upserts = chronological(t, Array.from(byId.values())).filter((r) => before.get(r.id) !== now.get(r.id));
      const deletes = Array.from(before.keys()).filter((id) => !now.has(id));
      snapshot.current[t] = now;
      if (upserts.length || deletes.length) changes[t] = { upserts, deletes };
    }
    if (isEmpty(changes)) return;
    version.current++;
    pending.current = merge(pending.current, changes);
    savePending();
    setSyncState('saving');
    if (flushTimer.current) clearTimeout(flushTimer.current);
    flushTimer.current = setTimeout(() => void flush(), 400);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  // Keep trying to send, and pick up other people's changes
  useEffect(() => {
    const refresh = async () => {
      if (!ready.current || pausedRef.current || flushing.current) return;
      if (!isEmpty(pending.current)) {
        await flush();
        return;
      }
      await loadFromServer();
    };
    const retry = setInterval(() => {
      if (ready.current && !isEmpty(pending.current)) void flush();
    }, RETRY_MS);
    const poll = setInterval(refresh, REFRESH_MS);
    const onFocus = () => void refresh();
    window.addEventListener('online', onFocus);
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(retry);
      clearInterval(poll);
      window.removeEventListener('online', onFocus);
      window.removeEventListener('focus', onFocus);
    };
  }, [flush, loadFromServer]);

  // Back "online" in the app: send what was waiting
  useEffect(() => {
    if (!paused && ready.current) void flush();
  }, [paused, flush]);

  /** After a reset on the server: forget unsent changes and load fresh data */
  const reloadAfterReset = useCallback(async () => {
    pending.current = {};
    savePending();
    version.current++;
    const ok = await loadFromServer();
    setSyncState(ok ? 'saved' : 'not_saved');
    return ok;
  }, [loadFromServer]);

  return { syncState, reloadAfterReset };
};

export type UploadResult = { url: string } | { refused: string } | null;

/**
 * Store a photo on the server with its location.
 * Returns its link, `refused` if the server will never accept it, or null if it could not be sent (try again later).
 */
export const uploadPhoto = async (
  dataUrl: string,
  group: string,
  folder: 'surveys' | 'installations',
  geo: { latitude: number; longitude: number; accuracy: number; takenAt: number; clockChecked: boolean }
): Promise<UploadResult> => {
  try {
    const res = await fetch('/api/uploads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataUrl, folder, group, geo }),
    });
    if (res.status === 400) return { refused: ((await res.json().catch(() => ({}))) as { error?: string }).error || 'refused' };
    if (!res.ok) return null;
    const { url } = (await res.json()) as { url?: string };
    return url ? { url } : null;
  } catch {
    return null;
  }
};
