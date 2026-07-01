'use client';
import { Fragment, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { Locale } from '@/lib/i18n/locale';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { getTheme, ADMIN_THEME_KEY, type Theme } from '@/lib/adminTheme';
import { SubmissionsList, type Submission } from '../SubmissionsList';

type Account = { id: number; nom_de_store:string; store_name: string; role: 'master' | 'store'; active: number; created_at: string; submission_count: number };
type Editing = { id?: number; nom_de_store?: string; store_name: string; password: string; role: 'master' | 'store'; active: boolean } | null;

const JSON_HEADERS = { 'Content-Type': 'application/json', 'x-requested-with': 'XMLHttpRequest' };

export default function AccountsClient({ locale }: { locale: Locale; dict: Dictionary }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [listState, setListState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [listError, setListError] = useState('');
  const [editing, setEditing] = useState<Editing>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [reveal, setReveal] = useState<{ store: string; password: string } | null>(null); // generated/reset password to hand over
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [subs, setSubs] = useState<Record<number, Submission[]>>({});
  const [subLoading, setSubLoading] = useState<number | null>(null);
  const [dark, setDark] = useState(false);
  const th = getTheme(dark);

  async function toggleSubmissions(id: number) {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (subs[id]) return; // already loaded
    setSubLoading(id);
    try {
      const res = await fetch(`/api/admin/accounts/${id}/submissions`);
      if (!res.ok) throw new Error();
      const data = await res.json() as { submissions: Submission[] };
      setSubs(prev => ({ ...prev, [id]: data.submissions }));
    } catch {
      setSubs(prev => ({ ...prev, [id]: [] }));
    } finally { setSubLoading(null); }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDark(localStorage.getItem(ADMIN_THEME_KEY) === 'dark');
  }, []);

  const load = useCallback(async () => {
    setListState('loading'); setListError('');
    try {
      const res = await fetch('/api/admin/accounts');
      if (!res.ok) throw new Error();
      const data = await res.json() as { accounts: Account[] };
      setAccounts(data.accounts);
      setListState('ready');
    } catch {
      setListError('Chargement impossible.'); setListState('error');
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  async function save() {
    if (!editing) return;
    setSaving(true); setError('');
    try {
      const isNew = editing.id === undefined;
      const url = isNew ? '/api/admin/accounts' : `/api/admin/accounts/${editing.id}`;
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify(isNew
          ? { store_name: editing.store_name.trim(), password: editing.password, role: editing.role, active: editing.active }
          : { store_name: editing.store_name.trim(), active: editing.active }),
      });
      const data = await res.json() as { error?: string; password?: string };
      if (!res.ok) { setError(data.error ?? 'Erreur.'); return; }
      setEditing(null);
      await load();
      // Master typed the password on create, so nothing to reveal there; only a
      // regenerated (reset) password is shown once.
      if (data.password) { setCopied(false); setReveal({ store: editing.store_name.trim(), password: data.password }); }
    } finally { setSaving(false); }
  }

  async function resetPassword() {
    if (!editing?.id) return;
    setSaving(true); setError('');
    try {
      const res = await fetch(`/api/admin/accounts/${editing.id}`, {
        method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify({ regenerate_password: true }),
      });
      const data = await res.json() as { error?: string; password?: string };
      if (!res.ok) { setError(data.error ?? 'Erreur.'); return; }
      const store = editing.store_name.trim();
      setEditing(null);
      await load();
      if (data.password) { setCopied(false); setReveal({ store, password: data.password }); }
    } finally { setSaving(false); }
  }

  async function toggleActive(a: Account) {
    await fetch(`/api/admin/accounts/${a.id}`, { method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify({ active: !a.active }) });
    load();
  }

  async function remove(a: Account) {
    if (!confirm(`Supprimer le compte « ${a.store_name} » et toutes ses soumissions ? Action irréversible.`)) return;
    await fetch(`/api/admin/accounts/${a.id}`, { method: 'DELETE', headers: { 'x-requested-with': 'XMLHttpRequest' } });
    load();
  }

  return (
    <main className="min-h-screen" style={{ background: th.page, color: th.text }}>
      <header className="sticky top-0 z-40 px-4 sm:px-6 py-3.5 flex items-center gap-3 flex-wrap"
        style={{ background: th.headerBg, backdropFilter: 'blur(20px)', borderBottom: `1px solid ${th.border}` }}>
        <Link href="/admin" className="text-sm font-semibold" style={{ color: th.muted }}>
          {locale === 'ar' ? '→' : '←'} Tableau de bord
        </Link>
        <h1 className="font-black text-sm" style={{ color: th.text }}>Comptes magasins</h1>
        <button onClick={() => { setError(''); setEditing({ store_name: '', password: '', role: 'store', active: true }); }}
          className="ms-auto text-xs font-semibold text-white px-4 py-2 rounded-lg active:scale-95"
          style={{ background: 'linear-gradient(135deg,#0d2a94,#072060)' }}>
          + Nouveau compte
        </button>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${th.border}` }}>
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr style={{ background: th.panelAlt, borderBottom: `1px solid ${th.border}` }}>
                {['Identifiant', 'Magasin', 'Rôle', 'Soumissions', 'Statut', 'Créé le', 'Actions'].map(h => (
                  <th key={h} className="text-start px-4 py-3 text-xs font-bold uppercase tracking-wide" style={{ color: th.muted }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* 4 states: loading / error / empty / ready */}
              {listState === 'loading' ? (
                <tr><td colSpan={7} className="text-center py-16" style={{ color: th.faint }}>
                  <svg className="w-5 h-5 animate-spin mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Chargement…
                </td></tr>
              ) : listState === 'error' ? (
                <tr><td colSpan={7} className="text-center py-16" style={{ color: '#f87171' }}>
                  {listError} <button onClick={load} className="underline ms-2">Réessayer</button>
                </td></tr>
              ) : accounts.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-16" style={{ color: th.faint }}>Aucun compte magasin. Créez-en un.</td></tr>
              ) : accounts.map(a => (
                <Fragment key={a.id}>
                <tr onClick={() => toggleSubmissions(a.id)} className="cursor-pointer"
                  style={{ borderBottom: `1px solid ${th.borderSub}`, background: expanded === a.id ? th.rowHover : 'transparent' }}>
                  <td className="px-4 py-3 font-medium" style={{ color: th.text }}>
                    <span className="inline-block w-3 me-1.5 transition-transform" style={{ color: th.faint, transform: expanded === a.id ? 'rotate(90deg)' : 'none' }}>▸</span>
                    {a.nom_de_store}
                  </td>
                  <td className="px-4 py-3 font-medium" style={{ color: th.text }}>
                    <span className="inline-block w-3 me-1.5 transition-transform" style={{ color: th.faint, transform: expanded === a.id ? 'rotate(90deg)' : 'none' }}>▸</span>
                    {a.store_name}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase"
                      style={a.role === 'master'
                        ? { background: 'rgba(167,139,250,0.15)', color: '#a78bfa' }
                        : { background: 'rgba(59,130,246,0.12)', color: '#60a5fa' }}>
                      {a.role === 'master' ? 'Maître' : 'Magasin'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold tabular-nums" style={{ background: 'rgba(59,130,246,0.12)', color: '#60a5fa' }}>
                      {a.submission_count}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={e => { e.stopPropagation(); toggleActive(a); }}
                      className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase"
                      style={a.active
                        ? { background: 'rgba(16,185,129,0.12)', color: '#34d399' }
                        : { background: 'rgba(248,113,113,0.15)', color: '#ef4444' }}>
                      {a.active ? 'Actif' : 'Inactif'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: th.muted }}>{new Date(a.created_at).toLocaleDateString('fr-DZ')}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                      <button onClick={() => { setError(''); setEditing({ id: a.id, store_name: a.store_name, password: '', role: a.role, active: !!a.active }); }}
                        className="text-xs font-semibold px-2 py-1 rounded-lg" style={{ background: th.input, color: th.sub }}>Modifier</button>
                      <button onClick={() => remove(a)}
                        className="text-xs font-semibold px-2 py-1 rounded-lg" style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171' }}>Supprimer</button>
                    </div>
                  </td>
                </tr>
                {expanded === a.id && (
                  <tr>
                    <td colSpan={7} className="px-4 pb-4 pt-1" style={{ background: th.panelAlt }}>
                      <SubmissionsList rows={subs[a.id]} loading={subLoading === a.id} th={th} />
                    </td>
                  </tr>
                )}
                </Fragment>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </div>

      {/* Create / edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setEditing(null)}>
          <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: th.panel, border: `1px solid ${th.border}` }} onClick={e => e.stopPropagation()}>
            <h3 className="font-bold mb-4" style={{ color: th.text }}>{editing.id === undefined ? 'Nouveau compte magasin' : 'Modifier le compte'}</h3>
            {error && <div className="mb-3 rounded-lg px-3 py-2 text-xs" style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171' }}>{error}</div>}
            <div className="space-y-3">
              <Field label="Nom du magasin / identifiant" th={th} value={editing.store_name} onChange={v => setEditing({ ...editing, store_name: v })} />
              {editing.id === undefined && (
                <>
                  <Field label="Mot de passe" th={th} type="text" value={editing.password} onChange={v => setEditing({ ...editing, password: v })} />
                  <div>
                    <label className="block text-[11px] font-bold tracking-[0.12em] uppercase mb-1.5" style={{ color: th.muted }}>Type de compte</label>
                    <select value={editing.role} onChange={e => setEditing({ ...editing, role: e.target.value as 'master' | 'store' })}
                      className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                      style={{ background: th.input, border: `1px solid ${th.border}`, color: th.text, colorScheme: dark ? 'dark' : 'light' }}>
                      <option value="store" style={{ background: th.selectBg }}>Magasin (soumet des factures)</option>
                      <option value="master" style={{ background: th.selectBg }}>Maître (gère tout)</option>
                    </select>
                  </div>
                </>
              )}
              <label className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl" style={{ border: `1px solid ${th.border}` }}>
                <span className="text-sm" style={{ color: th.sub }}>Compte actif</span>
                <input type="checkbox" checked={editing.active} onChange={e => setEditing({ ...editing, active: e.target.checked })} />
              </label>
              {editing.id !== undefined && (
                <button onClick={resetPassword} disabled={saving}
                  className="w-full text-xs font-semibold py-2.5 rounded-xl disabled:opacity-40"
                  style={{ background: 'rgba(59,130,246,0.12)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.25)' }}>
                  Réinitialiser le mot de passe
                </button>
              )}
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setEditing(null)} className="flex-1 text-sm font-semibold py-2.5 rounded-xl" style={{ background: th.input, color: th.muted }}>Annuler</button>
              <button onClick={save} disabled={saving} className="flex-1 text-sm font-bold text-white py-2.5 rounded-xl disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg,#0d2a94,#072060)' }}>{saving ? '…' : 'Enregistrer'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Generated/reset password reveal (shown once) */}
      {reveal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full max-w-sm rounded-2xl p-6 text-center" style={{ background: th.panel, border: '1px solid rgba(16,185,129,0.3)' }}>
            <h3 className="font-bold mb-1" style={{ color: th.text }}>Mot de passe temporaire</h3>
            <p className="text-xs mb-4" style={{ color: th.muted }}>
              Communiquez-le à « {reveal.store} ». Il devra le changer à la première connexion. Ce code ne sera plus affiché.
            </p>
            <div className="flex items-center justify-center gap-2 rounded-xl px-4 py-3 mb-4 font-mono text-lg font-bold tracking-wider"
              style={{ background: th.input, color: '#34d399' }}>
              {reveal.password}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { navigator.clipboard?.writeText(reveal.password); setCopied(true); }}
                className="flex-1 text-sm font-semibold py-2.5 rounded-xl" style={{ background: th.input, color: th.sub }}>
                {copied ? '✓ Copié' : 'Copier'}
              </button>
              <button onClick={() => setReveal(null)} className="flex-1 text-sm font-bold text-white py-2.5 rounded-xl"
                style={{ background: 'linear-gradient(135deg,#0d2a94,#072060)' }}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Field({ label, value, onChange, th, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; th: Theme; type?: string }) {
  return (
    <div>
      <label className="block text-[11px] font-bold tracking-[0.12em] uppercase mb-1.5" style={{ color: th.muted }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
        style={{ background: th.input, border: `1px solid ${th.border}`, color: th.text }} />
    </div>
  );
}
