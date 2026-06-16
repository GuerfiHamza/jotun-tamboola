import { getLocale } from '@/lib/i18n/locale';
import { getDictionary } from '@/lib/i18n/dictionaries';
import AdminLoginClient from './AdminLoginClient';

export default async function Page() {
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  return <AdminLoginClient locale={locale} dict={dict} />;
}
