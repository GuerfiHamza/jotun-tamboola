import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/index';
import { invoices, participants } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { checkCsrf } from '@/lib/csrf';
import { getAdminFromRequest } from '@/lib/adminAuth';
import { ownsInvoice } from '@/lib/scope';
import { logAction } from '@/lib/audit';

const MAX_AMOUNT = 100_000_000; // sanity cap

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  // SECURITY FIX: this route previously had NO auth check — anyone with a
  // dummy cookie could approve their own invoice. Now verified properly.
  const admin = await getAdminFromRequest();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const csrfError = checkCsrf(req);
  if (csrfError) return csrfError;

  const invoiceId = Number((await params).filename);
  if (!Number.isInteger(invoiceId) || invoiceId <= 0) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }
  if (!await ownsInvoice(admin, invoiceId))
    return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 });

  let amount: unknown;
  try {
    ({ amount } = await req.json() as { amount?: unknown });
  } catch {
    return NextResponse.json({ error: 'Corps invalide' }, { status: 400 });
  }
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0 || amount > MAX_AMOUNT) {
    return NextResponse.json({ error: 'Montant invalide' }, { status: 400 });
  }

  const [invoice] = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
  if (!invoice) return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 });

  const MIN_AMOUNT = Number(process.env.INVOICE_MIN_AMOUNT ?? 20000);
  const accepted = amount >= MIN_AMOUNT;

  await db.update(invoices)
    .set({ amount_detected: amount.toFixed(2), status: accepted ? 'accepted' : 'rejected' })
    .where(eq(invoices.id, invoiceId));

  if (accepted) {
    await db.update(participants)
      .set({ status: 'approved', updated_at: new Date() })
      .where(eq(participants.id, invoice.participant_id));
  }

  await logAction(admin, 'invoice.amount', `facture #${invoiceId}: montant ${amount} → ${accepted ? 'accepted' : 'rejected'}`);
  return NextResponse.json({ success: true, accepted });
}
