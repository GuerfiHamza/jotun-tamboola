'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Locale } from '@/lib/i18n/locale';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { getTheme, ADMIN_THEME_KEY } from '@/lib/adminTheme';

export default function ChangePasswordClient({ forced, storeName }: { locale: Locale; dict: Dictionary; forced: boolean; storeName: string }) {
  const router = useRouter();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [dark, setDark] = useState(false);
  const th = getTheme(dark);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDark(localStorage.getItem(ADMIN_THEME_KEY) === 'dark');
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (next.length < 8) { setError('Le nouveau mot de passe doit contenir au moins 8 caractères.'); return; }
    if (next !== confirm) { setError('Les deux mots de passe ne correspondent pas.'); return; }
    if (!forced && !current) { setError('Veuillez saisir votre mot de passe actuel.'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-requested-with': 'XMLHttpRequest' },
        body: JSON.stringify({ current_password: current, new_password: next }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) { setError(data.error ?? 'Erreur.'); return; }
      setDone(true);
      setTimeout(() => { window.location.href = '/admin'; }, 1200);
    } catch {
      setError('Erreur réseau. Réessayez.');
    } finally { setLoading(false); }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4" style={{ background: th.page, color: th.text }}>
      <div className="w-full max-w-sm rounded-3xl p-8" style={{ background: th.panel, border: `1px solid ${th.border}` }}>
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-white text-xl mx-auto mb-3"
            style={{ background: 'linear-gradient(135deg,#0d2a94,#072060)' }}>J</div>
          <h1 className="text-xl font-black" style={{ color: th.text }}>Changer le mot de passe</h1>
          <p className="text-sm mt-1" style={{ color: th.muted }}>
            {forced ? `Première connexion — ${storeName}. Choisissez un nouveau mot de passe.` : storeName}
          </p>
        </div>

        {done ? (
          <div className="rounded-xl px-4 py-4 text-center text-sm" style={{ background: 'rgba(16,185,129,0.12)', color: '#34d399' }}>
            Mot de passe mis à jour. Redirection…
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            {error && <div className="rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171' }}>{error}</div>}

            {!forced && (
              <Field label="Mot de passe actuel" value={current} onChange={setCurrent} th={th} autoComplete="current-password" />
            )}
            <Field label="Nouveau mot de passe" value={next} onChange={setNext} th={th} autoComplete="new-password" />
            <Field label="Confirmer le mot de passe" value={confirm} onChange={setConfirm} th={th} autoComplete="new-password" />

            <button type="submit" disabled={loading}
              className="w-full font-bold text-sm text-white rounded-xl py-3.5 disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg,#0d2a94,#072060)' }}>
              {loading ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            {!forced && (
              <button type="button" onClick={() => router.push('/admin')}
                className="w-full text-sm font-semibold" style={{ color: th.muted }}>Annuler</button>
            )}
          </form>
        )}
      </div>
    </main>
  );
}

function Field({ label, value, onChange, th, autoComplete }: {
  label: string; value: string; onChange: (v: string) => void; th: ReturnType<typeof getTheme>; autoComplete?: string;
}) {
  return (
    <div>
      <label className="block text-[11px] font-bold tracking-[0.12em] uppercase mb-1.5" style={{ color: th.muted }}>{label}</label>
      <input type="password" value={value} onChange={e => onChange(e.target.value)} autoComplete={autoComplete} required
        className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
        style={{ background: th.input, border: `1px solid ${th.border}`, color: th.text }} />
    </div>
  );
}
