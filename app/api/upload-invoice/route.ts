import { NextRequest, NextResponse, after } from 'next/server';
import { db } from '@/lib/db/index';
import { participants, invoices } from '@/lib/db/schema';
import { eq, count } from 'drizzle-orm';
import { checkCsrf } from '@/lib/csrf';
import { checkRateLimit } from '@/lib/rateLimit';
import { analyzeInvoice } from '@/lib/gemini';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import FileType from 'file-type';
import { randomUUID } from 'crypto';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_BYTES = 10 * 1024 * 1024;
const MIN_AMOUNT = Number(process.env.INVOICE_MIN_AMOUNT ?? 20000);
const MAX_ATTEMPTS = 3;
const UPLOAD_DIR = join(process.cwd(), 'private_uploads');

export async function POST(req: NextRequest) {
  const csrfError = checkCsrf(req);
  if (csrfError) return csrfError;

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!checkRateLimit(`upload:${ip}`, 10)) {
    return NextResponse.json({ error: 'Trop de tentatives. Réessayez plus tard.' }, { status: 429 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
  }

  const participantIdRaw = formData.get('participantId');
  const file = formData.get('invoice');

  if (!participantIdRaw || !file || !(file instanceof File)) {
    return NextResponse.json({ error: 'participantId et facture sont requis.' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Fichier trop volumineux (max 10 Mo).' }, { status: 413 });
  }

  const participantId = Number(participantIdRaw);
  if (!Number.isInteger(participantId) || participantId <= 0) {
    return NextResponse.json({ error: 'participantId invalide.' }, { status: 400 });
  }

  const [participant] = await db
    .select()
    .from(participants)
    .where(eq(participants.id, participantId))
    .limit(1);

  if (!participant) {
    return NextResponse.json({ error: 'Participant introuvable.' }, { status: 404 });
  }

  const [{ value: attemptCount }] = await db
    .select({ value: count() })
    .from(invoices)
    .where(eq(invoices.participant_id, participantId));

  if (Number(attemptCount) >= MAX_ATTEMPTS) {
    return NextResponse.json({ error: `Nombre maximum de tentatives atteint (${MAX_ATTEMPTS}).` }, { status: 429 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: 'Fichier trop volumineux (max 10 Mo).' }, { status: 413 });
  }

  const detected = await FileType.fromBuffer(buffer);
  if (!detected || !ALLOWED_MIME.includes(detected.mime)) {
    return NextResponse.json({ error: 'Type de fichier non autorisé. JPG, PNG, WebP ou PDF uniquement.' }, { status: 415 });
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  const filename = `${randomUUID()}.${detected.ext}`;
  await writeFile(join(UPLOAD_DIR, filename), buffer, { mode: 0o600 });

  // Save the invoice as 'pending' NOW — the user gets their answer immediately
  const [inserted] = await db.insert(invoices).values({
    participant_id: participantId,
    filename,
    original_name: file.name.slice(0, 255),
    amount_detected: null,
    gemini_response: 'analyzing',
    status: 'pending',
    attempt: Number(attemptCount) + 1,
  }).$returningId();

  const invoiceId = inserted.id;
  const base64 = buffer.toString('base64');
  const mime = detected.mime;

  // ── Background analysis: runs AFTER the response is sent ──
  // The Gemini retries (10s/15s waits on 429/503) never block the client.
  after(async () => {
    try {
      const result = await analyzeInvoice(base64, mime);
      const accepted = result.amount !== null && result.amount >= MIN_AMOUNT;

      await db.update(invoices)
        .set({
          amount_detected: result.amount !== null ? result.amount.toFixed(2) : null,
          gemini_response: result.raw.slice(0, 60_000),
          // accepted -> auto-validated; anything else stays 'pending' for manual review
          status: accepted ? 'accepted' : 'pending',
        })
        .where(eq(invoices.id, invoiceId));

      if (accepted) {
        await db.update(participants)
          .set({ status: 'approved', updated_at: new Date() })
          .where(eq(participants.id, participantId));
      }
      console.log(`[invoice] background analysis done for invoice ${invoiceId}: amount=${result.amount} accepted=${accepted}`);
    } catch (e) {
      console.error(`[invoice] background analysis failed for invoice ${invoiceId}:`, e);
      await db.update(invoices)
        .set({ gemini_response: 'analysis_failed' })
        .where(eq(invoices.id, invoiceId)).catch(() => {});
      // stays 'pending' -> admin reviews it manually, nothing is lost
    }
  });

  // Instant response — no waiting on Gemini
  return NextResponse.json({
    success: true,
    accepted: true, // keeps the green success screen on the frontend
    message: 'Votre facture a bien été reçue. Notre équipe va la vérifier et vous contacter.',
  });
}
