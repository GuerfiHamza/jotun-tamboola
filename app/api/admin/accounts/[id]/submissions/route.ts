import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/index';
import { participants, invoices } from '@/lib/db/schema';
import { eq, count, desc, sql } from 'drizzle-orm';
import { getAdminFromRequest } from '@/lib/adminAuth';

// GET: master lists all submissions (participants) for one store account.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const acc = await getAdminFromRequest();
  if (!acc || acc.role !== 'master')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0)
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  const submissions = await db
    .select({
      id:                participants.id,
      full_name:         participants.full_name,
      commercial_nom:    participants.commercial_nom,
      commercial_prenom: participants.commercial_prenom,
      phone:             participants.phone,
      wilaya:         participants.wilaya,
      is_painter:     participants.is_painter,
      status:         participants.status,
      created_at:     participants.created_at,
      invoice_count:  count(invoices.id),
      accepted_count: sql<number>`SUM(CASE WHEN ${invoices.status} = 'accepted' THEN 1 ELSE 0 END)`,
    })
    .from(participants)
    .leftJoin(invoices, eq(invoices.participant_id, participants.id))
    .where(eq(participants.account_id, id))
    .groupBy(participants.id)
    .orderBy(desc(participants.created_at));

  return NextResponse.json({ submissions });
}
