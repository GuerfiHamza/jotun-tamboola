import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/index';
import { accounts } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';
import { getAdminFromRequest } from '@/lib/adminAuth';
import { checkCsrf } from '@/lib/csrf';
import { hashPassword, generateTempPassword } from '@/lib/auth';

// GET: master lists all store accounts. POST: master creates one.
export async function GET() {
  const acc = await getAdminFromRequest();
  if (!acc || acc.role !== 'master')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await db
    .select({ id: accounts.id, store_name: accounts.store_name, phone: accounts.phone, role: accounts.role, active: accounts.active, created_at: accounts.created_at })
    .from(accounts)
    .orderBy(desc(accounts.created_at));

  return NextResponse.json({ accounts: rows });
}

export async function POST(req: NextRequest) {
  const acc = await getAdminFromRequest();
  if (!acc || acc.role !== 'master')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const csrfError = checkCsrf(req);
  if (csrfError) return csrfError;

  let body: { store_name?: unknown; phone?: unknown; active?: unknown };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Corps invalide' }, { status: 400 }); }

  const store_name = typeof body.store_name === 'string' ? body.store_name.trim() : '';
  const phone      = typeof body.phone === 'string' ? body.phone.trim() : '';

  if (store_name.length < 2 || store_name.length > 150)
    return NextResponse.json({ error: 'Nom du magasin invalide (2 à 150 caractères).' }, { status: 400 });
  if (phone.length < 6 || phone.length > 30)
    return NextResponse.json({ error: 'Numéro de téléphone invalide.' }, { status: 400 });

  const dupe = await db.query.accounts.findFirst({ where: eq(accounts.store_name, store_name) });
  if (dupe) return NextResponse.json({ error: 'Un compte avec ce nom existe déjà.' }, { status: 409 });

  // The master never picks the password — we generate a temp one and return it
  // once so the master can hand it over. The store changes it on first login.
  const tempPassword = generateTempPassword();

  const [inserted] = await db.insert(accounts).values({
    store_name,
    phone,
    password: await hashPassword(tempPassword),
    role: 'store',
    active: body.active === false ? 0 : 1,
    must_change_password: 1,
  }).$returningId();

  return NextResponse.json({ success: true, id: inserted.id, password: tempPassword });
}
