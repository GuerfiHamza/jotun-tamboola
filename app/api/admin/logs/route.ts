import { NextResponse } from 'next/server';
import { db } from '@/lib/db/index';
import { auditLogs } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';
import { getAdminFromRequest } from '@/lib/adminAuth';

// GET: master reads the audit trail (most recent first). Master-only — this is
// where the master's own actions are visible too.
export async function GET() {
  const acc = await getAdminFromRequest();
  if (!acc || acc.role !== 'master')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const logs = await db.select().from(auditLogs).orderBy(desc(auditLogs.id)).limit(300);
  return NextResponse.json({ logs });
}
