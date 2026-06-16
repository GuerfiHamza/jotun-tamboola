import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/index';
import { invoices, participants } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { checkCsrf } from '@/lib/csrf';
import { getAdminFromRequest } from '@/lib/adminAuth';

type InvoiceStatus = 'accepted' | 'rejected';

// PATCH /api/admin/invoice/[id]/status — manual per-invoice accept/reject,
// independent of the auto-detected amount.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  if (!await getAdminFromRequest())
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const csrfError = checkCsrf(req);
  if (csrfError) return csrfError;

  const invoiceId = Number((await params).filename);
  if (!Number.isInteger(invoiceId) || invoiceId <= 0)
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  let status: unknown;
  try {
    ({ status } = await req.json() as { status?: unknown });
  } catch {
    return NextResponse.json({ error: 'Corps invalide' }, { status: 400 });
  }
  if (status !== 'accepted' && status !== 'rejected')
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });

  const [invoice] = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
  if (!invoice) return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 });

  await db.update(invoices).set({ status: status as InvoiceStatus }).where(eq(invoices.id, invoiceId));

  if (status === 'accepted') {
    await db.update(participants)
      .set({ status: 'approved', updated_at: new Date() })
      .where(eq(participants.id, invoice.participant_id));
  }

  return NextResponse.json({ success: true });
}
