import { db } from '@/lib/db/index';
import { invoices, participants } from '@/lib/db/schema';
import { eq, and, isNull, notLike, or } from 'drizzle-orm';
import { analyzeInvoice } from '@/lib/gemini';
import { logAction } from '@/lib/audit';
import { readFile } from 'fs/promises';
import { join } from 'path';

const MIME: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg',
  png: 'image/png', webp: 'image/webp', pdf: 'application/pdf',
};

// Same auto-approve rule as the upload route: a declared montant matching the
// AI-read amount (rounded to whole DA) approves the invoice and its participant.
function montantMatches(declared: string | null, aiAmount: number | null): boolean {
  if (declared == null || aiAmount == null) return false;
  return Math.round(Number(declared)) === Math.round(aiAmount);
}

// Re-analyze a single invoice (admin "retry" button)
export async function reanalyzeOne(invoiceId: number) {
  const [inv] = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
  if (!inv) return null;

  let buffer: Buffer;
  try {
    buffer = await readFile(join(process.cwd(), 'private_uploads', inv.filename));
  } catch {
    await db.update(invoices).set({ gemini_response: 'file_missing' }).where(eq(invoices.id, invoiceId));
    return null;
  }

  const ext = inv.filename.split('.').pop()!.toLowerCase();
  const result = await analyzeInvoice(buffer.toString('base64'), MIME[ext] ?? 'image/jpeg');

  // Auto-approve only when a declared montant matches the AI amount; otherwise
  // record the detected amount and leave it 'pending' for an admin decision.
  const autoApprove = montantMatches(inv.declared_amount, result.amount);
  await db.update(invoices)
    .set({
      amount_detected: result.amount !== null ? result.amount.toFixed(2) : null,
      gemini_response: result.success ? result.raw.slice(0, 60_000) : `retry_failed: ${result.raw.slice(0, 200)}`,
      status: autoApprove ? 'accepted' : 'pending',
    })
    .where(eq(invoices.id, invoiceId));

  if (autoApprove) {
    await db.update(participants).set({ status: 'approved', updated_at: new Date() }).where(eq(participants.id, inv.participant_id));
    await logAction(null, 'invoice.auto_approve', `facture #${invoiceId} (retry): montant déclaré ${inv.declared_amount} = IA ${result.amount}`);
  }

  return { amount: result.amount, accepted: autoApprove };
}

// Re-analyzes invoices whose background analysis never succeeded
// (quota exhausted, server restarted mid-analysis, Gemini down...)
export async function reanalyzeStuck(batch = 3) {
  const stuck = await db
    .select()
    .from(invoices)
    .where(and(
      eq(invoices.status, 'pending'),
      isNull(invoices.amount_detected),
      // Anything that is NOT a successful JSON answer (those start with '{'):
      // 'analyzing', 'analysis_failed', 'gemini_error_429', 'retry_failed: ...', null...
      or(isNull(invoices.gemini_response), notLike(invoices.gemini_response, '{%'))
    ))
    .limit(batch);

  const results: { id: number; amount: number | null; accepted: boolean }[] = [];

  for (const inv of stuck) {
    let buffer: Buffer;
    try {
      buffer = await readFile(join(process.cwd(), 'private_uploads', inv.filename));
    } catch {
      await db.update(invoices).set({ gemini_response: 'file_missing' }).where(eq(invoices.id, inv.id));
      continue;
    }

    const ext = inv.filename.split('.').pop()!.toLowerCase();
    const result = await analyzeInvoice(buffer.toString('base64'), MIME[ext] ?? 'image/jpeg');

    const autoApprove = montantMatches(inv.declared_amount, result.amount);
    await db.update(invoices)
      .set({
        amount_detected: result.amount !== null ? result.amount.toFixed(2) : null,
        gemini_response: result.success ? result.raw.slice(0, 60_000) : `retry_failed: ${result.raw.slice(0, 200)}`,
        status: autoApprove ? 'accepted' : 'pending',
      })
      .where(eq(invoices.id, inv.id));

    if (autoApprove) {
      await db.update(participants).set({ status: 'approved', updated_at: new Date() }).where(eq(participants.id, inv.participant_id));
      await logAction(null, 'invoice.auto_approve', `facture #${inv.id} (reanalyze): montant déclaré ${inv.declared_amount} = IA ${result.amount}`);
    }

    results.push({ id: inv.id, amount: result.amount, accepted: autoApprove });
  }

  if (results.length) console.log('[reanalyze] processed:', results);
  return results;
}