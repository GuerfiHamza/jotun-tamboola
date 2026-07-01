'use client';
import type { Theme } from '@/lib/adminTheme';

export type Submission = {
  id: number; full_name: string; phone: string; wilaya: string; is_painter: number;
  commercial_nom?: string | null; commercial_prenom?: string | null;
  status: 'pending' | 'approved' | 'rejected'; created_at: string;
  invoice_count: number; accepted_count: number;
};

export const STATUS_COLOR: Record<Submission['status'], { bg: string; color: string; label: string }> = {
  pending:  { bg: 'rgba(234,179,8,0.12)',  color: '#fbbf24', label: 'En attente' },
  approved: { bg: 'rgba(16,185,129,0.12)', color: '#34d399', label: 'Approuvé' },
  rejected: { bg: 'rgba(248,113,113,0.15)', color: '#ef4444', label: 'Rejeté' },
};

export function SubmissionsList({ rows, loading, th, onStatusChange, busyId }: {
  rows: Submission[] | undefined; loading: boolean; th: Theme;
  onStatusChange?: (id: number, status: 'approved' | 'rejected') => void; busyId?: number | null;
}) {
  if (loading || !rows) return <p className="text-xs py-2" style={{ color: th.faint }}>Chargement…</p>;
  if (rows.length === 0) return <p className="text-xs py-2" style={{ color: th.faint }}>Aucune soumission pour ce magasin.</p>;
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${th.border}` }}>
      {rows.map((s, i) => {
        const st = STATUS_COLOR[s.status];
        return (
          <div key={s.id}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-xs"
            style={{ borderTop: i === 0 ? 'none' : `1px solid ${th.borderSub}`, background: th.panel }}>
            <span className="font-semibold" style={{ color: th.text }}>{s.full_name}</span>
            {(s.commercial_prenom || s.commercial_nom) && (
              <span title="Commercial" style={{ color: '#a78bfa' }}>
                👤 {[s.commercial_prenom, s.commercial_nom].filter(Boolean).join(' ')}
              </span>
            )}
            <span style={{ color: th.sub }}>{s.phone}</span>
            <span style={{ color: th.muted }}>{s.wilaya}</span>
            <span className="px-2 py-0.5 rounded-full font-bold uppercase text-[10px]" style={{ background: st.bg, color: st.color }}>{st.label}</span>
            <span style={{ color: th.muted }}>{s.invoice_count} facture(s) · ✓{s.accepted_count ?? 0}</span>
            {onStatusChange && (
              <span className="flex gap-1.5">
                {s.status !== 'approved' && (
                  <button disabled={busyId === s.id} onClick={() => onStatusChange(s.id, 'approved')}
                    className="font-bold px-2 py-0.5 rounded-lg disabled:opacity-40"
                    style={{ background: 'rgba(16,185,129,0.12)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)' }}>✓ Accepter</button>
                )}
                {s.status !== 'rejected' && (
                  <button disabled={busyId === s.id} onClick={() => onStatusChange(s.id, 'rejected')}
                    className="font-bold px-2 py-0.5 rounded-lg disabled:opacity-40"
                    style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>✗ Refuser</button>
                )}
              </span>
            )}
            <span className="ms-auto" style={{ color: th.faint }}>{new Date(s.created_at).toLocaleDateString('fr-DZ')}</span>
          </div>
        );
      })}
    </div>
  );
}
