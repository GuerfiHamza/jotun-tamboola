import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { getLocale } from '@/lib/i18n/locale';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { getAdminFromRequest } from '@/lib/adminAuth';
import { db } from '@/lib/db/index';
import { accounts } from '@/lib/db/schema';
import ChangePasswordClient from './ChangePasswordClient';

export default async function Page() {
  const acc = await getAdminFromRequest();
  if (!acc) redirect('/admin/login');

  const me = await db.query.accounts.findFirst({ where: eq(accounts.id, acc.accountId) });
  if (!me) redirect('/admin/login');

  const locale = await getLocale();
  const dict = await getDictionary(locale);
  return <ChangePasswordClient locale={locale} dict={dict} forced={!!me.must_change_password} storeName={me.store_name} />;
}
