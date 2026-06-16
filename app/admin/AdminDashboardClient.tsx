'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LanguageSwitcher from '../components/LanguageSwitcher';
import type { Locale } from '@/lib/i18n/locale';
import type { Dictionary } from '@/lib/i18n/dictionaries';

type ParticipantStatus = 'pending' | 'approved' | 'rejected';
type InvoiceStatus     = 'pending' | 'accepted' | 'rejected';

type ParticipantStats = { total: number; painters: number; approved: number; pending: number; rejected: number };
type InvoiceStats     = { total: number; accepted: number; avg_amount: string | null; needs_attention: number };
type Stats            = { participants: ParticipantStats; invoices: InvoiceStats };

type Participant = {
  needs_attention?: number;
  id: number; full_name: string; phone: string; wilaya: string;
  is_painter: number; status: ParticipantStatus; created_at: string;
  invoice_count: number; best_invoice: number | null;
  accepted_count?: number; rejected_count?: number;
  total_amount?: string | null;
  submission_count?: number;
};

type Invoice = {
  id: number; participant_id: number; filename: string; original_name: string;
  amount_detected: string | null; status: InvoiceStatus; uploaded_at: string;
  duplicate_flag?: number;
};

type Submission = { id: number; status: ParticipantStatus; created_at: string; wilaya: string };

// ── Theme ─────────────────────────────────────────────────────────────────────

function getTheme(dark: boolean) {
  if (dark) return {
    page: '#08080f', panel: 'rgba(255,255,255,0.03)', panelAlt: 'rgba(255,255,255,0.04)',
    border: 'rgba(255,255,255,0.07)', borderSub: 'rgba(255,255,255,0.06)',
    input: 'rgba(255,255,255,0.05)', text: '#f9fafb',
    sub: 'rgba(255,255,255,0.5)', muted: 'rgba(255,255,255,0.35)', faint: 'rgba(255,255,255,0.2)',
    headerBg: 'rgba(8,8,15,0.92)', rowHover: 'rgba(255,255,255,0.03)',
    cardBg: 'rgba(255,255,255,0.04)', selectBg: '#0f0f1c',
  } as const;
  return {
    page: '#f3f3fa', panel: '#ffffff', panelAlt: '#f8f8fd',
    border: 'rgba(0,0,0,0.09)', borderSub: 'rgba(0,0,0,0.06)',
    input: 'rgba(0,0,0,0.04)', text: '#0d0d1a',
    sub: 'rgba(0,0,0,0.55)', muted: 'rgba(0,0,0,0.4)', faint: 'rgba(0,0,0,0.25)',
    headerBg: 'rgba(243,243,250,0.95)', rowHover: 'rgba(0,0,0,0.025)',
    cardBg: 'rgba(0,0,0,0.03)', selectBg: '#ffffff',
  } as const;
}
type Theme = ReturnType<typeof getTheme>;

function ThemeToggle({ dark, onToggle, dict }: { dark: boolean; onToggle: () => void; dict: Dictionary }) {
  return (
    <button
      onClick={onToggle}
      className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90"
      style={{ background: dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)', border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` }}
      aria-label={dark ? dict.landing.themeToggle.toLight : dict.landing.themeToggle.toDark}
    >
      {dark ? (
        <svg style={{ width: 18, height: 18 }} className="text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z" />
        </svg>
      ) : (
        <svg style={{ width: 18, height: 18 }} className="text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      )}
    </button>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ s, dict }: { s: ParticipantStatus | InvoiceStatus; dict: Dictionary }) {
  const labels = dict.admin.dashboard.statusBadge;
  const cfg: Record<string, { bg: string; color: string; label: string }> = {
    pending:  { bg: 'rgba(234,179,8,0.12)',  color: '#fbbf24', label: labels.pending },
    approved: { bg: 'rgba(16,185,129,0.12)', color: '#34d399', label: labels.approved },
    rejected: { bg: 'rgba(248,113,113,0.15)',  color: '#ef4444', label: labels.rejected },
    accepted: { bg: 'rgba(16,185,129,0.12)', color: '#34d399', label: labels.accepted },
  };
  const c = cfg[s] ?? { bg: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', label: s };
  return (
    <span
      className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
      style={{ background: c.bg, color: c.color }}
    >
      {c.label}
    </span>
  );
}

// ── Invoice card ──────────────────────────────────────────────────────────────

function InvoiceCard({
  inv, onAmountUpdate, onStatusChange, dict, th,
}: {
  inv: Invoice;
  onAmountUpdate: (id: number, amount: number) => void;
  onStatusChange: (id: number, status: 'accepted' | 'rejected') => void;
  dict: Dictionary;
  th: Theme;
}) {
  const t = dict.admin.dashboard.invoiceCard;
  const [editing,     setEditing]     = useState(false);
  const [amountInput, setAmountInput] = useState(inv.amount_detected ?? '');
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');
  const [retrying,    setRetrying]    = useState(false);
  const [retryMsg,    setRetryMsg]    = useState('');

  async function retryAnalysis() {
    setRetrying(true); setRetryMsg('');
    try {
      const res  = await fetch(`/api/admin/invoice/${inv.id}/retry`, { method: 'POST', headers: { 'x-requested-with': 'XMLHttpRequest' } });
      const data = await res.json() as { message?: string; error?: string };
      setRetryMsg(res.ok ? (data.message ?? t.retryDefaultMessage) : (data.error ?? t.retryErrorFallback));
    } catch { setRetryMsg(t.retryNetworkError); }
    finally  { setRetrying(false); }
  }

  async function saveAmount() {
    const val = parseFloat(amountInput);
    if (isNaN(val) || val < 0) { setError(t.invalidAmount); return; }
    setSaving(true); setError('');
    try {
      const res = await fetch(`/api/admin/invoice/${inv.id}/amount`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-requested-with': 'XMLHttpRequest' },
        body: JSON.stringify({ amount: val }),
      });
      if (!res.ok) { setError(t.saveErrorFallback); return; }
      onAmountUpdate(inv.id, val);
      setEditing(false);
    } finally { setSaving(false); }
  }

  const amountOk = Number(inv.amount_detected) >= 20000;

  return (
    <div
      className="rounded-xl p-3.5 text-xs space-y-2"
      style={{ background: th.cardBg, border: `1px solid ${th.border}` }}
    >
      <div className="flex justify-between items-center gap-2">
        <span className="font-medium truncate max-w-32" style={{ color: th.sub }}>{inv.original_name}</span>
        <div className="flex items-center gap-1.5 shrink-0">
          {inv.duplicate_flag === 1 && (
            <span
              title={t.duplicateTooltip}
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{ background: 'rgba(249,115,22,0.18)', color: '#fdba74' }}
            >
              {t.duplicateBadge}
            </span>
          )}
          <StatusBadge s={inv.status} dict={dict} />
        </div>
      </div>

      <div className="flex items-center gap-2">
        {inv.status !== 'accepted' && (
          <button onClick={() => onStatusChange(inv.id, 'accepted')}
            className="text-[11px] font-bold px-2 py-1 rounded-lg transition-colors active:scale-95"
            style={{ background: 'rgba(16,185,129,0.12)', color: '#34d399', border: '1px solid rgba(16,185,129,0.35)' }}>
            ✓ {t.accept}
          </button>
        )}
        {inv.status !== 'rejected' && (
          <button onClick={() => onStatusChange(inv.id, 'rejected')}
            className="text-[11px] font-bold px-2 py-1 rounded-lg transition-colors active:scale-95"
            style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.35)' }}>
            ✗ {t.rejectInvoice}
          </button>
        )}
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <span style={{ color: th.muted }}>{t.amount}</span>
        {editing ? (
          <div className="flex items-center gap-1">
            <input
              type="number" value={amountInput}
              onChange={e => setAmountInput(e.target.value)}
              autoFocus
              className="rounded px-1.5 py-0.5 text-xs w-20 outline-none"
              style={{ background: th.input, border: '1px solid rgba(239,68,68,0.4)', color: th.text }}
            />
            <span style={{ color: th.muted }}>DA</span>
            <button onClick={saveAmount} disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-1.5 py-0.5 rounded text-xs font-semibold disabled:opacity-40 transition-colors">
              {saving ? '…' : '✓'}
            </button>
            <button onClick={() => { setEditing(false); setAmountInput(inv.amount_detected ?? ''); setError(''); }}
              className="rounded px-1.5 py-0.5 text-xs transition-colors"
              style={{ background: th.input, color: th.muted }}>
              ✗
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className={`font-bold ${amountOk ? 'text-emerald-400' : 'text-red-400'}`}>
              {inv.amount_detected ? `${Number(inv.amount_detected).toLocaleString('fr-DZ')} DA` : t.notDetected}
            </span>
            <button onClick={() => setEditing(true)}
              className="hover:text-amber-400 transition-colors" style={{ color: th.faint }} title={t.edit}>
              <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11.013 2.513a1.75 1.75 0 012.475 2.474L5.361 13.115l-3 .638.638-3z"/>
              </svg>
            </button>
          </div>
        )}
        {error && <span className="text-red-400 w-full">{error}</span>}
      </div>

      <div style={{ color: th.faint }}>{new Date(inv.uploaded_at).toLocaleString('fr-DZ')}</div>

      {inv.status !== 'accepted' && (
        <div className="flex items-center gap-2">
          <button onClick={retryAnalysis} disabled={retrying}
            className="text-[11px] font-semibold px-2 py-1 rounded-lg transition-colors disabled:opacity-40"
            style={{ background: 'rgba(59,130,246,0.12)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)' }}>
            {retrying ? t.retrying : t.retry}
          </button>
          {retryMsg && <span className="text-[11px] text-blue-400">{retryMsg}</span>}
        </div>
      )}

      <a
        href={`/api/admin/invoice/${inv.filename}`}
        target="_blank"
        className="inline-flex items-center gap-1 text-red-400 hover:text-red-300 transition-colors font-semibold"
      >
        {t.viewFile}
        <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 8h10M9 4l4 4-4 4"/>
        </svg>
      </a>
    </div>
  );
}

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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminDashboardClient({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const router = useRouter();
  const t = dict.admin.dashboard;
  const [stats,        setStats]        = useState<Stats | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [total,        setTotal]        = useState(0);
  const [page,         setPage]         = useState(1);
  const [pages,        setPages]        = useState(1);
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected,     setSelected]     = useState<Participant | null>(null);
  const [exportFormat, setExportFormat] = useState<'csv' | 'xlsx' | 'pdf' | null>(null);
  const [invoices,     setInvoices]     = useState<Invoice[]>([]);
  const [submissions,  setSubmissions]  = useState<Submission[]>([]);
  const [loadingList,  setLoadingList]  = useState(false);
  const [fetchError,   setFetchError]   = useState('');
  const [dark, setDark] = useState(true); // matches server-rendered default, synced from localStorage below
  const th = getTheme(dark);

  useEffect(() => {
    // ponytail: one-time sync from localStorage on mount to avoid SSR/client
    // hydration mismatch (server has no access to it); the lint rule's
    // "no setState in effect" guidance doesn't apply to this external-system read.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDark(localStorage.getItem('jotun-admin-theme') !== 'light');
  }, []);

  useEffect(() => {
    localStorage.setItem('jotun-admin-theme', dark ? 'dark' : 'light');
  }, [dark]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stats');
      if (res.status === 401) { router.push('/admin/login'); return; }
      if (!res.ok) throw new Error();
      setStats(await res.json() as Stats);
    } catch { setFetchError(t.statsError); }
  }, [router, t.statsError]);

  const fetchParticipants = useCallback(async (p = 1) => {
    setLoadingList(true); setFetchError('');
    try {
      const params = new URLSearchParams({ page: String(p), search, status: statusFilter });
      const res = await fetch(`/api/admin/participants?${params}`);
      if (res.status === 401) { router.push('/admin/login'); return; }
      if (!res.ok) throw new Error();
      const data = await res.json() as { participants: Participant[]; total: number; pages: number };
      setParticipants(data.participants);
      setTotal(data.total);
      setPages(data.pages);
      setPage(p);
    } catch { setFetchError(t.listError); }
    finally  { setLoadingList(false); }
  }, [router, search, statusFilter, t.listError]);

  async function openParticipant(id: number) {
    try {
      const res  = await fetch(`/api/admin/participants/${id}`);
      if (!res.ok) throw new Error();
      const data = await res.json() as { participant: Participant; invoices: Invoice[]; submissions: Submission[] };
      setSelected(data.participant);
      setInvoices(data.invoices);
      setSubmissions(data.submissions);
    } catch { setFetchError(t.participantError); }
  }

  async function updateStatus(id: number, status: ParticipantStatus) {
    await fetch(`/api/admin/participants/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-requested-with': 'XMLHttpRequest' },
      body: JSON.stringify({ status }),
    });
    fetchParticipants(page);
    fetchStats();
    if (selected) openParticipant(selected.id);
  }

  async function setInvoiceStatus(id: number, status: 'accepted' | 'rejected') {
    await fetch(`/api/admin/invoice/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-requested-with': 'XMLHttpRequest' },
      body: JSON.stringify({ status }),
    });
    fetchParticipants(page);
    fetchStats();
    if (selected) openParticipant(selected.id);
  }

  function runExport(format: 'csv' | 'xlsx' | 'pdf', status: string) {
    const params = new URLSearchParams({ search, status });
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
      await fetchParticipants(1);
    })();
    return () => { cancelled = true; };
  }, [fetchStats, fetchParticipants]);

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

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40 px-6 py-3.5 flex items-center gap-3"
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
          <ThemeToggle dark={dark} onToggle={() => setDark(d => !d)} dict={dict} />
          <LanguageSwitcher locale={locale} dark={dark} />

          {/* Export buttons */}
          <div className="flex rounded-xl overflow-hidden" style={{ border: `1px solid ${th.border}` }}>
            <button onClick={() => setExportFormat('csv')}
              className="px-3 py-1.5 text-xs font-semibold transition-colors text-emerald-400 hover:text-emerald-300"
              style={{ background: 'rgba(16,185,129,0.08)' }}>
              CSV
            </button>
            <button onClick={() => setExportFormat('xlsx')}
              className="px-3 py-1.5 text-xs font-semibold transition-colors text-blue-400 hover:text-blue-300"
              style={{ background: 'rgba(59,130,246,0.08)', borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
              Excel
            </button>
            <button onClick={() => setExportFormat('pdf')}
              className="px-3 py-1.5 text-xs font-semibold transition-colors text-blue-400 hover:text-blue-300"
              style={{ background: 'rgba(13,42,148,0.08)', borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
              PDF
            </button>
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-xs hover:text-blue-400 transition-colors px-3 py-1.5 rounded-lg"
            style={{ border: `1px solid ${th.border}`, color: th.muted }}
          >
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M10 11l3-3-3-3M13 8H6"/>
            </svg>
            {t.logout}
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Error banner */}
        {fetchError && (
          <div
              className="mb-6 rounded-2xl px-5 py-4 flex justify-between items-center text-sm"
              style={{ background: 'rgba(13,42,148,0.08)', border: '1px solid rgba(13,42,148,0.2)', color: '#9fb3f0' }}
            >
            <span>{fetchError}</span>
            <button
              onClick={() => { setFetchError(''); fetchStats(); fetchParticipants(page); }}
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

        {/* Search + filter bar */}
        <div
          className="rounded-2xl px-5 py-4 mb-5 flex flex-wrap gap-3 items-center"
          style={{ background: th.panel, border: `1px solid ${th.border}` }}
        >
          <div className="relative flex-1 min-w-48">
            <svg viewBox="0 0 20 20" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: th.faint }} fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
            </svg>
            <input
              type="text"
              placeholder={t.filters.searchPlaceholder}
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchParticipants(1)}
              className="w-full rounded-xl ps-9 pe-3 py-2.5 text-sm outline-none transition-all"
              style={{ background: th.input, border: `1px solid ${th.border}`, color: th.text }}
              onFocus={e => { e.currentTarget.style.border = '1px solid rgba(13,42,148,0.4)'; }}
              onBlur={e =>  { e.currentTarget.style.border = `1px solid ${th.border}`; }}
            />
          </div>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="rounded-xl px-3 py-2.5 text-sm outline-none appearance-none transition-all"
            style={{ background: th.input, border: `1px solid ${th.border}`, color: th.text, colorScheme: dark ? 'dark' : 'light', minWidth: '140px' }}
            onFocus={e => { e.currentTarget.style.border = '1px solid rgba(13,42,148,0.4)'; }}
            onBlur={e =>  { e.currentTarget.style.border = `1px solid ${th.border}`; }}
          >
            <option value=""         style={{ background: th.selectBg }}>{t.filters.allStatuses}</option>
            <option value="pending"  style={{ background: th.selectBg }}>{t.filters.pending}</option>
            <option value="approved" style={{ background: th.selectBg }}>{t.filters.approved}</option>
            <option value="rejected" style={{ background: th.selectBg }}>{t.filters.rejected}</option>
          </select>

          <button
            onClick={() => fetchParticipants(1)}
            className="font-semibold text-sm text-white px-5 py-2.5 rounded-xl transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg,#0d2a94,#072060)', boxShadow: '0 0 16px rgba(13,42,148,0.3)' }}
          >
            {t.filters.submit}
          </button>

          <span className="text-xs ms-auto" style={{ color: th.muted }}>{total} {t.filters.results}</span>
        </div>

        {/* Main layout */}
        <div className="flex gap-5 items-start">

          {/* Table */}
          <div className="flex-1 min-w-0 rounded-2xl overflow-hidden" style={{ border: `1px solid ${th.border}` }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: th.panelAlt, borderBottom: `1px solid ${th.border}` }}>
                    {[t.table.headers.name, t.table.headers.phone, t.table.headers.wilaya, t.table.headers.painter, t.table.headers.status, t.table.headers.invoices, t.table.headers.date, t.table.headers.actions].map(h => (
                      <th key={h} className="text-start px-4 py-3.5 text-xs font-bold uppercase tracking-wide" style={{ color: th.muted }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loadingList ? (
                    <tr><td colSpan={8} className="text-center py-16" style={{ color: th.faint }}>
                      <svg className="w-5 h-5 animate-spin mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      {t.table.loading}
                    </td></tr>
                  ) : participants.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-16" style={{ color: th.faint }}>{t.table.empty}</td></tr>
                  ) : participants.map(p => (
                    <tr
                      key={p.id}
                      onClick={() => openParticipant(p.id)}
                      className="cursor-pointer transition-colors"
                      style={{
                        borderBottom: `1px solid ${th.borderSub}`,
                        background: selected?.id === p.id ? 'rgba(239,68,68,0.06)' : 'transparent',
                      }}
                      onMouseEnter={e => { if (selected?.id !== p.id) (e.currentTarget as HTMLElement).style.background = th.rowHover; }}
                      onMouseLeave={e => { if (selected?.id !== p.id) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      <td className="px-4 py-3.5 font-medium" style={{ color: th.text }}>
                        {p.full_name}
                        {(p.needs_attention ?? 0) > 0 && (
                          <span
                            className="ms-2 inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full align-middle"
                            style={{ background: 'rgba(251,146,60,0.15)', color: '#fb923c' }}
                            title={t.table.verifyTitle}
                          >
                            {t.table.verifyBadge}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5" style={{ color: th.sub }}>
                        {p.phone}
                        {(p.submission_count ?? 1) > 1 && (
                          <span
                            title={t.table.phoneResubmittedTooltip}
                            className="ms-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold align-middle"
                            style={{ background: 'rgba(59,130,246,0.2)', color: '#93c5fd' }}
                          >
                            {t.table.phoneResubmittedBadge} {p.submission_count}× ▾
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5" style={{ color: th.sub }}>{p.wilaya}</td>
                      <td className="px-4 py-3.5 text-center">
                        {p.is_painter ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-md" style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399' }}>
✓                          </span>
                        ) : (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-md" style={{ background: 'rgba(248,113,113,0.15)', color: '#ef4444' }}>
✗                         </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5"><StatusBadge s={p.status} dict={dict} /></td>
                      <td className="px-4 py-3.5">
                        <span className="font-bold tabular-nums" style={{ color: th.sub }}>{p.invoice_count} -</span>
                        <span className="ms-1.5 text-xs font-semibold text-emerald-400">✓{p.accepted_count ?? 0}</span>
                        <span className="ms-1.5 text-xs font-semibold text-red-400">✗{p.rejected_count ?? 0}</span>
                        {Number(p.total_amount) > 0 && (
                          <span className="ms-2 text-xs font-semibold text-emerald-400">
                            {Number(p.total_amount).toLocaleString('fr-DZ')} DA
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-xs" style={{ color: th.muted }}>{new Date(p.created_at).toLocaleDateString('fr-DZ')}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                          {p.status !== 'approved' && (
                            <button onClick={() => updateStatus(p.id, 'approved')}
                              className="text-xs font-bold px-2 py-1 rounded-lg transition-colors"
                              style={{ background: 'rgba(16,185,129,0.12)', color: '#34d399' }}
                              title={t.table.approveTitle}>
                              ✓
                            </button>
                          )}
                          {p.status !== 'rejected' && (
                            <button onClick={() => updateStatus(p.id, 'rejected')}
                              className="text-xs font-bold px-2 py-1 rounded-lg transition-colors"
                              style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171' }}
                              title={t.table.rejectTitle}>
                              ✗
                            </button>
                          )}
                          {p.status !== 'pending' && (
                            <button onClick={() => updateStatus(p.id, 'pending')}
                              className="text-xs font-bold px-2 py-1 rounded-lg transition-colors"
                              style={{ background: 'rgba(234,179,8,0.12)', color: '#fbbf24' }}
                              title={t.table.pendingTitle}>
                              ?
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pages > 1 && (
              <div
                className="flex items-center justify-center gap-3 p-4"
                style={{ borderTop: `1px solid ${th.borderSub}` }}
              >
                <button
                  onClick={() => fetchParticipants(page - 1)} disabled={page === 1}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-colors disabled:opacity-30"
                  style={{ background: th.input, color: th.sub }}
                >
                  {locale === 'ar' ? '→' : '←'}
                </button>
                <span className="text-sm" style={{ color: th.muted }}>{t.table.page} {page} / {pages}</span>
                <button
                  onClick={() => fetchParticipants(page + 1)} disabled={page === pages}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-colors disabled:opacity-30"
                  style={{ background: th.input, color: th.sub }}
                >
                  {locale === 'ar' ? '←' : '→'}
                </button>
              </div>
            )}
          </div>

          {/* Detail panel */}
          {selected && (
            <div
              className="w-80 shrink-0 rounded-2xl p-5 h-fit sticky top-20 overflow-y-auto"
              style={{
                background: th.panel,
                border: `1px solid ${th.border}`,
                maxHeight: 'calc(100vh - 100px)',
              }}
            >
              {/* Top accent */}
              <div className="absolute top-0 left-0 right-0 h-px rounded-t-2xl" style={{ background: 'linear-gradient(90deg,transparent,rgba(239,68,68,0.5),transparent)' }} aria-hidden />

              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold" style={{ color: th.text }}>{t.detail.title}</h3>
                <button
                  onClick={() => setSelected(null)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-80 transition-colors"
                  style={{ background: th.input, color: th.muted }}
                >
                  <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M12 4L4 12M4 4l8 8"/>
                  </svg>
                </button>
              </div>

              {/* Info rows */}
              <div className="space-y-2.5 text-sm mb-5 pb-5" style={{ borderBottom: `1px solid ${th.border}` }}>
                {[
                  { label: t.detail.name,  value: selected.full_name },
                  { label: t.detail.phone, value: selected.phone     },
                ].map(row => (
                  <div key={row.label} className="flex justify-between items-start gap-3">
                    <span style={{ color: th.muted }}>{row.label}</span>
                    <span className="font-medium text-end text-xs" style={{ color: th.text }}>{row.value}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center gap-3">
                  <span style={{ color: th.muted }}>{t.detail.totalAmount}</span>
                  <span className="font-bold text-end text-xs text-emerald-400">
                    {invoices.filter(i => i.status === 'accepted').reduce((sum, i) => sum + Number(i.amount_detected ?? 0), 0).toLocaleString('fr-DZ')} DA
                  </span>
                </div>
                <div className="flex justify-between items-center gap-3">
                  <span style={{ color: th.muted }}>{t.table.phoneResubmittedBadge}</span>
                  <span className="font-medium text-end text-xs" style={{ color: '#93c5fd' }}>{submissions.length} {t.detail.submissionsCount}</span>
                </div>
              </div>

              {/* Each registration for this phone, with its own invoices */}
              <div className="space-y-4">
                {submissions.map(sub => {
                  const subInvoices = invoices.filter(i => i.participant_id === sub.id);
                  return (
                    <div key={sub.id} className="pb-4" style={{ borderBottom: `1px solid ${th.borderSub}` }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs" style={{ color: th.muted }}>
                          {sub.wilaya} · {new Date(sub.created_at).toLocaleDateString('fr-DZ')}
                        </span>
                        <StatusBadge s={sub.status} dict={dict} />
                      </div>
                      <div className="flex gap-2 mb-2.5">
                        <button
                          onClick={() => updateStatus(sub.id, 'approved')}
                          className="flex-1 text-xs font-bold py-1.5 rounded-lg transition-all active:scale-95"
                          style={{ background: 'rgba(16,185,129,0.12)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)' }}
                        >
                          {t.detail.approve}
                        </button>
                        <button
                          onClick={() => updateStatus(sub.id, 'rejected')}
                          className="flex-1 text-xs font-bold py-1.5 rounded-lg transition-all active:scale-95"
                          style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
                        >
                          {t.detail.reject}
                        </button>
                      </div>
                      {subInvoices.length === 0 ? (
                        <p className="text-xs" style={{ color: th.faint }}>{t.detail.noInvoices}</p>
                      ) : (
                        <div className="space-y-2">
                          {subInvoices.map(inv => (
                            <InvoiceCard
                              key={inv.id}
                              inv={inv}
                              dict={dict}
                              th={th}
                              onAmountUpdate={(id, newAmount) => {
                                setInvoices(prev => prev.map(i => i.id === id ? { ...i, amount_detected: String(newAmount) } : i));
                              }}
                              onStatusChange={setInvoiceStatus}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
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
