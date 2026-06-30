import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomInt } from 'crypto';

// Easy-to-read temp password: 4 unambiguous letters + dash + 4 digits, e.g.
// "kxmr-8472". Crypto RNG (not Math.random); the store must change it anyway.
export function generateTempPassword(): string {
  const letters = 'abcdefghjkmnpqrstuvwxyz'; // no i/l/o (look like 1/0)
  let s = '';
  for (let i = 0; i < 4; i++) s += letters[randomInt(letters.length)];
  s += '-';
  for (let i = 0; i < 4; i++) s += randomInt(10);
  return s;
}

// SECURITY: fail hard if the secret is missing — a fallback secret in code
// would let anyone forge admin tokens in production.
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET env var is required (min 32 chars).');
}

export const hashPassword = (password: string) => bcrypt.hash(password, 12);
export const verifyPassword = (password: string, hash: string) => bcrypt.compare(password, hash);

// Used to defeat username-enumeration timing attacks on login.
export const DUMMY_HASH = '$2b$12$C6UzMDM.H6dfI/f/IKcEeO7ZWk1b1FZkH1lqyZyZyZyZyZyZyZyZy';

export type Role = 'master' | 'store';

export function signAdminToken(accountId: number, role: Role): string {
  return jwt.sign({ accountId, role }, JWT_SECRET as string, { expiresIn: '8h' });
}

export function verifyAdminToken(token: string): { accountId: number; role: Role } | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET as string, { algorithms: ['HS256'] }) as { accountId?: number; role?: string };
    if (typeof payload.accountId !== 'number' || (payload.role !== 'master' && payload.role !== 'store')) return null;
    return { accountId: payload.accountId, role: payload.role };
  } catch {
    return null;
  }
}
