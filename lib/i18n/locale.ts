import 'server-only';
import { cookies } from 'next/headers';

export type Locale = 'fr' | 'ar';

export const LOCALES: Locale[] = ['fr', 'ar'];
export const DEFAULT_LOCALE: Locale = 'ar';
export const LOCALE_COOKIE = 'lang';

export function isLocale(value: string): value is Locale {
  return (LOCALES as string[]).includes(value);
}

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const value = cookieStore.get(LOCALE_COOKIE)?.value;
  return value && isLocale(value) ? value : DEFAULT_LOCALE;
}
