import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

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

export function signAdminToken(adminId: number): string {
  return jwt.sign({ adminId, role: 'admin' }, JWT_SECRET as string, { expiresIn: '8h' });
}

export function verifyAdminToken(token: string): { adminId: number } | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET as string, { algorithms: ['HS256'] }) as { adminId?: number; role?: string };
    if (typeof payload.adminId !== 'number' || payload.role !== 'admin') return null;
    return { adminId: payload.adminId };
  } catch {
    return null;
  }
}
