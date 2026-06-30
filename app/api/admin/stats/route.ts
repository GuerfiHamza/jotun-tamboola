import { NextResponse } from 'next/server';
import { db } from '@/lib/db/index';
import { participants, invoices } from '@/lib/db/schema';
import { count, avg, sql, eq } from 'drizzle-orm';
import { getAdminFromRequest } from '@/lib/adminAuth';
import { participantScope } from '@/lib/scope';

export async function GET() {
  const acc = await getAdminFromRequest();
  if (!acc)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const scope = participantScope(acc);

  const [participantStats] = await db
    .select({
      total:    count(),
      painters: sql<number>`SUM(${participants.is_painter})`,
      approved: sql<number>`SUM(CASE WHEN ${participants.status} = 'approved' THEN 1 ELSE 0 END)`,
      pending:  sql<number>`SUM(CASE WHEN ${participants.status} = 'pending'  THEN 1 ELSE 0 END)`,
      rejected: sql<number>`SUM(CASE WHEN ${participants.status} = 'rejected' THEN 1 ELSE 0 END)`,
    })
    .from(participants)
    .where(scope);

  // Invoices joined through participants so the per-store scope applies.
  const [invoiceStats] = await db
    .select({
      total:      count(invoices.id),
      accepted:   sql<number>`SUM(CASE WHEN ${invoices.status} = 'accepted' THEN 1 ELSE 0 END)`,
      // Analysis finished but not auto-validated -> needs a human
      needs_attention: sql<number>`SUM(CASE WHEN ${invoices.status} = 'pending' AND ${invoices.gemini_response} <> 'analyzing' THEN 1 ELSE 0 END)`,
      avg_amount: avg(invoices.amount_detected),
    })
    .from(invoices)
    .innerJoin(participants, eq(participants.id, invoices.participant_id))
    .where(scope);

  return NextResponse.json({ participants: participantStats, invoices: invoiceStats });
}