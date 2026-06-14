import { db } from '@/lib/db/index';
import { invoices } from '@/lib/db/schema';
import { eq, and, isNull, notLike, or } from 'drizzle-orm';
import { analyzeInvoice } from '@/lib/gemini';
import { readFile } from 'fs/promises';
import { join } from 'path';

const MIME: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg',
  png: 'image/png', webp: 'image/webp', pdf: 'application/pdf',
};

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

  // SECURITY: never auto-approve from a re-analysis either — record the
  // detected amount and leave it 'pending' for an admin decision.
  await db.update(invoices)
    .set({
      amount_detected: result.amount !== null ? result.amount.toFixed(2) : null,
      gemini_response: result.success ? result.raw.slice(0, 60_000) : `retry_failed: ${result.raw.slice(0, 200)}`,
      status: 'pending',
    })
    .where(eq(invoices.id, invoiceId));

  return { amount: result.amount, accepted: false };
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

    // SECURITY: record detected amount only — admin approves manually.
    await db.update(invoices)
      .set({
        amount_detected: result.amount !== null ? result.amount.toFixed(2) : null,
        gemini_response: result.success ? result.raw.slice(0, 60_000) : `retry_failed: ${result.raw.slice(0, 200)}`,
        status: 'pending',
      })
      .where(eq(invoices.id, inv.id));

    results.push({ id: inv.id, amount: result.amount, accepted: false });
  }

  if (results.length) console.log('[reanalyze] processed:', results);
  return results;
}