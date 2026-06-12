import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/index';
import { admins } from '@/lib/db/schema';
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

  const admin = await db.query.admins.findFirst({
    where: eq(admins.username, username),
  });

  // Always run bcrypt (against a dummy hash if the user doesn't exist)
  // so response time doesn't reveal whether a username is valid.
  const ok = await verifyPassword(password, admin?.password ?? DUMMY_HASH);
  if (!admin || !ok) {
    return NextResponse.json({ error: 'Identifiants incorrects' }, { status: 401 });
  }

  const token = signAdminToken(admin.id);
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
