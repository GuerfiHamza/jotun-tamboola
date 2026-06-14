// Visual "how to photograph your invoice" guide — pure inline SVG, no assets.

function Receipt({ variant, dark }: { variant: 'good' | 'dark' | 'cut' | 'rotated'; dark: boolean }) {
  const bg    = dark ? '#0f0f1c'  : '#f0f0f8';
  const paper = dark ? '#1a1a2e'  : '#ffffff';
  const line  = dark ? '#2d2d4e'  : '#dde0ea';
  const total = dark ? '#374151'  : '#e8eaf0';
  const foot  = dark ? '#1e1e30'  : '#eaedf5';

  const body = (
    <g>
      <rect x="22" y="10" width="56" height="80" rx="3" fill={paper} stroke={line} strokeWidth="1.5" />
      <rect x="28" y="17" width="24" height="5" rx="1" fill="#0d2a94" />
      <rect x="28" y="28" width="44" height="3" rx="1.5" fill={line} />
      <rect x="28" y="35" width="38" height="3" rx="1.5" fill={line} />
      <rect x="28" y="42" width="44" height="3" rx="1.5" fill={line} />
      <rect x="28" y="49" width="32" height="3" rx="1.5" fill={line} />
      <line x1="28" y1="59" x2="72" y2="59" stroke={line} strokeWidth="1" strokeDasharray="3 2" />
      <rect x="28" y="64" width="18" height="5" rx="1" fill={total} />
      <rect x="52" y="64" width="20" height="5" rx="1" fill="#10b981" />
      <rect x="28" y="76" width="44" height="3" rx="1.5" fill={foot} />
    </g>
  );

  return (
    <svg viewBox="0 0 100 100" className="w-full h-auto" aria-hidden="true">
      <rect x="2" y="2" width="96" height="96" rx="8" fill={bg} />
      {variant === 'good' && body}
      {variant === 'dark' && (
        <g filter="url(#blurF)" opacity="0.85">
          {body}
          <rect x="2" y="2" width="96" height="96" rx="8" fill={dark ? '#000' : '#aaaacc'} opacity="0.55" />
        </g>
      )}
      {variant === 'cut' && (
        <g>
          <g transform="translate(26, 18)">{body}</g>
          <ellipse cx="78" cy="88" rx="26" ry="20" fill={dark ? '#7c4d3a' : '#c4856a'} stroke={dark ? '#5a3528' : '#a06040'} strokeWidth="1.5" />
        </g>
      )}
      {variant === 'rotated' && <g transform="rotate(90 50 50)">{body}</g>}
      <defs>
        <filter id="blurF"><feGaussianBlur stdDeviation="1.6" /></filter>
      </defs>
    </svg>
  );
}

const TIPS: { variant: 'good' | 'dark' | 'cut' | 'rotated'; ok: boolean; label: string }[] = [
  { variant: 'good',    ok: true,  label: 'Facture entière, à plat, bien éclairée, montant total lisible' },
  { variant: 'dark',    ok: false, label: 'Photo floue ou sombre' },
  { variant: 'cut',     ok: false, label: 'Facture coupée ou doigt sur le total' },
  { variant: 'rotated', ok: false, label: 'Photo de travers' },
];

export default function PhotoTips({ dark = true }: { dark?: boolean }) {
  return (
    <div
      className="mb-3 rounded-xl p-3"
      style={{
        background: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
        border:     dark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.08)',
      }}
    >
      <p
        className="text-[11px] font-bold mb-2 tracking-wide"
        style={{ color: dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}
      >
        Comment photographier votre facture
      </p>
      <div className="grid grid-cols-4 gap-2">
        {TIPS.map(t => (
          <div key={t.variant} className="text-center">
            <div
              className="relative rounded-lg overflow-hidden border-2"
              style={{ borderColor: t.ok ? 'rgba(16,185,129,0.5)' : 'rgba(13,42,148,0.4)' }}
            >
              <Receipt variant={t.variant} dark={dark} />
              <span
                className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-black shadow"
                style={{ background: t.ok ? '#10b981' : '#0d2a94' }}
                aria-label={t.ok ? 'Bon exemple' : 'Mauvais exemple'}
              >
                {t.ok ? '✓' : '✕'}
              </span>
            </div>
            <p
              className="text-[9px] leading-tight mt-1.5"
              style={{
                color:      t.ok ? 'rgba(52,211,153,0.9)' : (dark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.4)'),
                fontWeight: t.ok ? 600 : 400,
              }}
            >
              {t.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
