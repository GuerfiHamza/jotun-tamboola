import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { getLocale } from '@/lib/i18n/locale';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { getAdminFromRequest } from '@/lib/adminAuth';
import { db } from '@/lib/db/index';
import { accounts } from '@/lib/db/schema';
import AccountsClient from './AccountsClient';

export default async function Page() {
  const acc = await getAdminFromRequest();
  if (!acc) redirect('/admin/login');

  const me = await db.query.accounts.findFirst({ where: eq(accounts.id, acc.accountId) });
  if (!me || me.role !== 'master') redirect('/admin'); // stores have no business here

  const locale = await getLocale();
  const dict = await getDictionary(locale);
  return <AccountsClient locale={locale} dict={dict} />;
}
