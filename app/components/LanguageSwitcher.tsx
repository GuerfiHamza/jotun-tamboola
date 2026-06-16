'use client';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { setLocale } from '@/lib/i18n/actions';
import type { Locale } from '@/lib/i18n/locale';

export default function LanguageSwitcher({ locale, dark = true }: { locale: Locale; dark?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(next: Locale) {
    if (next === locale || pending) return;
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  const borderColor = dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const inactiveColor = dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';

  return (
    <div
      className="flex items-center rounded-xl overflow-hidden text-xs font-bold flex-shrink-0"
      style={{ border: `1px solid ${borderColor}`, opacity: pending ? 0.6 : 1 }}
      aria-label="Language"
    >
      <button
        type="button"
        onClick={() => choose('fr')}
        disabled={pending}
        className="px-2.5 py-1.5 transition-colors"
        style={{ background: locale === 'fr' ? 'rgba(13,42,148,0.18)' : 'transparent', color: locale === 'fr' ? '#60a5fa' : inactiveColor }}
      >
        FR
      </button>
      <button
        type="button"
        onClick={() => choose('ar')}
        disabled={pending}
        className="px-2.5 py-1.5 transition-colors"
        style={{ background: locale === 'ar' ? 'rgba(13,42,148,0.18)' : 'transparent', color: locale === 'ar' ? '#60a5fa' : inactiveColor }}
      >
        AR
      </button>
    </div>
  );
}
