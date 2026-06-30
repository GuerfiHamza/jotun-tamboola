import { NextResponse } from 'next/server';
import { db } from '@/lib/db/index';
import { accounts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getAdminFromRequest } from '@/lib/adminAuth';

// Tells the dashboard which UI to show (master vs store) and the store name.
export async function GET() {
  const acc = await getAdminFromRequest();
  if (!acc) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const row = await db.query.accounts.findFirst({ where: eq(accounts.id, acc.accountId) });
  if (!row) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  return NextResponse.json({ role: row.role, store_name: row.store_name, must_change_password: !!row.must_change_password });
}
