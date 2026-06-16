import { getLocale } from '@/lib/i18n/locale';
import { getDictionary } from '@/lib/i18n/dictionaries';
import AdminDashboardClient from './AdminDashboardClient';

export default async function Page() {
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  return <AdminDashboardClient locale={locale} dict={dict} />;
}
