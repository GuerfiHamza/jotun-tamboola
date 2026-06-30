import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/index';
import { accounts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { verifyPassword, signAdminToken, DUMMY_HASH } from '@/lib/auth';
import { checkCsrf } from '@/lib/csrf';
import { checkRateLimit } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  const csrfError = checkCsrf(req);
  if (csrfError) return csrfError;

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!checkRateLimit(`login:${ip}`)) {
    return NextResponse.json({ error: 'Trop de tentatives. Réessayez dans 15 minutes.' }, { status: 429 });
  }

  let username: unknown, password: unknown;
  try {
    ({ username, password } = await req.json());
  } catch {
    return NextResponse.json({ error: 'Corps invalide' }, { status: 400 });
  }
  if (typeof username !== 'string' || typeof password !== 'string' ||
      username.length > 100 || password.length > 200) {
    return NextResponse.json({ error: 'Identifiants incorrects' }, { status: 401 });
  }

  const account = await db.query.accounts.findFirst({
    where: eq(accounts.store_name, username),
  });

  // Always run bcrypt (against a dummy hash if the account doesn't exist)
  // so response time doesn't reveal whether a username is valid.
  const ok = await verifyPassword(password, account?.password ?? DUMMY_HASH);
  if (!account || !ok) {
    return NextResponse.json({ error: 'Identifiants incorrects' }, { status: 401 });
  }
  // Deactivated store accounts can't log in (master toggles `active`).
  if (!account.active) {
    return NextResponse.json({ error: 'Compte désactivé. Contactez l’administrateur.' }, { status: 403 });
  }

  const token = signAdminToken(account.id, account.role);
  const res = NextResponse.json({ success: true });

  res.cookies.set('admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8,
  });

  return res;
}
