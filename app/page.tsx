import { getLocale } from '@/lib/i18n/locale';
import { getDictionary } from '@/lib/i18n/dictionaries';
import LandingClient from './LandingClient';

export default async function Page() {
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  return <LandingClient locale={locale} dict={dict} />;
}
