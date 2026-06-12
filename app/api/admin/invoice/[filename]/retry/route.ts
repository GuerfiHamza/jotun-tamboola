import { NextRequest, NextResponse, after } from 'next/server';
import { db } from '@/lib/db/index';
import { invoices } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getAdminFromRequest } from '@/lib/adminAuth';
import { checkCsrf } from '@/lib/csrf';
import { reanalyzeOne } from '@/lib/reanalyze';

// POST /api/admin/invoice/[id]/retry — relaunch automatic analysis
export async function POST(
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

  const [inv] = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
  if (!inv) return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 });

  // Mark as analyzing (hides the "À vérifier" badge) and run in background —
  // the retry ladder can take minutes, the admin shouldn't wait on it.
  await db.update(invoices).set({ gemini_response: 'analyzing' }).where(eq(invoices.id, invoiceId));
  after(async () => {
    try { await reanalyzeOne(invoiceId); }
    catch (e) { console.error(`[retry] invoice ${invoiceId} failed:`, e); }
  });

  return NextResponse.json({ success: true, message: 'Analyse relancée — résultat dans quelques minutes.' });
}
