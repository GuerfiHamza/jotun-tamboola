import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/index';
import { participants } from '@/lib/db/schema';
import { checkCsrf } from '@/lib/csrf';
import { checkRateLimit } from '@/lib/rateLimit';
import { verifyTurnstile } from '@/lib/turnstile';
import { STORES_SET } from '@/lib/stores';

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

export async function POST(req: NextRequest): Promise<NextResponse> {
  const csrfError = checkCsrf(req);
  if (csrfError) return csrfError;

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!checkRateLimit(`register:${ip}`, 10)) {
    return NextResponse.json({ error: 'Trop de tentatives. Réessayez plus tard.' }, { status: 429 });
  }

  let body: { nom?: unknown; prenom?: unknown; phone?: unknown; wilaya?: unknown; is_painter?: unknown; turnstileToken?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide.' }, { status: 400 });
  }

  // #5 Bot protection (no-op if TURNSTILE_SECRET_KEY is unset)
  if (!(await verifyTurnstile(body.turnstileToken, ip))) {
    return NextResponse.json({ error: 'Vérification anti-robot échouée. Réessayez.' }, { status: 403 });
  }

  const nom    = typeof body.nom    === 'string' ? body.nom.trim()    : '';
  const prenom = typeof body.prenom === 'string' ? body.prenom.trim() : '';
  const phone  = typeof body.phone  === 'string' ? normalizePhone(body.phone) : '';
  const wilaya = typeof body.wilaya === 'string' ? body.wilaya.trim() : '';
  const full_name = `${prenom} ${nom}`.trim();

  if (!nom || !prenom || !phone || !wilaya) {
    return NextResponse.json({ error: 'Tous les champs obligatoires doivent être remplis.' }, { status: 400 });
  }
  if (nom.length < 2 || nom.length > 100 || prenom.length < 2 || prenom.length > 100) {
    return NextResponse.json({ error: 'Nom ou prénom invalide (2 à 100 caractères).' }, { status: 400 });
  }
  if (!PHONE_RE.test(phone)) {
    return NextResponse.json({ error: 'Numéro de téléphone algérien invalide (ex : 0550123456).' }, { status: 400 });
  }
  if (!STORES_SET.has(wilaya)) {
    return NextResponse.json({ error: 'Point de vente invalide.' }, { status: 400 });
  }

  // Duplicate phone numbers are allowed by design — the same person may
  // submit multiple separate entries. They are grouped by phone in the admin
  // dashboard. Invoice-level dedup (in the upload route) still prevents the
  // same invoice image from being reused.
  try {
    const [inserted] = await db
      .insert(participants)
      .values({
        full_name,
        nom,
        prenom,
        phone,
        wilaya,
        is_painter: body.is_painter ? 1 : 0,
        password: '',
        status: 'pending',
      })
      .$returningId();

    return NextResponse.json({ success: true, participantId: inserted.id, requiresInvoice: true });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur. Réessayez.' }, { status: 500 });
  }
}
