import 'server-only';
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

/** PINs are stored only as a slow salted hash (scrypt), never as the digits themselves */

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

export const sameText = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export const hashPinForSetup = async (pin: string) => {
  const salt = randomBytes(16);
  const hash = await scrypt(pin, salt, 32);
  return `s1$${salt.toString('base64url')}$${hash.toString('base64url')}`;
};

export const pinMatchesHash = async (pin: string, stored: string) => {
  const [v, salt, hash] = stored.split('$');
  if (v !== 's1' || !salt || !hash) return false;
  const got = await scrypt(pin, Buffer.from(salt, 'base64url'), 32);
  return sameText(got.toString('base64url'), hash);
};
