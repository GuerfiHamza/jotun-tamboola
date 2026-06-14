'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type ParticipantStatus = 'pending' | 'approved' | 'rejected';
type InvoiceStatus = 'pending' | 'accepted' | 'rejected';

type ParticipantStats = {
  total: number;
  painters: number;
  approved: number;
  pending: number;
  rejected: number;
};

type InvoiceStats = {
  total: number;
  accepted: number;
  avg_amount: string | null;
  needs_attention: number;
};

type Stats = {
  participants: ParticipantStats;
  invoices: InvoiceStats;
};

type Participant = {
  needs_attention?: number;
  id: number;
  full_name: string;
  phone: string;
  wilaya: string;
  is_painter: number;
  status: ParticipantStatus;
  created_at: string;
  invoice_count: number;
  best_invoice: number | null;
};

type Invoice = {
  id: number;
  filename: string;
  original_name: string;
  amount_detected: string | null;
  status: InvoiceStatus;
  uploaded_at: string;
};

function InvoiceCard({
  inv,
  statusBadge,
  onAmountUpdate,
}: {
  inv: Invoice;
  statusBadge: (s: ParticipantStatus | InvoiceStatus) => React.ReactNode;
  onAmountUpdate: (id: number, amount: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [amountInput, setAmountInput] = useState(inv.amount_detected ?? '');
  const [retrying, setRetrying] = useState(false);
  const [retryMsg, setRetryMsg] = useState('');

  async function retryAnalysis() {
    setRetrying(true); setRetryMsg('');
    try {
      const res = await fetch(`/api/admin/invoice/${inv.id}/retry`, {
        method: 'POST',
        headers: { 'x-requested-with': 'XMLHttpRequest' },
      });
      const data = await res.json() as { message?: string; error?: string };
      setRetryMsg(res.ok ? (data.message ?? 'Analyse relancée.') : (data.error ?? 'Erreur.'));
    } catch {
      setRetryMsg('Erreur réseau.');
    } finally {
      setRetrying(false);
    }
  }
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function saveAmount() {
    const val = parseFloat(amountInput);
    if (isNaN(val) || val < 0) { setError('Montant invalide'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/invoice/${inv.id}/amount`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-requested-with': 'XMLHttpRequest' },
        body: JSON.stringify({ amount: val }),
      });
      if (!res.ok) { setError('Erreur lors de la sauvegarde'); return; }
      onAmountUpdate(inv.id, val);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-gray-50 rounded-lg p-3 text-xs">
      <div className="flex justify-between items-center mb-1">
        <span className="font-medium text-gray-700 truncate max-w-32">{inv.original_name}</span>
        {statusBadge(inv.status)}
      </div>

      <div className="text-gray-500 mt-1">
        <div className="flex items-center gap-1 flex-wrap">
          <span>Montant :</span>
          {editing ? (
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={amountInput}
                onChange={e => setAmountInput(e.target.value)}
                className="border border-gray-300 rounded px-1.5 py-0.5 text-xs w-24 focus:outline-none focus:border-red-400"
                autoFocus
              />
              <span className="text-gray-400">DA</span>
              <button onClick={saveAmount} disabled={saving}
                className="bg-green-600 hover:bg-green-700 text-white px-1.5 py-0.5 rounded text-xs font-semibold disabled:opacity-50">
                {saving ? '...' : '✓'}
              </button>
              <button onClick={() => { setEditing(false); setAmountInput(inv.amount_detected ?? ''); setError(''); }}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-1.5 py-0.5 rounded text-xs">✗</button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <span className={`font-semibold ${Number(inv.amount_detected) >= 20000 ? 'text-green-700' : 'text-red-600'}`}>
                {inv.amount_detected ? `${Number(inv.amount_detected).toLocaleString('fr-DZ')} DA` : 'Non détecté'}
              </span>
              <button onClick={() => setEditing(true)}
                className="text-gray-400 hover:text-red-600 transition-colors ml-1" title="Modifier">
                ✏️
              </button>
            </div>
          )}
        </div>
        {error && <p className="text-red-500 mt-0.5">{error}</p>}
      </div>

      <div className="text-gray-400 mt-1">{new Date(inv.uploaded_at).toLocaleString('fr-DZ')}</div>
      {inv.status !== 'accepted' && (
        <div className="mt-1.5">
          <button onClick={retryAnalysis} disabled={retrying}
            className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2 py-1 rounded-md font-semibold disabled:opacity-50 transition-colors">
            {retrying ? '⏳ Relance...' : '🔄 Relancer l\u2019analyse auto'}
          </button>
          {retryMsg && <span className="ml-2 text-[11px] text-blue-700">{retryMsg}</span>}
        </div>
      )}
      <a href={`/api/admin/invoice/${inv.filename}`} target="_blank"
        className="text-red-600 hover:underline mt-1 inline-block">Voir le fichier →</a>
    </div>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<Participant | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [fetchError, setFetchError] = useState('');

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stats');
      if (res.status === 401) { router.push('/admin/login'); return; }
      if (!res.ok) throw new Error();
      setStats(await res.json() as Stats);
    } catch {
      setFetchError('Impossible de charger les statistiques.');
    }
  }, [router]);

  const fetchParticipants = useCallback(async (p = 1) => {
    setLoadingList(true);
    setFetchError('');
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
    } catch {
      setFetchError('Erreur de chargement de la liste. Réessayez.');
    } finally {
      setLoadingList(false);
    }
  }, [router, search, statusFilter]);

  async function openParticipant(id: number) {
    try {
      const res = await fetch(`/api/admin/participants/${id}`);
      if (!res.ok) throw new Error();
      const data = await res.json() as { participant: Participant; invoices: Invoice[] };
      setSelected(data.participant);
      setInvoices(data.invoices);
    } catch {
      setFetchError('Impossible de charger ce participant.');
    }
  }

  async function updateStatus(id: number, status: ParticipantStatus) {
    await fetch(`/api/admin/participants/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-requested-with': 'XMLHttpRequest' },
      body: JSON.stringify({ status }),
    });
    fetchParticipants(page);
    fetchStats();
    if (selected?.id === id) {
      setSelected(s => s ? { ...s, status } : null);
      // Approval also accepts pending invoices server-side — refetch the
      // detail so the invoice badges reflect the change immediately.
      if (status === 'approved') openParticipant(id);
    }
  }

  function exportAs(format: 'csv' | 'xlsx' | 'pdf') {
    const params = new URLSearchParams({ search, status: statusFilter });
    const path = format === 'csv' ? '/api/admin/export' : `/api/admin/export/${format}`;
    window.location.href = `${path}?${params}`;
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

  const statusBadge = (s: ParticipantStatus | InvoiceStatus) => {
    const map: Record<string, string> = {
      pending:  'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      accepted: 'bg-green-100 text-green-800',
    };
    const labels: Record<string, string> = {
      pending:  'En attente',
      approved: 'Approuvé',
      rejected: 'Refusé',
      accepted: 'Accepté',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${map[s] ?? 'bg-gray-100 text-gray-600'}`}>
        {labels[s] ?? s}
      </span>
    );
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b-2 border-red-600 px-6 py-3 flex items-center gap-3">
        <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">J</div>
        <span className="font-bold text-gray-900">Jotun Tamboola</span>
        <span className="text-xs bg-red-100 text-red-700 rounded-full px-2 py-0.5 font-semibold ml-1">Admin</span>
        <div className="ml-auto flex items-center gap-4">
          <span className="text-xs text-gray-400">Dashboard</span>
          <span className="inline-flex rounded-lg overflow-hidden mr-2 shadow-sm">
            <button onClick={() => exportAs('csv')} className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 text-sm font-semibold transition-colors">⬇ CSV</button>
            <button onClick={() => exportAs('xlsx')} className="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-2 text-sm font-semibold transition-colors border-l border-white/20">Excel</button>
            <button onClick={() => exportAs('pdf')} className="bg-red-700 hover:bg-red-800 text-white px-3 py-2 text-sm font-semibold transition-colors border-l border-white/20">PDF</button>
          </span>
          <button onClick={logout} className="text-sm text-gray-500 hover:text-red-600 transition-colors">
            Déconnexion →
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {fetchError && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 flex justify-between items-center">
            <span>{fetchError}</span>
            <button onClick={() => { setFetchError(''); fetchStats(); fetchParticipants(page); }} className="font-semibold underline">Réessayer</button>
          </div>
        )}
        {!stats && !fetchError && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse h-20" />
            ))}
          </div>
        )}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
            {([
              { label: 'Total inscrits',    value: stats.participants.total,    color: 'text-gray-900'   },
              { label: 'Peintres',          value: stats.participants.painters, color: 'text-red-600'    },
              { label: 'Approuvés',         value: stats.participants.approved, color: 'text-green-700'  },
              { label: 'En attente',        value: stats.participants.pending,  color: 'text-yellow-700' },
              { label: 'Factures soumises', value: stats.invoices.total,        color: 'text-gray-900'   },
              { label: '⚠ À vérifier',       value: stats.invoices.needs_attention, color: 'text-amber-600' },
            ] as const).map(s => (
              <div key={s.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{s.label}</div>
                <div className={`text-2xl font-bold ${s.color}`}>{s.value ?? 0}</div>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4 flex flex-wrap gap-3 items-center text-black">
          <input
            type="text"
            placeholder="🔍 Rechercher par nom ou téléphone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchParticipants(1)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-48 focus:outline-none focus:border-red-500"
          />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-red-500 text-black"
          >
            <option value="">Tous les statuts</option>
            <option value="pending">En attente</option>
            <option value="approved">Approuvés</option>
            <option value="rejected">Refusés</option>
          </select>
          <button onClick={() => fetchParticipants(1)}
            className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
            Filtrer
          </button>
          <span className="text-xs text-gray-400 ml-auto">{total} résultat(s)</span>
        </div>

        <div className="flex gap-4">
          <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 font-semibold text-black">Nom</th>
                    <th className="text-left px-4 py-3 font-semibold text-black">Téléphone</th>
                    <th className="text-left px-4 py-3 font-semibold text-black">Wilaya</th>
                    <th className="text-left px-4 py-3 font-semibold text-black">Peintre</th>
                    <th className="text-left px-4 py-3 font-semibold text-black">Statut</th>
                    <th className="text-left px-4 py-3 font-semibold text-black">Factures</th>
                    <th className="text-left px-4 py-3 font-semibold text-black">Date</th>
                    <th className="text-left px-4 py-3 font-semibold text-black">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingList ? (
                    <tr><td colSpan={8} className="text-center py-10 text-gray-400">Chargement...</td></tr>
                  ) : participants.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-10 text-gray-400">Aucun résultat</td></tr>
                  ) : participants.map(p => (
                    <tr key={p.id}
                      className={`border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors ${selected?.id === p.id ? 'bg-red-50' : ''}`}
                      onClick={() => openParticipant(p.id)}>
                      <td className="px-4 py-3 font-medium text-black">
                        {p.full_name}
                        {(p.needs_attention ?? 0) > 0 && (
                          <span className="ml-2 inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full align-middle" title="Facture non validée automatiquement — vérification manuelle requise">
                            ⚠ À vérifier
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{p.phone}</td>
                      <td className="px-4 py-3 text-gray-600">{p.wilaya}</td>
                      <td className="px-4 py-3 text-center">{p.is_painter ? '🖌️' : '—'}</td>
                      <td className="px-4 py-3">{statusBadge(p.status)}</td>
<td className="px-4 py-3 text-center">
  <span className="bg-gray-100 text-gray-700 rounded-full px-2 py-0.5 text-xs font-bold">
    {p.invoice_count}
  </span>
  {p.best_invoice && (
    <span className={`ml-1 text-xs font-semibold ${p.best_invoice >= 20000 ? 'text-green-700' : 'text-red-600'}`}>
      {Number(p.best_invoice).toLocaleString('fr-DZ')} DA
    </span>
  )}
</td>                     
                      <td className="px-4 py-3 text-gray-400 text-xs">{new Date(p.created_at).toLocaleDateString('fr-DZ')}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                          {p.status !== 'approved' && (
                            <button onClick={() => updateStatus(p.id, 'approved')}
                              className="bg-green-100 hover:bg-green-200 text-green-800 text-xs font-semibold px-2 py-1 rounded-md transition-colors">✓</button>
                          )}
                          {p.status !== 'rejected' && (
                            <button onClick={() => updateStatus(p.id, 'rejected')}
                              className="bg-red-100 hover:bg-red-200 text-red-800 text-xs font-semibold px-2 py-1 rounded-md transition-colors">✗</button>
                          )}
                          {p.status !== 'pending' && (
                            <button onClick={() => updateStatus(p.id, 'pending')}
                              className="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 text-xs font-semibold px-2 py-1 rounded-md transition-colors">?</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pages > 1 && (
              <div className="flex items-center justify-center gap-2 p-4 border-t border-gray-100">
                <button onClick={() => fetchParticipants(page - 1)} disabled={page === 1}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">←</button>
                <span className="text-sm text-gray-600">Page {page} / {pages}</span>
                <button onClick={() => fetchParticipants(page + 1)} disabled={page === pages}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">→</button>
              </div>
            )}
          </div>

          {selected && (
            <div className="w-80 flex-shrink-0 bg-white rounded-xl shadow-sm border border-gray-100 p-5 h-fit sticky top-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">Détails</h3>
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-lg">×</button>
              </div>

              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between"><span className="text-black">Nom</span><span className="font-medium text-black">{selected.full_name}</span></div>
                <div className="flex justify-between"><span className="text-black">Tél</span><span className="text-black">{selected.phone}</span></div>
                <div className="flex justify-between"><span className="text-black">Wilaya</span><span className="text-black">{selected.wilaya}</span></div>
                <div className="flex justify-between"><span className="text-black">Peintre</span><span className="text-black">{selected.is_painter ? '✅ Oui' : '❌ Non'}</span></div>
                <div className="flex justify-between items-center"><span className="text-black">Statut</span>{statusBadge(selected.status)}</div>
                <div className="flex justify-between"><span className="text-black">Inscrit le</span><span className="text-xs text-black">{new Date(selected.created_at).toLocaleString('fr-DZ')}</span></div>
              </div>

              <div className="flex gap-2 mb-5">
                <button onClick={() => updateStatus(selected.id, 'approved')}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold py-2 rounded-lg transition-colors">Approuver</button>
                <button onClick={() => updateStatus(selected.id, 'rejected')}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold py-2 rounded-lg transition-colors">Refuser</button>
              </div>

              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Factures ({invoices.length})</h4>
                {invoices.length === 0 ? (
                  <p className="text-xs text-gray-400">Aucune facture soumise</p>
                ) : (
                  <div className="space-y-2">
                    {invoices.map(inv => (
                      <InvoiceCard
                        key={inv.id}
                        inv={inv}
                        statusBadge={statusBadge}
                        onAmountUpdate={(id, newAmount) => {
                          setInvoices(prev => prev.map(i => i.id === id ? { ...i, amount_detected: String(newAmount) } : i));
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}