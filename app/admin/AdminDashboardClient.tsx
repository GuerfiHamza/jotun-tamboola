'use client';
import { Fragment, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import LanguageSwitcher from '../components/LanguageSwitcher';
import type { Locale } from '@/lib/i18n/locale';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { getTheme, ThemeToggle, ADMIN_THEME_KEY, type Theme } from '@/lib/adminTheme';
import { SubmissionsList, type Submission } from './SubmissionsList';

type ParticipantStats = { total: number; painters: number; approved: number; pending: number; rejected: number };
type InvoiceStats     = { total: number; accepted: number; avg_amount: string | null; needs_attention: number };
type Stats            = { participants: ParticipantStats; invoices: InvoiceStats };

type Store = { id: number; store_name: string; phone: string; submission_count: number };

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, color, icon, th }: { label: string; value: number | string; color: string; icon: React.ReactNode; th: Theme }) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5"
      style={{ background: th.panel, border: `1px solid ${th.border}` }}
    >
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg,transparent,${color}60,transparent)` }} aria-hidden />
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: `${color}18` }}
        >
          <span style={{ color }}>{icon}</span>
        </div>
      </div>
      <div className="text-2xl font-black tabular-nums" style={{ color: th.text }}>{value ?? 0}</div>
      <div className="text-xs font-medium mt-1 uppercase tracking-wide" style={{ color: th.muted }}>{label}</div>
    </div>
  );
}

// ── Header (responsive: inline on desktop, burger dropdown on mobile) ──────────

function Header({
  role, storeName, t, th, dark, locale, dict, menuOpen, setMenuOpen, onToggleDark, onExport, onLogout,
}: {
  role: 'master' | 'store'; storeName: string; t: Dictionary['admin']['dashboard']; th: Theme; dark: boolean;
  locale: Locale; dict: Dictionary; menuOpen: boolean; setMenuOpen: (v: boolean) => void;
  onToggleDark: () => void; onExport: (f: 'csv' | 'xlsx' | 'pdf') => void; onLogout: () => void;
}) {
  // Shared action items — rendered inline on desktop and inside the dropdown on mobile.
  const actions = (
    <>
      {role === 'store' ? (
        <Link href="/admin/submit"
          className="text-xs font-semibold text-white px-3 py-1.5 rounded-lg transition-all active:scale-95 text-center"
          style={{ background: 'linear-gradient(135deg,#0d2a94,#072060)' }}>
          + Nouvelle soumission
        </Link>
      ) : (
        <Link href="/admin/accounts"
          className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors text-blue-400 hover:text-blue-300 text-center"
          style={{ border: `1px solid ${th.border}` }}>
          Comptes magasins
        </Link>
      )}

      {/* Export buttons */}
      <div className="flex rounded-xl overflow-hidden" style={{ border: `1px solid ${th.border}` }}>
        <button onClick={() => onExport('csv')}
          className="flex-1 px-3 py-1.5 text-xs font-semibold transition-colors text-emerald-400 hover:text-emerald-300"
          style={{ background: 'rgba(16,185,129,0.08)' }}>CSV</button>
        <button onClick={() => onExport('xlsx')}
          className="flex-1 px-3 py-1.5 text-xs font-semibold transition-colors text-blue-400 hover:text-blue-300"
          style={{ background: 'rgba(59,130,246,0.08)', borderLeft: '1px solid rgba(255,255,255,0.06)' }}>Excel</button>
        <button onClick={() => onExport('pdf')}
          className="flex-1 px-3 py-1.5 text-xs font-semibold transition-colors text-blue-400 hover:text-blue-300"
          style={{ background: 'rgba(13,42,148,0.08)', borderLeft: '1px solid rgba(255,255,255,0.06)' }}>PDF</button>
      </div>

      <Link href="/admin/change-password" title="Changer le mot de passe"
        className="flex items-center justify-center gap-1.5 text-xs hover:text-blue-400 transition-colors px-3 py-1.5 rounded-lg"
        style={{ border: `1px solid ${th.border}`, color: th.muted }}>
        <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 6a3 3 0 10-3 3M8 9v5M6 12h4"/><circle cx="11" cy="6" r="0.5" fill="currentColor"/>
        </svg>
        Mot de passe
      </Link>

      <button onClick={onLogout}
        className="flex items-center justify-center gap-1.5 text-xs hover:text-blue-400 transition-colors px-3 py-1.5 rounded-lg"
        style={{ border: `1px solid ${th.border}`, color: th.muted }}>
        <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M10 11l3-3-3-3M13 8H6"/>
        </svg>
        {t.logout}
      </button>
    </>
  );

  return (
    <header
      className="sticky top-0 z-40 px-4 sm:px-6 py-3.5 flex items-center gap-3"
      style={{ background: th.headerBg, backdropFilter: 'blur(20px)', borderBottom: `1px solid ${th.border}`, boxShadow: '0 4px 32px rgba(0,0,0,0.4)' }}
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-white text-xs shadow" style={{ background: 'linear-gradient(135deg,#0d2a94,#072060)', boxShadow: '0 4px 16px rgba(13,42,148,0.4)' }}>J</div>
        <div className="leading-none">
          <div className="font-black text-white text-sm tracking-tight">JOTUN</div>
          <div className="text-[9px] font-bold text-blue-400 tracking-[0.2em] uppercase">{t.brandSubtitle}</div>
        </div>
      </div>

      <div className="ms-auto flex items-center gap-3">
        <span className="text-xs font-semibold hidden md:inline" style={{ color: th.muted }}>
          {role === 'master' ? 'Maître' : storeName}
        </span>
        <ThemeToggle dark={dark} onToggle={onToggleDark} dict={dict} />
        <LanguageSwitcher locale={locale} dark={dark} />

        {/* Desktop: inline actions */}
        <div className="hidden md:flex items-center gap-3">{actions}</div>

        {/* Mobile: burger */}
        <button onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu" aria-expanded={menuOpen}
          className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-all"
          style={{ background: dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)', border: `1px solid ${th.border}`, color: th.sub }}>
          <svg viewBox="0 0 20 20" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {menuOpen ? <path d="M5 5l10 10M15 5L5 15"/> : <path d="M3 6h14M3 10h14M3 14h14"/>}
          </svg>
        </button>
      </div>

      {/* Mobile: dropdown panel (closes on any item click) */}
      {menuOpen && (
        <div onClick={() => setMenuOpen(false)}
          className="md:hidden absolute left-0 right-0 top-full flex flex-col gap-3 p-4 z-40"
          style={{ background: th.headerBg, backdropFilter: 'blur(20px)', borderBottom: `1px solid ${th.border}`, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
          {actions}
        </div>
      )}
    </header>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminDashboardClient({ locale, dict, role, storeName }: { locale: Locale; dict: Dictionary; role: 'master' | 'store'; storeName: string }) {
  const router = useRouter();
  const t = dict.admin.dashboard;
  const [stats,        setStats]        = useState<Stats | null>(null);
  const [stores,       setStores]       = useState<Store[] | null>(null);
  const [fetchError,   setFetchError]   = useState('');
  const [exportFormat, setExportFormat] = useState<'csv' | 'xlsx' | 'pdf' | null>(null);
  const [expanded,     setExpanded]     = useState<number | null>(null);
  const [subs,         setSubs]         = useState<Record<number, Submission[]>>({});
  const [subLoading,   setSubLoading]   = useState<number | null>(null);
  const [statusBusy,   setStatusBusy]   = useState<number | null>(null);
  const [dark,         setDark]         = useState(false); // light default, matches server render; synced from localStorage below
  const [menuOpen,     setMenuOpen]     = useState(false);
  const th = getTheme(dark);

  useEffect(() => {
    // ponytail: one-time sync from localStorage on mount to avoid SSR/client
    // hydration mismatch (server has no access to it).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDark(localStorage.getItem(ADMIN_THEME_KEY) === 'dark');
  }, []);

  useEffect(() => {
    localStorage.setItem(ADMIN_THEME_KEY, dark ? 'dark' : 'light');
  }, [dark]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stats');
      if (res.status === 401) { router.push('/admin/login'); return; }
      if (!res.ok) throw new Error();
      setStats(await res.json() as Stats);
    } catch { setFetchError(t.statsError); }
  }, [router, t.statsError]);

  const fetchStores = useCallback(async () => {
    setFetchError('');
    try {
      const res = await fetch('/api/admin/accounts');
      if (res.status === 401) { router.push('/admin/login'); return; }
      if (!res.ok) throw new Error();
      const data = await res.json() as { accounts: (Store & { role: string })[] };
      setStores(data.accounts.filter(a => a.role === 'store'));
    } catch { setFetchError(t.listError); }
  }, [router, t.listError]);

  async function toggleStore(id: number) {
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

  // Accept / refuse a submission directly from the store dropdown.
  async function setSubmissionStatus(storeId: number, id: number, status: 'approved' | 'rejected') {
    setStatusBusy(id);
    try {
      const res = await fetch(`/api/admin/participants/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-requested-with': 'XMLHttpRequest' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      setSubs(prev => ({ ...prev, [storeId]: (prev[storeId] ?? []).map(s => s.id === id ? { ...s, status } : s) }));
      void fetchStats();
    } catch { setFetchError('Erreur lors de la mise à jour de la soumission.'); }
    finally { setStatusBusy(null); }
  }

  function runExport(format: 'csv' | 'xlsx' | 'pdf', status: string) {
    const params = new URLSearchParams({ status });
    const path = format === 'csv' ? '/api/admin/export' : `/api/admin/export/${format}`;
    window.location.assign(`${path}?${params}`);
    setExportFormat(null);
  }

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST', headers: { 'x-requested-with': 'XMLHttpRequest' } });
    router.push('/admin/login');
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (cancelled) return;
      await fetchStats();
      await fetchStores();
    })();
    return () => { cancelled = true; };
  }, [fetchStats, fetchStores]);

  const statCards = stats ? [
    { label: t.stats.total,             value: stats.participants.total,             color: '#ef4444', icon: <svg viewBox="0 0 20 20" className="w-4 h-4" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/></svg> },
    { label: t.stats.painters,          value: stats.participants.painters,          color: '#f59e0b', icon: <svg viewBox="0 0 20 20" className="w-4 h-4" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg> },
    { label: t.stats.approved,          value: stats.participants.approved,          color: '#10b981', icon: <svg viewBox="0 0 20 20" className="w-4 h-4" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg> },
    { label: t.stats.pending,           value: stats.participants.pending,           color: '#fbbf24', icon: <svg viewBox="0 0 20 20" className="w-4 h-4" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/></svg> },
    { label: t.stats.invoicesSubmitted, value: stats.invoices.total,                 color: '#3b82f6', icon: <svg viewBox="0 0 20 20" className="w-4 h-4" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd"/></svg> },
    { label: t.stats.needsAttention,    value: stats.invoices.needs_attention ?? 0,  color: '#f97316', icon: <svg viewBox="0 0 20 20" className="w-4 h-4" fill="currentColor"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg> },
  ] : [];

  return (
    <main className="min-h-screen" style={{ background: th.page, color: th.text }}>

      <Header
        role={role} storeName={storeName} t={t} th={th} dark={dark}
        locale={locale} dict={dict}
        menuOpen={menuOpen} setMenuOpen={setMenuOpen}
        onToggleDark={() => setDark(d => !d)}
        onExport={setExportFormat}
        onLogout={logout}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        {/* Error banner */}
        {fetchError && (
          <div
              className="mb-6 rounded-2xl px-5 py-4 flex justify-between items-center text-sm"
              style={{ background: 'rgba(13,42,148,0.08)', border: '1px solid rgba(13,42,148,0.2)', color: '#9fb3f0' }}
            >
            <span>{fetchError}</span>
            <button
              onClick={() => { setFetchError(''); fetchStats(); fetchStores(); }}
              className="font-semibold underline hover:no-underline ms-4"
            >
              {t.retry}
            </button>
          </div>
        )}

        {/* Skeleton */}
        {!stats && !fetchError && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl h-24 animate-pulse" style={{ background: th.panelAlt }} />
            ))}
          </div>
        )}

        {/* Stat cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            {statCards.map(s => <StatCard key={s.label} {...s} th={th} />)}
          </div>
        )}

        {/* Stores table — each row expands to that store's submissions */}
        <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${th.border}` }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[480px]">
              <thead>
                <tr style={{ background: th.panelAlt, borderBottom: `1px solid ${th.border}` }}>
                  {['Magasin', 'Téléphone', 'Soumissions'].map(h => (
                    <th key={h} className="text-start px-4 py-3.5 text-xs font-bold uppercase tracking-wide" style={{ color: th.muted }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!stores ? (
                  <tr><td colSpan={3} className="text-center py-16" style={{ color: th.faint }}>
                    <svg className="w-5 h-5 animate-spin mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    {t.table.loading}
                  </td></tr>
                ) : stores.length === 0 ? (
                  <tr><td colSpan={3} className="text-center py-16" style={{ color: th.faint }}>Aucun magasin.</td></tr>
                ) : stores.map(s => (
                  <Fragment key={s.id}>
                    <tr onClick={() => toggleStore(s.id)} className="cursor-pointer transition-colors"
                      style={{ borderBottom: `1px solid ${th.borderSub}`, background: expanded === s.id ? th.rowHover : 'transparent' }}>
                      <td className="px-4 py-3.5 font-medium" style={{ color: th.text }}>
                        <span className="inline-block w-3 me-1.5 transition-transform" style={{ color: th.faint, transform: expanded === s.id ? 'rotate(90deg)' : 'none' }}>▸</span>
                        {s.store_name}
                      </td>
                      <td className="px-4 py-3.5" style={{ color: th.sub }}>{s.phone}</td>
                      <td className="px-4 py-3.5">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold tabular-nums" style={{ background: 'rgba(59,130,246,0.12)', color: '#60a5fa' }}>
                          {s.submission_count}
                        </span>
                      </td>
                    </tr>
                    {expanded === s.id && (
                      <tr>
                        <td colSpan={3} className="px-4 pb-4 pt-1" style={{ background: th.panelAlt }}>
                          <SubmissionsList rows={subs[s.id]} loading={subLoading === s.id} th={th}
                            onStatusChange={(pid, status) => setSubmissionStatus(s.id, pid, status)} busyId={statusBusy} />
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

      {/* Export status picker */}
      {exportFormat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setExportFormat(null)}>
          <div className="w-64 rounded-2xl p-5" style={{ background: th.panel, border: `1px solid ${th.border}` }} onClick={e => e.stopPropagation()}>
            <h3 className="font-bold mb-4 text-sm" style={{ color: th.text }}>Exporter quoi ?</h3>
            <div className="space-y-2">
              {[
                { label: 'Tout',        value: ''         },
                { label: 'Approuvés',   value: 'approved'  },
                { label: 'En attente',  value: 'pending'   },
                { label: 'Rejetés',     value: 'rejected'  },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => runExport(exportFormat, opt.value)}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium hover:opacity-80 transition-colors"
                  style={{ background: th.input, color: th.text }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
