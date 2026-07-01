import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/index';
import { accounts, participants } from '@/lib/db/schema';
import { desc, eq, sql } from 'drizzle-orm';
import { getAdminFromRequest } from '@/lib/adminAuth';
import { checkCsrf } from '@/lib/csrf';
import { hashPassword } from '@/lib/auth';
import { logAction } from '@/lib/audit';

// GET: master lists all store accounts (with their submission counts). POST: master creates one.
export async function GET() {
  const acc = await getAdminFromRequest();
  if (!acc || acc.role !== 'master')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await db
    .select({
      id: accounts.id, store_name: accounts.store_name, nom_de_store: accounts.nom_de_store,
      role: accounts.role, active: accounts.active, created_at: accounts.created_at,
      submission_count: sql<number>`COUNT(DISTINCT ${participants.id})`,
    })
    .from(accounts)
    .leftJoin(participants, eq(participants.account_id, accounts.id))
    .groupBy(accounts.id)
    .orderBy(desc(accounts.created_at));

  return NextResponse.json({ accounts: rows });
}

export async function POST(req: NextRequest) {
  const acc = await getAdminFromRequest();
  if (!acc || acc.role !== 'master')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const csrfError = checkCsrf(req);
  if (csrfError) return csrfError;

  let body: { store_name?: unknown; password?: unknown; role?: unknown; active?: unknown };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Corps invalide' }, { status: 400 }); }

  const store_name = typeof body.store_name === 'string' ? body.store_name.trim() : '';
  const password   = typeof body.password   === 'string' ? body.password   : '';
  const role       = body.role === 'master' ? 'master' : 'store';

  if (store_name.length < 2 || store_name.length > 150)
    return NextResponse.json({ error: 'Nom du magasin invalide (2 à 150 caractères).' }, { status: 400 });
  if (password.length < 6 || password.length > 100)
    return NextResponse.json({ error: 'Mot de passe invalide (6 à 100 caractères).' }, { status: 400 });

  const dupe = await db.query.accounts.findFirst({ where: eq(accounts.store_name, store_name) });
  if (dupe) return NextResponse.json({ error: 'Un compte avec ce nom existe déjà.' }, { status: 409 });

  // The master sets the password directly — the store uses it as-is (no forced
  // change), so must_change_password stays 0.
  const [inserted] = await db.insert(accounts).values({
    store_name,
    nom_de_store: store_name, // ponytail: no separate display name in the form; mirror store_name (both unique)
    password: await hashPassword(password),
    role,
    active: body.active === false ? 0 : 1,
    must_change_password: 0,
  }).$returningId();

  await logAction(acc, 'account.create', `${role} « ${store_name} » (#${inserted.id})`);
  return NextResponse.json({ success: true, id: inserted.id });
}
