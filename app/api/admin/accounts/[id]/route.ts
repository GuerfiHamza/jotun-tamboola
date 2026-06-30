import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/index';
import { accounts } from '@/lib/db/schema';
import { and, eq, ne } from 'drizzle-orm';
import { getAdminFromRequest } from '@/lib/adminAuth';
import { checkCsrf } from '@/lib/csrf';
import { hashPassword, generateTempPassword } from '@/lib/auth';

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// PATCH: master edits a store account (name / password / active).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const acc = await getAdminFromRequest();
  if (!acc || acc.role !== 'master')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const csrfError = checkCsrf(req);
  if (csrfError) return csrfError;

  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  const target = await db.query.accounts.findFirst({ where: eq(accounts.id, id) });
  if (!target) return NextResponse.json({ error: 'Compte introuvable' }, { status: 404 });
  if (target.role === 'master')
    return NextResponse.json({ error: 'Le compte maître ne peut pas être modifié ici.' }, { status: 403 });

  let body: { store_name?: unknown; regenerate_password?: unknown; active?: unknown };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Corps invalide' }, { status: 400 }); }

  const set: Partial<typeof accounts.$inferInsert> = {};

  if (body.store_name !== undefined) {
    const v = typeof body.store_name === 'string' ? body.store_name.trim() : '';
    if (v.length < 2 || v.length > 150)
      return NextResponse.json({ error: 'Nom du magasin invalide.' }, { status: 400 });
    const dupe = await db.query.accounts.findFirst({ where: and(eq(accounts.store_name, v), ne(accounts.id, id)) });
    if (dupe) return NextResponse.json({ error: 'Un compte avec ce nom existe déjà.' }, { status: 409 });
    set.store_name = v;
  }
  if (body.active !== undefined) set.active = body.active ? 1 : 0;

  // Master resets to a fresh temp password; the store must change it again.
  let newPassword: string | undefined;
  if (body.regenerate_password) {
    newPassword = generateTempPassword();
    set.password = await hashPassword(newPassword);
    set.must_change_password = 1;
  }

  if (Object.keys(set).length === 0)
    return NextResponse.json({ error: 'Rien à mettre à jour.' }, { status: 400 });

  await db.update(accounts).set(set).where(eq(accounts.id, id));
  return NextResponse.json({ success: true, ...(newPassword ? { password: newPassword } : {}) });
}

// DELETE: master removes a store account (its submissions cascade-delete).
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const acc = await getAdminFromRequest();
  if (!acc || acc.role !== 'master')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const csrfError = checkCsrf(req);
  if (csrfError) return csrfError;

  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  const target = await db.query.accounts.findFirst({ where: eq(accounts.id, id) });
  if (!target) return NextResponse.json({ error: 'Compte introuvable' }, { status: 404 });
  if (target.role === 'master')
    return NextResponse.json({ error: 'Le compte maître ne peut pas être supprimé.' }, { status: 403 });

  await db.delete(accounts).where(eq(accounts.id, id));
  return NextResponse.json({ success: true });
}
