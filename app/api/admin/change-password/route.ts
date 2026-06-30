import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/index';
import { accounts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getAdminFromRequest } from '@/lib/adminAuth';
import { checkCsrf } from '@/lib/csrf';
import { checkRateLimit } from '@/lib/rateLimit';
import { hashPassword, verifyPassword } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const acc = await getAdminFromRequest();
  if (!acc) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });

  const csrfError = checkCsrf(req);
  if (csrfError) return csrfError;

  if (!checkRateLimit(`pwchange:${acc.accountId}`, 10)) {
    return NextResponse.json({ error: 'Trop de tentatives. Réessayez plus tard.' }, { status: 429 });
  }

  let body: { current_password?: unknown; new_password?: unknown };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Corps invalide' }, { status: 400 }); }

  const newPassword = typeof body.new_password === 'string' ? body.new_password : '';
  if (newPassword.length < 8 || newPassword.length > 200)
    return NextResponse.json({ error: 'Le mot de passe doit contenir au moins 8 caractères.' }, { status: 400 });

  const me = await db.query.accounts.findFirst({ where: eq(accounts.id, acc.accountId) });
  if (!me) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });

  // Voluntary change (not the forced first-login) must prove the current
  // password — defends against an unlocked/hijacked session silently locking
  // out the real owner.
  if (!me.must_change_password) {
    const current = typeof body.current_password === 'string' ? body.current_password : '';
    if (!await verifyPassword(current, me.password))
      return NextResponse.json({ error: 'Mot de passe actuel incorrect.' }, { status: 403 });
  }

  await db.update(accounts)
    .set({ password: await hashPassword(newPassword), must_change_password: 0 })
    .where(eq(accounts.id, acc.accountId));

  return NextResponse.json({ success: true });
}
