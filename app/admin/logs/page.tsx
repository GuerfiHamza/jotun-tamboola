import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { getLocale } from '@/lib/i18n/locale';
import { getAdminFromRequest } from '@/lib/adminAuth';
import { db } from '@/lib/db/index';
import { accounts } from '@/lib/db/schema';
import LogsClient from './LogsClient';

export default async function Page() {
  const acc = await getAdminFromRequest();
  if (!acc) redirect('/admin/login');

  const me = await db.query.accounts.findFirst({ where: eq(accounts.id, acc.accountId) });
  if (!me || me.role !== 'master') redirect('/admin'); // audit trail is master-only

  const locale = await getLocale();
  return <LogsClient locale={locale} />;
}
