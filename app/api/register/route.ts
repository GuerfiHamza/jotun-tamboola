import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/index';
import { participants, accounts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { checkCsrf } from '@/lib/csrf';
import { checkRateLimit } from '@/lib/rateLimit';
import { getAdminFromRequest } from '@/lib/adminAuth';
import { logAction } from '@/lib/audit';

// Algerian mobile/landline: 0 + 9 digits (05/06/07 mobile, 02/03/04 landline)
const PHONE_RE = /^0[2-7]\d{8}$/;

// Accepts 0550123456, +213550123456, +2130550123456, 00213550123456 -> normalizes to 0550123456
function normalizePhone(raw: string): string {
  let p = raw.replace(/[\s.-]/g, '');
  if (p.startsWith('+213')) p = p.slice(4);
  else if (p.startsWith('00213')) p = p.slice(5);
  if (p.startsWith('0') && p.length === 11) p = p.slice(1); // +2130... double-prefix case
  if (/^[2-7]\d{8}$/.test(p)) p = '0' + p;
  return p;
}

// Authenticated submission: a logged-in store account creates a participant
// entry. The store name is taken from the account — not the form — so a store
// can only file submissions under its own name. Master accounts don't submit.
export async function POST(req: NextRequest): Promise<NextResponse> {
  const acc = await getAdminFromRequest();
  if (!acc) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  if (acc.role !== 'store')
    return NextResponse.json({ error: 'Seuls les comptes magasin peuvent soumettre.' }, { status: 403 });

  const csrfError = checkCsrf(req);
  if (csrfError) return csrfError;

  if (!checkRateLimit(`register:${acc.accountId}`, 30)) {
    return NextResponse.json({ error: 'Trop de tentatives. Réessayez plus tard.' }, { status: 429 });
  }

  const store = await db.query.accounts.findFirst({ where: eq(accounts.id, acc.accountId) });
  if (!store) return NextResponse.json({ error: 'Compte introuvable.' }, { status: 401 });

  let body: { commercial_nom?: unknown; commercial_prenom?: unknown; nom?: unknown; prenom?: unknown; phone?: unknown; is_painter?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide.' }, { status: 400 });
  }

  const commercial_nom    = typeof body.commercial_nom    === 'string' ? body.commercial_nom.trim()    : '';
  const commercial_prenom = typeof body.commercial_prenom === 'string' ? body.commercial_prenom.trim() : '';
  const nom    = typeof body.nom    === 'string' ? body.nom.trim()    : '';
  const prenom = typeof body.prenom === 'string' ? body.prenom.trim() : '';
  const phone  = typeof body.phone  === 'string' ? normalizePhone(body.phone) : '';
  const full_name = `${prenom} ${nom}`.trim();

  if (!commercial_nom || !commercial_prenom || !nom || !prenom || !phone) {
    return NextResponse.json({ error: 'Tous les champs obligatoires doivent être remplis.' }, { status: 400 });
  }
  const in2to100 = (s: string) => s.length >= 2 && s.length <= 100;
  if (![commercial_nom, commercial_prenom, nom, prenom].every(in2to100)) {
    return NextResponse.json({ error: 'Nom ou prénom invalide (2 à 100 caractères).' }, { status: 400 });
  }
  if (!PHONE_RE.test(phone)) {
    return NextResponse.json({ error: 'Numéro de téléphone algérien invalide (ex : 0550123456).' }, { status: 400 });
  }

  try {
    const [inserted] = await db
      .insert(participants)
      .values({
        account_id: store.id,
        full_name,
        commercial_nom,
        commercial_prenom,
        nom,
        prenom,
        phone,
        wilaya: store.store_name, // store name is derived from the account
        is_painter: body.is_painter ? 1 : 0,
        password: '',
        status: 'pending',
      })
      .$returningId();

    await logAction(acc, 'submission.create', `client ${full_name} (${phone}) par ${commercial_prenom} ${commercial_nom}`);
    return NextResponse.json({ success: true, participantId: inserted.id, requiresInvoice: true });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur. Réessayez.' }, { status: 500 });
  }
}
