import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/index';
import { participants, invoices } from '@/lib/db/schema';
import { eq, like, or, count, max, desc, and, sql, inArray, SQL } from 'drizzle-orm';
import { getAdminFromRequest } from '@/lib/adminAuth';
import { participantScope } from '@/lib/scope';

export async function GET(req: NextRequest) {
  const acc = await getAdminFromRequest();
  if (!acc)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page         = parseInt(searchParams.get('page') || '1');
  const search       = searchParams.get('search') || '';
  const statusFilter = searchParams.get('status') || '';
  const limit        = 20;
  const offset       = (page - 1) * limit;

  const conditions: SQL[] = [];
  const scope = participantScope(acc);
  if (scope) conditions.push(scope);
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

  // One row per phone number now (a phone can have several registrations) —
  // count distinct phones for pagination.
  const [{ total }] = await db
    .select({ total: sql<number>`COUNT(DISTINCT ${participants.phone})` })
    .from(participants)
    .where(where);

  const groups = await db
    .select({
      phone:            participants.phone,
      submission_count: sql<number>`COUNT(DISTINCT ${participants.id})`,
      invoice_count:    count(invoices.id),
      best_invoice:     max(invoices.amount_detected),
      accepted_count:   sql<number>`SUM(CASE WHEN ${invoices.status} = 'accepted' THEN 1 ELSE 0 END)`,
      rejected_count:   sql<number>`SUM(CASE WHEN ${invoices.status} = 'rejected' THEN 1 ELSE 0 END)`,
      total_amount:     sql<string>`SUM(CASE WHEN ${invoices.status} = 'accepted' THEN ${invoices.amount_detected} ELSE 0 END)`,
      needs_attention:  sql<number>`SUM(CASE WHEN ${invoices.status} = 'pending' AND ${invoices.gemini_response} <> 'analyzing' THEN 1 ELSE 0 END)`,
      last_created:     sql<string>`MAX(${participants.created_at})`,
    })
    .from(participants)
    .leftJoin(invoices, eq(invoices.participant_id, participants.id))
    .where(where)
    .groupBy(participants.phone)
    .orderBy(desc(sql`MAX(${participants.created_at})`))
    .limit(limit)
    .offset(offset);

  // Pull the most recent registration per phone to represent the group
  // (name / wilaya / painter flag / status shown in the table).
  const phones = groups.map(g => g.phone);
  const latestByPhone = new Map<string, typeof participants.$inferSelect>();
  const allByPhone = new Map<string, (typeof participants.$inferSelect)[]>();
  if (phones.length > 0) {
    const reps = await db
      .select()
      .from(participants)
      .where(scope ? and(inArray(participants.phone, phones), scope) : inArray(participants.phone, phones))
      .orderBy(desc(participants.created_at));
    for (const r of reps) {
      if (!latestByPhone.has(r.phone)) latestByPhone.set(r.phone, r);
      allByPhone.set(r.phone, [...(allByPhone.get(r.phone) ?? []), r]);
    }
  }

  // Group status: one approved submission is enough to call the whole phone
  // approved, even if a later/other submission was rejected.
  function groupStatus(phone: string): 'pending' | 'approved' | 'rejected' {
    const subs = allByPhone.get(phone) ?? [];
    if (subs.some(s => s.status === 'approved')) return 'approved';
    if (subs.some(s => s.status === 'pending'))  return 'pending';
    return 'rejected';
  }

  const result = groups.map(g => {
    const rep = latestByPhone.get(g.phone)!;
    return {
      id:                rep.id,
      full_name:         rep.full_name,
      phone:             g.phone,
      wilaya:            rep.wilaya,
      is_painter:        rep.is_painter,
      status:            groupStatus(g.phone),
      created_at:        rep.created_at,
      invoice_count:     g.invoice_count,
      best_invoice:      g.best_invoice,
      accepted_count:    g.accepted_count,
      rejected_count:    g.rejected_count,
      total_amount:      g.total_amount,
      needs_attention:   g.needs_attention,
      submission_count:  g.submission_count,
    };
  });

  return NextResponse.json({ participants: result, total, pages: Math.ceil(total / limit), page });
}
