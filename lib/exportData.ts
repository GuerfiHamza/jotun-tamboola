import { db } from '@/lib/db/index';
import { participants, invoices } from '@/lib/db/schema';
import { eq, like, or, count, desc, and, sql, inArray, SQL } from 'drizzle-orm';

export const EXPORT_HEADER = ['ID', 'Nom complet', 'Téléphone', 'Magasin', 'Peintre', 'Statut', 'Factures', 'Total accepté (DA)', 'Date inscription'];

export type ExportRow = (string | number)[];

export async function getExportRows(search: string, statusFilter: string): Promise<ExportRow[]> {
  const conditions: SQL[] = [];
  if (search) {
    const safe = search.slice(0, 100).replace(/[\\%_]/g, m => `\\${m}`);
    conditions.push(or(
      like(participants.full_name, `%${safe}%`),
      like(participants.phone, `%${safe}%`)
    ) as SQL);
  }
  if (statusFilter && ['pending', 'approved', 'rejected'].includes(statusFilter)) {
    conditions.push(eq(participants.status, statusFilter as 'pending' | 'approved' | 'rejected'));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const groups = await db
    .select({
      phone:         participants.phone,
      invoice_count: count(invoices.id),
      total_amount:  sql<string>`SUM(CASE WHEN ${invoices.status} = 'accepted' THEN ${invoices.amount_detected} ELSE 0 END)`,
      last_created:  sql<string>`MAX(${participants.created_at})`,
    })
    .from(participants)
    .leftJoin(invoices, eq(invoices.participant_id, participants.id))
    .where(where)
    .groupBy(participants.phone)
    .orderBy(desc(sql`MAX(${participants.created_at})`));

  const phones = groups.map(g => g.phone);
  const subsByPhone = new Map<string, (typeof participants.$inferSelect)[]>();
  if (phones.length > 0) {
    const subs = await db.select().from(participants).where(inArray(participants.phone, phones)).orderBy(desc(participants.created_at));
    for (const s of subs) subsByPhone.set(s.phone, [...(subsByPhone.get(s.phone) ?? []), s]);
  }

  // Same "approved wins" rule as the dashboard's grouped row status.
  function groupStatus(phone: string): 'pending' | 'approved' | 'rejected' {
    const subs = subsByPhone.get(phone) ?? [];
    if (subs.some(s => s.status === 'approved')) return 'approved';
    if (subs.some(s => s.status === 'pending'))  return 'pending';
    return 'rejected';
  }

  return groups.map(g => {
    const rep = subsByPhone.get(g.phone)![0]; // most recent submission represents name/wilaya/painter
    return [
      rep.id,
      rep.full_name,
      g.phone,
      rep.wilaya,
      rep.is_painter ? 'Oui' : 'Non',
      groupStatus(g.phone),
      Number(g.invoice_count),
      Number(g.total_amount) || '',
      g.last_created ? new Date(g.last_created).toLocaleString('fr-DZ') : '',
    ];
  });
}
