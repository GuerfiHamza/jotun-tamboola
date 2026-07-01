import { eq } from 'drizzle-orm';
import { db } from './db/index';
import { auditLogs, accounts } from './db/schema';
import type { Account } from './adminAuth';

// Record one mutating action. Never throws — an audit failure must not break
// the action it describes. Pass acc=null for system actions (e.g. background
// auto-approval); the actor name is snapshotted so it survives account deletion.
export async function logAction(acc: Account | null, action: string, detail = ''): Promise<void> {
  try {
    let name: string | null = null;
    if (acc) {
      const [row] = await db.select({ n: accounts.store_name }).from(accounts).where(eq(accounts.id, acc.accountId)).limit(1);
      name = row?.n ?? null;
    }
    await db.insert(auditLogs).values({
      actor_account_id: acc?.accountId ?? null,
      actor_name: name ?? (acc ? null : 'système'),
      actor_role: acc?.role ?? 'system',
      action: action.slice(0, 80),
      detail: detail.slice(0, 255),
    });
  } catch (e) {
    console.error('[audit] failed to record action:', action, e);
  }
}
