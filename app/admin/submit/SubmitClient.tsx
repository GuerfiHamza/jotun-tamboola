'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Locale } from '@/lib/i18n/locale';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { getTheme, ADMIN_THEME_KEY } from '@/lib/adminTheme';

type Form = { nom: string; prenom: string; phone: string; is_painter: boolean; invoice: File | null };
const EMPTY: Form = { nom: '', prenom: '', phone: '', is_painter: false, invoice: null };

export default function SubmitClient({ locale, dict, storeName }: { locale: Locale; dict: Dictionary; storeName: string }) {
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

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm(f => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.nom.trim() || !form.prenom.trim() || !form.phone.trim()) { setError('Nom, prénom et téléphone sont requis.'); return; }
    if (!form.invoice) { setError('La facture est requise.'); return; }

    setLoading(true);
    try {
      const reg = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-requested-with': 'XMLHttpRequest' },
        body: JSON.stringify({ nom: form.nom.trim(), prenom: form.prenom.trim(), phone: form.phone.trim(), is_painter: form.is_painter }),
      });
      const regData = await reg.json() as { error?: string; participantId?: number };
      if (!reg.ok || !regData.participantId) { setError(regData.error ?? 'Erreur lors de l’enregistrement.'); return; }

      const fd = new FormData();
      fd.append('invoice', form.invoice);
      fd.append('participantId', String(regData.participantId));
      const up = await fetch('/api/upload-invoice', { method: 'POST', headers: { 'x-requested-with': 'XMLHttpRequest' }, body: fd });
      const upData = await up.json() as { error?: string; message?: string };
      if (!up.ok) { setError(upData.error ?? 'Erreur lors de l’envoi de la facture.'); return; }

      setDone(upData.message ?? 'Soumission reçue.');
      setForm(EMPTY);
    } catch {
      setError('Erreur réseau. Réessayez.');
    } finally { setLoading(false); }
  }

  return (
    <main className="min-h-screen" style={{ background: th.page, color: th.text }}>
      <header className="sticky top-0 z-40 px-6 py-3.5 flex items-center gap-3"
        style={{ background: th.headerBg, backdropFilter: 'blur(20px)', borderBottom: `1px solid ${th.border}` }}>
        <Link href="/admin" className="text-sm font-semibold" style={{ color: th.muted }}>
          {locale === 'ar' ? '→' : '←'} Tableau de bord
        </Link>
        <h1 className="font-black text-sm" style={{ color: th.text }}>Nouvelle soumission</h1>
        <span className="ms-auto text-xs font-semibold" style={{ color: th.muted }}>{storeName}</span>
      </header>

      <div className="max-w-lg mx-auto px-6 py-8">
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
          <form onSubmit={submit} className="rounded-2xl p-6 space-y-5" style={{ background: th.panel, border: `1px solid ${th.border}` }}>
            {error && <div className="rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171' }}>{error}</div>}

            <div className="grid grid-cols-2 gap-4">
              <Input label={`${t.nom.label} *`} value={form.nom} onChange={v => set('nom', v)} placeholder={t.nom.placeholder} th={th} />
              <Input label={`${t.prenom.label} *`} value={form.prenom} onChange={v => set('prenom', v)} placeholder={t.prenom.placeholder} th={th} />
            </div>
            <Input label={`${t.phone.label} *`} value={form.phone} onChange={v => set('phone', v)} placeholder={t.phone.placeholder} th={th} type="tel" />

            <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl" style={{ border: `1px solid ${th.border}` }}>
              <span className="text-sm font-semibold" style={{ color: th.sub }}>{t.profession.isPainter}</span>
              <button type="button" onClick={() => set('is_painter', !form.is_painter)}
                className="relative w-14 h-7 rounded-full transition-all" style={{ background: form.is_painter ? '#22c55e' : '#ef4444' }} aria-pressed={form.is_painter}>
                <span className="absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all" style={{ insetInlineStart: form.is_painter ? '1.75rem' : '0.25rem' }} />
              </button>
            </div>

            <label className="flex flex-col items-center justify-center gap-2 w-full border-2 border-dashed rounded-xl px-4 py-7 cursor-pointer"
              style={{ borderColor: form.invoice ? 'rgba(16,185,129,0.4)' : th.border, background: form.invoice ? 'rgba(16,185,129,0.04)' : th.input }}>
              <input type="file" accept="image/*,application/pdf" className="hidden" onChange={e => set('invoice', e.target.files?.[0] ?? null)} />
              <span className="text-sm font-semibold" style={{ color: form.invoice ? '#34d399' : th.muted }}>
                {form.invoice ? form.invoice.name : `${t.invoice.label} *`}
              </span>
              <span className="text-xs" style={{ color: th.faint }}>{form.invoice ? t.invoice.changeHint : t.invoice.dropHint}</span>
            </label>

            <button type="submit" disabled={loading}
              className="w-full font-bold text-sm text-white rounded-xl py-3.5 flex items-center justify-center gap-2 disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg,#0d2a94,#072060)' }}>
              {loading ? 'Envoi…' : 'Soumettre'}
            </button>
          </form>
        )}
      </div>
    </main>
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
