import 'server-only';
import { createHmac } from 'crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ensureDb, sql } from './db';
import { User } from '@/types';
import { IS_DEMO } from '@/lib/mode';
import { hashPinForSetup, pinMatchesHash, sameText } from './pinHash';

/**
 * Sign-in: each person has a username and a PIN. After signing in, the phone keeps a signed
 * cookie for 30 days, so field staff are not asked again while they work offline.
 * Every server route reads the cookie to know who is asking.
 */

const COOKIE = 'st_session';
const SESSION_DAYS = 30;

// Wrong PINs allowed before the username is locked for a while
const MAX_FAILURES = 5;
const LOCK_MINUTES = 15;

const secret = () => {
  // Production must have its own sign-in secret; the demo may borrow the photo secret
  const s = process.env.AUTH_SECRET || (IS_DEMO ? process.env.PHOTO_SIGNING_SECRET : undefined);
  if (!s || s.length < 32) throw new Error('AUTH_SECRET (at least 32 characters) is not set');
  return s;
};

const b64 = (s: string) => Buffer.from(s, 'utf8').toString('base64url');
const unb64 = (s: string) => Buffer.from(s, 'base64url').toString('utf8');
const mac = (payload: string) => createHmac('sha256', secret()).update(`session|${payload}`).digest('base64url');
const same = sameText;

/** A PIN is 4 to 8 digits */
export const validPin = (pin: unknown): pin is string => typeof pin === 'string' && /^\d{4,8}$/.test(pin);

export const hashPin = hashPinForSetup;
const pinMatches = pinMatchesHash;

export const setPin = async (userId: string, pin: string) => {
  await ensureDb();
  const h = await hashPin(pin);
  await sql.query(
    `insert into user_pins (user_id, pin_hash) values ($1, $2) on conflict (user_id) do update set pin_hash = excluded.pin_hash, updated_at = now()`,
    [userId, h]
  );
};

const userById = async (id: string): Promise<User | null> => {
  const rows = (await sql.query(`select data from users where id = $1`, [id])) as { data: User }[];
  return rows[0]?.data ?? null;
};

export type LoginResult = { user: User } | { locked: number } | null;

/**
 * Check a username and PIN. After MAX_FAILURES wrong PINs the username is locked for LOCK_MINUTES
 * (returns the minutes left). On the demo only, a person with no PIN yet can use DEMO_PIN.
 */
export const checkLogin = async (username: string, pin: string): Promise<LoginResult> => {
  await ensureDb();
  const name = username.trim().toLowerCase();
  const lock = (await sql.query(
    `select ceil(extract(epoch from (locked_until - now())) / 60)::int as minutes from login_attempts where username = $1 and locked_until > now()`,
    [name]
  )) as { minutes: number }[];
  if (lock[0]) return { locked: Math.max(1, lock[0].minutes) };

  const rows = (await sql.query(`select data from users where lower(username) = $1`, [name])) as { data: User }[];
  const user = rows[0]?.data;
  let ok = false;
  if (user && user.status === 'Active') {
    const pins = (await sql.query(`select pin_hash from user_pins where user_id = $1`, [user.id])) as { pin_hash: string }[];
    if (pins[0]) ok = await pinMatches(pin, pins[0].pin_hash);
    else {
      const demo = IS_DEMO ? process.env.DEMO_PIN : undefined;
      ok = !!demo && validPin(demo) && same(pin, demo);
    }
  } else {
    await hashPin(pin); // same time taken whether or not the username exists
  }

  if (!ok) {
    const r = (await sql.query(
      `insert into login_attempts (username, failures) values ($1, 1)
       on conflict (username) do update set
         failures = case when login_attempts.locked_until is not null and login_attempts.locked_until <= now() then 1 else login_attempts.failures + 1 end,
         locked_until = null, updated_at = now()
       returning failures`,
      [name]
    )) as { failures: number }[];
    if (r[0].failures >= MAX_FAILURES) {
      await sql.query(`update login_attempts set locked_until = now() + ($2 || ' minutes')::interval where username = $1`, [name, String(LOCK_MINUTES)]);
      return { locked: LOCK_MINUTES };
    }
    return null;
  }

  await sql.query(`delete from login_attempts where username = $1`, [name]);
  // "Last active" on the Users screen
  const lastLogin = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
  await sql.query(`update users set data = jsonb_set(data, '{lastLogin}', to_jsonb($2::text)), updated_at = now() where id = $1`, [user!.id, lastLogin]);
  return { user: { ...user!, lastLogin } };
};

/** Clear a lock early, e.g. when the office sets a new PIN */
export const clearLoginLock = async (username: string) => {
  await sql.query(`delete from login_attempts where username = $1`, [username.trim().toLowerCase()]);
};

export const sessionCookieValue = (userId: string) => {
  const payload = `${b64(userId)}.${Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000}`;
  return `${payload}.${mac(payload)}`;
};

export const attachSession = (res: NextResponse, userId: string) => {
  res.cookies.set(COOKIE, sessionCookieValue(userId), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
  return res;
};

export const clearSession = (res: NextResponse) => {
  res.cookies.set(COOKIE, '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 });
  return res;
};

/** Who is asking, or null. Users who were switched off are treated as signed out. */
export const sessionUser = async (): Promise<User | null> => {
  const raw = cookies().get(COOKIE)?.value;
  if (!raw) return null;
  const parts = raw.split('.');
  if (parts.length !== 3) return null;
  const [id64, exp, sig] = parts;
  if (!same(sig, mac(`${id64}.${exp}`)) || !(Number(exp) > Date.now())) return null;
  await ensureDb();
  const user = await userById(unb64(id64));
  return user && user.status === 'Active' ? user : null;
};

export const notSignedIn = () => NextResponse.json({ error: 'Please sign in again' }, { status: 401 });
export const notAllowed = (msg = 'Not allowed') => NextResponse.json({ error: msg }, { status: 403 });
