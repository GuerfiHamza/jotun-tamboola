import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/index';
import { participants, invoices } from '@/lib/db/schema';
import { eq, like, or, count, max, desc, and, sql, SQL } from 'drizzle-orm';
import { getAdminFromRequest } from '@/lib/adminAuth';

export async function GET(req: NextRequest) {
  if (!await getAdminFromRequest())
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page         = parseInt(searchParams.get('page') || '1');
  const search       = searchParams.get('search') || '';
  const statusFilter = searchParams.get('status') || '';
  const limit        = 20;
  const offset       = (page - 1) * limit;

  const conditions: SQL[] = [];
  if (search) {
    // Escape LIKE wildcards so user input is matched literally
    const safe = search.slice(0, 100).replace(/[\\%_]/g, m => `\\${m}`);
    conditions.push(or(
      like(participants.full_name, `%${safe}%`),
      like(participants.phone, `%${safe}%`)
    ) as SQL);
  }
  if (statusFilter && ['pending', 'approved', 'rejected'].includes(statusFilter)) {
    conditions.push(eq(participants.status, statusFilter as 'pending' | 'approved' | 'rejected'));
  }

  const where: SQL | undefined = conditions.length > 0 ? and(...conditions) : undefined;

  const [{ total }] = await db
    .select({ total: count() })
    .from(participants)
    .where(where);

  const rows = await db
    .select({
      id:            participants.id,
      full_name:     participants.full_name,
      phone:         participants.phone,
      wilaya:        participants.wilaya,
      is_painter:    participants.is_painter,
      status:        participants.status,
      created_at:    participants.created_at,
      invoice_count: count(invoices.id),
      best_invoice:  max(invoices.amount_detected),
      needs_attention: sql<number>`SUM(CASE WHEN ${invoices.status} = 'pending' AND ${invoices.gemini_response} <> 'analyzing' THEN 1 ELSE 0 END)`,
    })
    .from(participants)
    .leftJoin(invoices, eq(invoices.participant_id, participants.id))
    .where(where)
    .groupBy(participants.id)
    .orderBy(desc(participants.created_at))
    .limit(limit)
    .offset(offset);

  return NextResponse.json({ participants: rows, total, pages: Math.ceil(total / limit), page });
}