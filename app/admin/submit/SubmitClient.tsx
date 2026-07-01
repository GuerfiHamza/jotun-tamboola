'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import type { Locale } from '@/lib/i18n/locale';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { getTheme, ThemeToggle, ADMIN_THEME_KEY } from '@/lib/adminTheme';

type Form = {
  commercial_nom: string; commercial_prenom: string;
  nom: string; prenom: string; phone: string;
  is_painter: boolean; montant: string; consent: boolean; invoice: File | null;
};
const EMPTY: Form = {
  commercial_nom: '', commercial_prenom: '',
  nom: '', prenom: '', phone: '',
  is_painter: false, montant: '', consent: false, invoice: null,
};
const MAX_BYTES = 10 * 1024 * 1024; // keep in sync with the upload route

export default function SubmitClient({ locale, dict, storeName }: { locale: Locale; dict: Dictionary; storeName: string }) {
  const router = useRouter();
  const t = dict.landing.form; // reuse field labels from the old public form
  const [form, setForm] = useState<Form>(EMPTY);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [dark, setDark] = useState(false);
  const th = getTheme(dark);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDark(localStorage.getItem(ADMIN_THEME_KEY) === 'dark');
  }, []);

  useEffect(() => { localStorage.setItem(ADMIN_THEME_KEY, dark ? 'dark' : 'light'); }, [dark]);

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST', headers: { 'x-requested-with': 'XMLHttpRequest' } });
    router.push('/admin/login');
  }

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm(f => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.commercial_nom.trim() || !form.commercial_prenom.trim()) { setError('Nom et prénom du commercial sont requis.'); return; }
    if (!form.nom.trim() || !form.prenom.trim() || !form.phone.trim()) { setError('Nom, prénom et téléphone du client sont requis.'); return; }
    if (!form.montant.trim() || Number(form.montant) <= 0) { setError('Le montant de la facture est requis.'); return; }
    if (!form.consent) { setError('Veuillez accepter les conditions de participation.'); return; }
    if (!form.invoice) { setError('La facture est requise.'); return; }
    if (form.invoice.size > MAX_BYTES) {
      setError(`Facture trop volumineuse (${(form.invoice.size / 1024 / 1024).toFixed(1)} Mo). Maximum 10 Mo — compressez l’image ou reprenez la photo.`);
      return;
    }

    setLoading(true);
    try {
      const reg = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-requested-with': 'XMLHttpRequest' },
        body: JSON.stringify({
          commercial_nom: form.commercial_nom.trim(), commercial_prenom: form.commercial_prenom.trim(),
          nom: form.nom.trim(), prenom: form.prenom.trim(), phone: form.phone.trim(), is_painter: form.is_painter,
        }),
      });
      const regData = await reg.json() as { error?: string; participantId?: number };
      if (!reg.ok || !regData.participantId) { setError(regData.error ?? 'Erreur lors de l’enregistrement.'); return; }

      const fd = new FormData();
      fd.append('invoice', form.invoice);
      fd.append('participantId', String(regData.participantId));
      if (form.montant.trim()) fd.append('montant', form.montant.trim());
      const up = await fetch('/api/upload-invoice', { method: 'POST', headers: { 'x-requested-with': 'XMLHttpRequest' }, body: fd });
      // A 413 from the platform/proxy returns HTML, not JSON — handle it explicitly
      // so it isn't swallowed as a generic network error.
      if (up.status === 413) { setError('Facture trop volumineuse (max 10 Mo). Compressez l’image ou reprenez la photo.'); return; }
      const upData = await up.json().catch(() => ({})) as { error?: string; message?: string };
      if (!up.ok) { setError(upData.error ?? 'Erreur lors de l’envoi de la facture.'); return; }

      setDone(upData.message ?? 'Soumission reçue.');
      setForm(EMPTY);
    } catch {
      setError('Erreur réseau. Réessayez.');
    } finally { setLoading(false); }
  }

  return (
    <main className="min-h-screen" style={{ background: th.page, color: th.text }}>
      <header className="sticky top-0 z-40 px-4 sm:px-6 py-3.5 flex items-center gap-3 flex-wrap"
        style={{ background: th.headerBg, backdropFilter: 'blur(20px)', borderBottom: `1px solid ${th.border}` }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-white text-xs" style={{ background: 'linear-gradient(135deg,#0d2a94,#072060)' }}>J</div>
          <h1 className="font-black text-sm" style={{ color: th.text }}>Nouvelle soumission</h1>
        </div>

        <div className="ms-auto flex items-center gap-2 sm:gap-3">
          <span className="text-xs font-semibold hidden sm:inline" style={{ color: th.muted }}>{storeName}</span>
          <ThemeToggle dark={dark} onToggle={() => setDark(d => !d)} dict={dict} />
          <LanguageSwitcher locale={locale} dark={dark} />
          <button onClick={logout}
            className="flex items-center gap-1.5 text-xs hover:text-blue-400 transition-colors px-3 py-1.5 rounded-lg"
            style={{ border: `1px solid ${th.border}`, color: th.muted }}>
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M10 11l3-3-3-3M13 8H6"/>
            </svg>
            <span className="hidden sm:inline">{dict.admin.dashboard.logout}</span>
          </button>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 sm:px-6 py-8">
        {done ? (
          <div className="rounded-2xl text-center p-8" style={{ border: '1px solid rgba(16,185,129,0.25)', background: 'rgba(16,185,129,0.05)' }}>
            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.12)' }}>
              <svg viewBox="0 0 24 24" className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm" style={{ color: th.sub }}>{done}</p>
            <button onClick={() => setDone(null)} className="mt-6 text-sm font-semibold text-blue-400">Nouvelle soumission</button>
          </div>
        ) : (
          <form onSubmit={submit} className="rounded-2xl p-6 space-y-6" style={{ background: th.panel, border: `1px solid ${th.border}` }}>
            {error && <div className="rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171' }}>{error}</div>}

            {/* Commercial (the salesperson filling the form) */}
            <section className="space-y-4">
              <SectionTitle th={th}>Commercial</SectionTitle>
              <div className="grid grid-cols-2 gap-4">
                <Input label={`${t.nom.label} *`} value={form.commercial_nom} onChange={v => set('commercial_nom', v)} placeholder={t.nom.placeholder} th={th} />
                <Input label={`${t.prenom.label} *`} value={form.commercial_prenom} onChange={v => set('commercial_prenom', v)} placeholder={t.prenom.placeholder} th={th} />
              </div>
            </section>

            {/* Client */}
            <section className="space-y-4">
              <SectionTitle th={th}>Client</SectionTitle>
              <div className="grid grid-cols-2 gap-4">
                <Input label={`${t.nom.label} *`} value={form.nom} onChange={v => set('nom', v)} placeholder={t.nom.placeholder} th={th} />
                <Input label={`${t.prenom.label} *`} value={form.prenom} onChange={v => set('prenom', v)} placeholder={t.prenom.placeholder} th={th} />
              </div>
              <Input label={`${t.phone.label} *`} value={form.phone} onChange={v => set('phone', v)} placeholder={t.phone.placeholder} th={th} type="tel" />

              <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl" style={{ border: `1px solid ${th.border}` }}>
                <span className="text-sm font-semibold" style={{ color: th.sub }}>{t.profession.isPainter}</span>
                <div className="flex gap-2">
                  <button type="button" onClick={() => set('is_painter', true)} aria-pressed={form.is_painter}
                    className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all"
                    style={form.is_painter
                      ? { background: '#22c55e', color: '#fff' }
                      : { background: th.input, color: th.muted, border: `1px solid ${th.border}` }}>
                    {t.profession.yes}
                  </button>
                  <button type="button" onClick={() => set('is_painter', false)} aria-pressed={!form.is_painter}
                    className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all"
                    style={!form.is_painter
                      ? { background: '#ef4444', color: '#fff' }
                      : { background: th.input, color: th.muted, border: `1px solid ${th.border}` }}>
                    {t.profession.no}
                  </button>
                </div>
              </div>

              <Input label="Montant de la facture (DA) *" value={form.montant}
                onChange={v => set('montant', v.replace(/[^\d.]/g, ''))} placeholder="15000" th={th} type="text" />
            </section>

            {/* Facture + photo tips */}
            <section className="space-y-3">
              <label className="flex flex-col items-center justify-center gap-2 w-full border-2 border-dashed rounded-xl px-4 py-7 cursor-pointer"
                style={{ borderColor: form.invoice ? 'rgba(16,185,129,0.4)' : th.border, background: form.invoice ? 'rgba(16,185,129,0.04)' : th.input }}>
                <input type="file" accept="image/*,application/pdf" className="hidden" onChange={e => set('invoice', e.target.files?.[0] ?? null)} />
                <span className="text-sm font-semibold" style={{ color: form.invoice ? '#34d399' : th.muted }}>
                  {form.invoice ? form.invoice.name : `${t.invoice.label} *`}
                </span>
                <span className="text-xs" style={{ color: th.faint }}>{form.invoice ? t.invoice.changeHint : t.invoice.dropHint}</span>
              </label>

              <div className="rounded-xl px-4 py-3 text-xs" style={{ background: th.input, border: `1px solid ${th.border}` }}>
                <p className="font-bold mb-1.5" style={{ color: th.sub }}>{t.invoice.photoTips.title}</p>
                <ul className="space-y-1" style={{ color: th.muted }}>
                  <li>✅ {t.invoice.photoTips.good}</li>
                  <li>❌ {t.invoice.photoTips.dark}</li>
                  <li>❌ {t.invoice.photoTips.cut}</li>
                  <li>❌ {t.invoice.photoTips.rotated}</li>
                </ul>
              </div>
            </section>

            {/* Consent — gates the submit button */}
            <label className="flex items-start gap-2.5 text-sm cursor-pointer" style={{ color: th.sub }}>
              <input type="checkbox" checked={form.consent} onChange={e => set('consent', e.target.checked)} className="mt-0.5" />
              <span>
                {t.consentPrefix}
                <a href="/consent.pdf" target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-400 underline">{t.consentLink}</a>
                {t.consentSuffix}
              </span>
            </label>

            <button type="submit" disabled={loading || !form.consent}
              className="w-full font-bold text-sm text-white rounded-xl py-3.5 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg,#0d2a94,#072060)' }}>
              {loading ? 'Envoi…' : 'Soumettre'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

function SectionTitle({ children, th }: { children: React.ReactNode; th: ReturnType<typeof getTheme> }) {
  return (
    <h2 className="text-xs font-black tracking-[0.14em] uppercase pb-2" style={{ color: th.sub, borderBottom: `1px solid ${th.border}` }}>
      {children}
    </h2>
  );
}

function Input({ label, value, onChange, placeholder, th, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; th: ReturnType<typeof getTheme>; type?: string;
}) {
  return (
    <div>
      <label className="block text-[11px] font-bold tracking-[0.12em] uppercase mb-1.5" style={{ color: th.muted }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
        style={{ background: th.input, border: `1px solid ${th.border}`, color: th.text }} />
    </div>
  );
}
