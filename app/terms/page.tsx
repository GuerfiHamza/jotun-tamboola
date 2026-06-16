import { getLocale } from '@/lib/i18n/locale';
import { getDictionary } from '@/lib/i18n/dictionaries';
import Link from 'next/link';

export default async function TermsPage() {
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const t = dict.terms;
  const isRtl = locale === 'ar';

  const sections: { title: string; body: string }[] = t.sections;

  return (
    <main
      className="min-h-screen px-6 py-20"
      style={{ background: '#f3f3fa', color: '#0d0d1a', fontFamily: 'var(--font-geist-sans, Arial)' }}
    >
      <div className="max-w-2xl mx-auto">

        {/* Back */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-blue-500 hover:text-blue-400 mb-10 transition-colors"
        >
          {isRtl ? '→' : '←'} {t.backToSite}
        </Link>

        {/* Header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-white text-sm"
              style={{ background: 'linear-gradient(135deg,#0d2a94,#072060)' }}>J</div>
            <span className="text-xs font-bold tracking-[0.2em] uppercase text-blue-500">Jotun Tamboola</span>
          </div>
          <h1 className="text-4xl font-black mb-3" style={{ color: '#0d0d1a' }}>{t.title}</h1>
          <p className="text-sm" style={{ color: 'rgba(0,0,0,0.45)' }}>{t.lastUpdated}</p>
        </div>

        <div className="h-px mb-10" style={{ background: 'linear-gradient(90deg,rgba(13,42,148,0.3),transparent)' }} />

        {/* Sections */}
        <div className="space-y-8">
          {sections.map((s, i) => (
            <section key={i}>
              <h2 className="text-base font-bold mb-2" style={{ color: '#0d0d1a' }}>
                {String(i + 1).padStart(2, '0')}. {s.title}
              </h2>
              <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'rgba(0,0,0,0.6)' }}>
                {s.body}
              </p>
            </section>
          ))}
        </div>

        <div className="h-px mt-12 mb-8" style={{ background: 'rgba(0,0,0,0.08)' }} />

        <p className="text-xs text-center" style={{ color: 'rgba(0,0,0,0.35)' }}>
          © {new Date().getFullYear()} Jotun Algérie
        </p>
      </div>
    </main>
  );
}
