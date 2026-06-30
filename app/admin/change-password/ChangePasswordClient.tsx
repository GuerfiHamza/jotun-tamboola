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
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="block text-[11px] font-bold tracking-[0.12em] uppercase mb-1.5" style={{ color: th.muted }}>{label}</label>
      <div className="relative">
        <input type={show ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)} autoComplete={autoComplete} required
          className="w-full rounded-xl ps-3 pe-11 py-2.5 text-sm outline-none"
          style={{ background: th.input, border: `1px solid ${th.border}`, color: th.text }} />
        <button type="button" onClick={() => setShow(s => !s)}
          className="absolute end-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-lg"
          style={{ color: th.faint }}
          aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
          {show ? (
            <svg viewBox="0 0 20 20" className="w-4 h-4" fill="currentColor">
              <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd"/>
              <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z"/>
            </svg>
          ) : (
            <svg viewBox="0 0 20 20" className="w-4 h-4" fill="currentColor">
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
