'use client';
import { Fragment, useEffect, useState } from 'react';
import type { Theme } from '@/lib/adminTheme';
import { SubmissionsList, type Submission } from './SubmissionsList';

type Store = { id: number; store_name: string; submission_count: number };

// Master-only: browse all submissions grouped by store, each row expandable.
export default function StoresPanel({ th }: { th: Theme }) {
  const [stores, setStores] = useState<Store[] | null>(null);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [subs, setSubs] = useState<Record<number, Submission[]>>({});
  const [subLoading, setSubLoading] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/admin/accounts');
        if (!res.ok) throw new Error();
        const data = await res.json() as { accounts: (Store & { role: string })[] };
        if (!cancelled) setStores(data.accounts.filter(a => a.role === 'store'));
      } catch { if (!cancelled) setError(true); }
    })();
    return () => { cancelled = true; };
  }, []);

  async function toggle(id: number) {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (subs[id]) return;
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

  if (error || (stores && stores.length === 0)) return null; // nothing useful to show

  return (
    <div className="rounded-2xl overflow-hidden mb-5" style={{ background: th.panel, border: `1px solid ${th.border}` }}>
      <div className="px-5 py-3.5 text-xs font-bold uppercase tracking-wide" style={{ color: th.muted, borderBottom: `1px solid ${th.border}` }}>
        Soumissions par magasin
      </div>
      {!stores ? (
        <p className="px-5 py-6 text-sm text-center" style={{ color: th.faint }}>Chargement…</p>
      ) : stores.map(s => (
        <Fragment key={s.id}>
          <button onClick={() => toggle(s.id)}
            className="w-full flex items-center gap-3 px-5 py-3 text-start transition-colors"
            style={{ borderBottom: `1px solid ${th.borderSub}`, background: expanded === s.id ? th.rowHover : 'transparent' }}>
            <span className="w-3 transition-transform" style={{ color: th.faint, transform: expanded === s.id ? 'rotate(90deg)' : 'none' }}>▸</span>
            <span className="font-medium text-sm" style={{ color: th.text }}>{s.store_name}</span>
            <span className="ms-auto px-2.5 py-0.5 rounded-full text-xs font-bold tabular-nums" style={{ background: 'rgba(59,130,246,0.12)', color: '#60a5fa' }}>
              {s.submission_count}
            </span>
          </button>
          {expanded === s.id && (
            <div className="px-4 pb-4 pt-1" style={{ background: th.panelAlt }}>
              <SubmissionsList rows={subs[s.id]} loading={subLoading === s.id} th={th} />
            </div>
          )}
        </Fragment>
      ))}
    </div>
  );
}
