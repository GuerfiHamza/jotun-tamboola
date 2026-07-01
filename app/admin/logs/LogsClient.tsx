'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { Locale } from '@/lib/i18n/locale';
import { getTheme, ADMIN_THEME_KEY } from '@/lib/adminTheme';

type Log = {
  id: number; actor_account_id: number | null; actor_name: string | null;
  actor_role: string | null; action: string; detail: string | null; created_at: string;
};

const ROLE_COLOR: Record<string, string> = { master: '#a78bfa', store: '#60a5fa', system: '#94a3b8' };

export default function LogsClient({ locale }: { locale: Locale }) {
  const [logs, setLogs] = useState<Log[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [dark, setDark] = useState(false);
  const th = getTheme(dark);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDark(localStorage.getItem(ADMIN_THEME_KEY) === 'dark');
  }, []);

  const load = useCallback(async () => {
    setState('loading');
    try {
      const res = await fetch('/api/admin/logs');
      if (!res.ok) throw new Error();
      const data = await res.json() as { logs: Log[] };
      setLogs(data.logs);
      setState('ready');
    } catch { setState('error'); }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  return (
    <main className="min-h-screen" style={{ background: th.page, color: th.text }}>
      <header className="sticky top-0 z-40 px-4 sm:px-6 py-3.5 flex items-center gap-3 flex-wrap"
        style={{ background: th.headerBg, backdropFilter: 'blur(20px)', borderBottom: `1px solid ${th.border}` }}>
        <Link href="/admin" className="text-sm font-semibold" style={{ color: th.muted }}>
          {locale === 'ar' ? '→' : '←'} Tableau de bord
        </Link>
        <h1 className="font-black text-sm" style={{ color: th.text }}>Journal des actions</h1>
        <button onClick={load} className="ms-auto text-xs font-semibold px-3 py-1.5 rounded-lg"
          style={{ border: `1px solid ${th.border}`, color: th.muted }}>Rafraîchir</button>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${th.border}` }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr style={{ background: th.panelAlt, borderBottom: `1px solid ${th.border}` }}>
                  {['Date', 'Auteur', 'Rôle', 'Action', 'Détail'].map(h => (
                    <th key={h} className="text-start px-4 py-3 text-xs font-bold uppercase tracking-wide" style={{ color: th.muted }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {state === 'loading' ? (
                  <tr><td colSpan={5} className="text-center py-16" style={{ color: th.faint }}>Chargement…</td></tr>
                ) : state === 'error' ? (
                  <tr><td colSpan={5} className="text-center py-16" style={{ color: '#f87171' }}>
                    Chargement impossible. <button onClick={load} className="underline ms-2">Réessayer</button>
                  </td></tr>
                ) : logs.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-16" style={{ color: th.faint }}>Aucune action enregistrée.</td></tr>
                ) : logs.map(l => (
                  <tr key={l.id} style={{ borderBottom: `1px solid ${th.borderSub}` }}>
                    <td className="px-4 py-2.5 text-xs whitespace-nowrap" style={{ color: th.muted }}>
                      {new Date(l.created_at).toLocaleString('fr-DZ')}
                    </td>
                    <td className="px-4 py-2.5 font-medium" style={{ color: th.text }}>{l.actor_name ?? '—'}</td>
                    <td className="px-4 py-2.5 text-xs font-bold uppercase" style={{ color: ROLE_COLOR[l.actor_role ?? 'system'] ?? th.sub }}>
                      {l.actor_role ?? '—'}
                    </td>
                    <td className="px-4 py-2.5 text-xs font-semibold" style={{ color: th.sub }}>{l.action}</td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: th.muted }}>{l.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
