import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/index';
import { participants } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { checkCsrf } from '@/lib/csrf';
import { checkRateLimit } from '@/lib/rateLimit';

const WILAYAS = new Set([
  'Adrar','Chlef','Laghouat','Oum El Bouaghi','Batna','Béjaïa','Biskra','Béchar',
  'Blida','Bouira','Tamanrasset','Tébessa','Tlemcen','Tiaret','Tizi Ouzou','Alger',
  'Djelfa','Jijel','Sétif','Saïda','Skikda','Sidi Bel Abbès','Annaba','Guelma',
  'Constantine','Médéa','Mostaganem',"M'Sila",'Mascara','Ouargla','Oran','El Bayadh',
  'Illizi','Bordj Bou Arréridj','Boumerdès','El Tarf','Tindouf','Tissemsilt',
  'El Oued','Khenchela','Souk Ahras','Tipaza','Mila','Aïn Defla','Naâma',
  'Aïn Témouchent','Ghardaïa','Relizane','Timimoun','Bordj Badji Mokhtar',
  'Ouled Djellal','Béni Abbès','In Salah','In Guezzam','Touggourt','Djanet',
  "El M'Ghair",'El Meniaa',
]);

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

  let body: { full_name?: unknown; phone?: unknown; wilaya?: unknown; is_painter?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide.' }, { status: 400 });
  }

  const full_name = typeof body.full_name === 'string' ? body.full_name.trim() : '';
  const phone = typeof body.phone === 'string' ? normalizePhone(body.phone) : '';
  const wilaya = typeof body.wilaya === 'string' ? body.wilaya : '';

  if (!full_name || !phone || !wilaya) {
    return NextResponse.json({ error: 'Tous les champs obligatoires doivent être remplis.' }, { status: 400 });
  }
  if (full_name.length < 3 || full_name.length > 255) {
    return NextResponse.json({ error: 'Nom invalide (3 à 255 caractères).' }, { status: 400 });
  }
  if (!PHONE_RE.test(phone)) {
    return NextResponse.json({ error: 'Numéro de téléphone algérien invalide (ex : 0550123456).' }, { status: 400 });
  }
  if (!WILAYAS.has(wilaya)) {
    return NextResponse.json({ error: 'Wilaya invalide.' }, { status: 400 });
  }

  const existing = await db
    .select({ id: participants.id })
    .from(participants)
    .where(eq(participants.phone, phone))
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json({ error: 'Ce numéro de téléphone est déjà inscrit.' }, { status: 409 });
  }

  try {
    const [inserted] = await db
      .insert(participants)
      .values({
        full_name,
        phone,
        wilaya,
        is_painter: body.is_painter ? 1 : 0,
        password: '',
        status: 'pending',
      })
      .$returningId();

    return NextResponse.json({ success: true, participantId: inserted.id, requiresInvoice: true });
  } catch (e: unknown) {
    // Race on the unique phone index → friendly 409 instead of a 500
    if (typeof e === 'object' && e !== null && 'code' in e && (e as { code: string }).code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'Ce numéro de téléphone est déjà inscrit.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Erreur serveur. Réessayez.' }, { status: 500 });
  }
}
