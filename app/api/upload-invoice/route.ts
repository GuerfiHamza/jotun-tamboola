import { NextRequest, NextResponse, after } from 'next/server';
import { db } from '@/lib/db/index';
import { participants, invoices, accounts } from '@/lib/db/schema';
import { eq, count } from 'drizzle-orm';
import { checkCsrf } from '@/lib/csrf';
import { checkRateLimit } from '@/lib/rateLimit';
import { getAdminFromRequest } from '@/lib/adminAuth';
import { analyzeInvoice } from '@/lib/gemini';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import FileType from 'file-type';
import { randomUUID } from 'crypto';
import {
  exactHash,
  perceptualHash,
  buildContentKey,
  findExactDuplicate,
  findPerceptualDuplicate,
  findContentKeyDuplicate,
} from '@/lib/dedup';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_BYTES = 10 * 1024 * 1024;
const MAX_ATTEMPTS = 3;
const UPLOAD_DIR = join(process.cwd(), 'private_uploads');

export async function POST(req: NextRequest) {
  const acc = await getAdminFromRequest();
  if (!acc) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  if (acc.role !== 'store')
    return NextResponse.json({ error: 'Seuls les comptes magasin peuvent soumettre.' }, { status: 403 });

  const [me] = await db.select({ must: accounts.must_change_password }).from(accounts).where(eq(accounts.id, acc.accountId)).limit(1);
  if (me?.must)
    return NextResponse.json({ error: 'Veuillez d’abord changer votre mot de passe.' }, { status: 403 });

  const csrfError = checkCsrf(req);
  if (csrfError) return csrfError;

  if (!checkRateLimit(`upload:${acc.accountId}`, 30)) {
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

  // This upload attaches to a participant the store created via /api/register;
  // ownership is enforced below.
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

  if (!participant || participant.account_id !== acc.accountId) {
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

  // ── #6 Exact-duplicate detection ──
  const fileHash = exactHash(buffer);
  const exactDup = await findExactDuplicate(fileHash);
  if (exactDup) {
    if (exactDup.participant_id === participantId) {
      // Benign retry: same participant re-uploading the identical file.
      // Don't create a new row; just acknowledge.
      return NextResponse.json({
        success: true,
        accepted: true,
        message: 'Cette facture a déjà été reçue. Notre équipe va la vérifier.',
      });
    }
    // Same file submitted under a DIFFERENT participant -> hard reject.
    return NextResponse.json(
      { error: 'Cette facture a déjà été soumise par un autre participant.' },
      { status: 409 }
    );
  }

  // ── #7 Perceptual hash (null for PDFs) ──
  const pHash = await perceptualHash(buffer, detected.mime);

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
    file_hash: fileHash,
    perceptual_hash: pHash,
    status: 'pending',
    attempt: Number(attemptCount) + 1,
  }).$returningId();

  const invoiceId = inserted.id;

  // #7 Flag near-duplicate images (recompressed / lightly edited copies).
  // Soft signal -> mark for admin review, never reject.
  if (pHash) {
    const pDup = await findPerceptualDuplicate(pHash, invoiceId);
    if (pDup) {
      await db.update(invoices).set({ duplicate_flag: 1 }).where(eq(invoices.id, invoiceId));
      console.log(`[invoice] perceptual duplicate flagged: invoice ${invoiceId} ~ ${pDup.id}`);
    }
  }

  const base64 = buffer.toString('base64');
  const mime = detected.mime;

  // ── Background analysis: runs AFTER the response is sent ──
  // The Gemini retries (10s/15s waits on 429/503) never block the client.
  after(async () => {
    try {
      const result = await analyzeInvoice(base64, mime);

      // #8 Content-key dedup: same physical invoice photographed twice.
      // Soft signal -> flag for admin review, never auto-reject.
      const contentKey = buildContentKey({
        vendor: result.vendor,
        invoice_no: result.invoice_no,
        date: result.date,
        amount: result.amount,
      });
      let flagDuplicate = false;
      if (contentKey) {
        const cDup = await findContentKeyDuplicate(contentKey, invoiceId);
        if (cDup) {
          flagDuplicate = true;
          console.log(`[invoice] content-key duplicate flagged: invoice ${invoiceId} ~ ${cDup.id}`);
        }
      }

      // SECURITY: the attacker fully controls the uploaded image, so a
      // Gemini-read amount must NEVER auto-approve. We only record the
      // detected amount for the admin; status stays 'pending' for manual
      // review. Approval happens solely via the admin amount route.
      await db.update(invoices)
        .set({
          amount_detected: result.amount !== null ? result.amount.toFixed(2) : null,
          gemini_response: result.raw.slice(0, 60_000),
          content_key: contentKey,
          ...(flagDuplicate ? { duplicate_flag: 1 } : {}),
          status: 'pending',
        })
        .where(eq(invoices.id, invoiceId));

      console.log(`[invoice] background analysis done for invoice ${invoiceId}: amount=${result.amount} (pending admin review)`);
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