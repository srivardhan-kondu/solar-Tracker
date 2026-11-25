import 'server-only';
import { createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ensureDb, sql } from './db';
import { User } from '@/types';

/**
 * Sign-in: each person has a username and a PIN. After signing in, the phone keeps a signed
 * cookie for 30 days, so field staff are not asked again while they work offline.
 * Every server route reads the cookie to know who is asking.
 */

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

const COOKIE = 'st_session';
const SESSION_DAYS = 30;

const secret = () => {
  const s = process.env.AUTH_SECRET || process.env.PHOTO_SIGNING_SECRET;
  if (!s) throw new Error('AUTH_SECRET is not set');
  return s;
};

const b64 = (s: string) => Buffer.from(s, 'utf8').toString('base64url');
const unb64 = (s: string) => Buffer.from(s, 'base64url').toString('utf8');
const mac = (payload: string) => createHmac('sha256', secret()).update(`session|${payload}`).digest('base64url');
const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** A PIN is 4 to 8 digits */
export const validPin = (pin: unknown): pin is string => typeof pin === 'string' && /^\d{4,8}$/.test(pin);

export const hashPin = async (pin: string) => {
  const salt = randomBytes(16);
  const hash = await scrypt(pin, salt, 32);
  return `s1$${salt.toString('base64url')}$${hash.toString('base64url')}`;
};

const pinMatches = async (pin: string, stored: string) => {
  const [v, salt, hash] = stored.split('$');
  if (v !== 's1' || !salt || !hash) return false;
  const got = await scrypt(pin, Buffer.from(salt, 'base64url'), 32);
  return same(got.toString('base64url'), hash);
};

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

/**
 * Check a username and PIN. A person with no PIN yet can use DEMO_PIN from the server settings,
 * if it is set (for first set-up only; the office then gives everyone their own PIN).
 */
export const checkLogin = async (username: string, pin: string): Promise<User | null> => {
  await ensureDb();
  const rows = (await sql.query(`select data from users where lower(username) = lower($1)`, [username.trim()])) as { data: User }[];
  const user = rows[0]?.data;
  if (!user || user.status !== 'Active') {
    await hashPin(pin); // same time taken whether or not the username exists
    return null;
  }
  const pins = (await sql.query(`select pin_hash from user_pins where user_id = $1`, [user.id])) as { pin_hash: string }[];
  if (pins[0]) return (await pinMatches(pin, pins[0].pin_hash)) ? user : null;
  const demo = process.env.DEMO_PIN;
  return demo && validPin(demo) && same(pin, demo) ? user : null;
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
