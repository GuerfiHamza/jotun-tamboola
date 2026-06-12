import { db } from '@/lib/db/index';
import { participants, invoices } from '@/lib/db/schema';
import { eq, like, or, count, max, desc, and, SQL } from 'drizzle-orm';

export const EXPORT_HEADER = ['ID', 'Nom complet', 'Téléphone', 'Wilaya', 'Peintre', 'Statut', 'Factures', 'Meilleure facture (DA)', 'Date inscription'];

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
    })
    .from(participants)
    .leftJoin(invoices, eq(invoices.participant_id, participants.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(participants.id)
    .orderBy(desc(participants.created_at));

  return rows.map(r => [
    r.id,
    r.full_name,
    r.phone,
    r.wilaya,
    r.is_painter ? 'Oui' : 'Non',
    r.status,
    Number(r.invoice_count),
    r.best_invoice ? Number(r.best_invoice) : '',
    r.created_at ? new Date(r.created_at).toLocaleString('fr-DZ') : '',
  ]);
}
