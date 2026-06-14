import { NextRequest, NextResponse } from 'next/server';
import { checkCsrf } from '@/lib/csrf';
import { checkRateLimit } from '@/lib/rateLimit';
import FileType from 'file-type';
import { exactHash, findExactDuplicate } from '@/lib/dedup';

/**
 * Pre-flight invoice validation — called by the frontend BEFORE /api/register
 * so a known-duplicate (or invalid) file never results in an orphaned
 * participant. This validates the FILE only; it creates nothing and stores
 * nothing. The authoritative checks still run in /api/upload-invoice.
 */
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const csrfError = checkCsrf(req);
  if (csrfError) return csrfError;

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!checkRateLimit(`check:${ip}`, 20)) {
    return NextResponse.json({ error: 'Trop de tentatives. Réessayez plus tard.' }, { status: 429 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
  }

  const file = formData.get('invoice');
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'Facture requise.' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Fichier trop volumineux (max 10 Mo).' }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: 'Fichier trop volumineux (max 10 Mo).' }, { status: 413 });
  }

  const detected = await FileType.fromBuffer(buffer);
  if (!detected || !ALLOWED_MIME.includes(detected.mime)) {
    return NextResponse.json(
      { error: 'Type de fichier non autorisé. JPG, PNG, WebP ou PDF uniquement.' },
      { status: 415 }
    );
  }

  // #6 Exact-duplicate check — reject BEFORE any participant is created.
  const fileHash = exactHash(buffer);
  const dup = await findExactDuplicate(fileHash);
  if (dup) {
    return NextResponse.json(
      { error: 'Cette facture a déjà été soumise.' },
      { status: 409 }
    );
  }

  return NextResponse.json({ ok: true });
}