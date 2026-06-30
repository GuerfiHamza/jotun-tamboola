import { eq, SQL } from 'drizzle-orm';
import { db } from './db/index';
import { participants, invoices } from './db/schema';
import type { Account } from './adminAuth';

// Store accounts only ever see/touch their own submissions; master sees all.
// Returns a WHERE fragment on participants, or undefined for master (no filter).
export function participantScope(acc: Account): SQL | undefined {
  return acc.role === 'master' ? undefined : eq(participants.account_id, acc.accountId);
}

// True if the account may act on this participant id.
export async function ownsParticipant(acc: Account, participantId: number): Promise<boolean> {
  if (acc.role === 'master') return true;
  const [p] = await db.select({ account_id: participants.account_id })
    .from(participants).where(eq(participants.id, participantId)).limit(1);
  return !!p && p.account_id === acc.accountId;
}

// True if the account may act on this invoice (by its numeric id).
export async function ownsInvoice(acc: Account, invoiceId: number): Promise<boolean> {
  if (acc.role === 'master') return true;
  const [row] = await db.select({ account_id: participants.account_id })
    .from(invoices)
    .innerJoin(participants, eq(participants.id, invoices.participant_id))
    .where(eq(invoices.id, invoiceId)).limit(1);
  return !!row && row.account_id === acc.accountId;
}

// True if the account may view this stored invoice file (by filename).
export async function ownsInvoiceFile(acc: Account, filename: string): Promise<boolean> {
  if (acc.role === 'master') return true;
  const [row] = await db.select({ account_id: participants.account_id })
    .from(invoices)
    .innerJoin(participants, eq(participants.id, invoices.participant_id))
    .where(eq(invoices.filename, filename)).limit(1);
  return !!row && row.account_id === acc.accountId;
}
