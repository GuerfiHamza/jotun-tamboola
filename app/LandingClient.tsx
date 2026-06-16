'use client';
import PhotoTips from './components/PhotoTips';
import LanguageSwitcher from './components/LanguageSwitcher';
import { useState, useRef, useEffect } from 'react';
import { STORES } from '@/lib/stores';
import type { Locale } from '@/lib/i18n/locale';
import type { Dictionary } from '@/lib/i18n/dictionaries';

// ── Data ─────────────────────────────────────────────────────────────────────

const prizeVisuals = [
  {
    num: 1,
    gradient: 'linear-gradient(135deg,#f59e0b,#fcd34d,#f59e0b)',
    glow: 'rgba(251,191,36,0.35)', border: 'rgba(251,191,36,0.5)',
    color: '#fbbf24',
    icon: (
      <svg viewBox="0 0 32 32" fill="none" className="w-7 h-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="26" height="18" rx="2" />
        <path d="M10 27h12M16 23v4" />
        <rect x="6" y="8" width="20" height="12" rx="1" fill="currentColor" opacity="0.12" />
      </svg>
    ),
  },
  {
    num: 2,
    gradient: 'linear-gradient(135deg,#94a3b8,#cbd5e1,#94a3b8)',
    glow: 'rgba(148,163,184,0.2)', border: 'rgba(148,163,184,0.3)',
    color: '#94a3b8',
    icon: (
      <svg viewBox="0 0 32 32" fill="none" className="w-7 h-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="7" y="2" width="18" height="28" rx="2" />
        <path d="M7 14h18M13 8v4M13 19v6" />
      </svg>
    ),
  },
  {
    num: 3,
    gradient: 'linear-gradient(135deg,#f97316,#fb923c,#f97316)',
    glow: 'rgba(249,115,22,0.2)', border: 'rgba(249,115,22,0.3)',
    color: '#f97316',
    icon: (
      <svg viewBox="0 0 32 32" fill="none" className="w-7 h-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="2" width="26" height="28" rx="2" />
        <circle cx="16" cy="18" r="7" />
        <circle cx="16" cy="18" r="3" fill="currentColor" opacity="0.12" />
        <circle cx="9" cy="7" r="1.5" fill="currentColor" />
        <circle cx="14" cy="7" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    num: 4,
    gradient: 'linear-gradient(135deg,#3b82f6,#60a5fa,#3b82f6)',
    glow: 'rgba(59,130,246,0.2)', border: 'rgba(59,130,246,0.3)',
    color: '#3b82f6',
    icon: (
      <svg viewBox="0 0 32 32" fill="none" className="w-7 h-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="9" width="26" height="11" rx="2" />
        <path d="M8 24c0 3 1 4 1 4M16 24v5M24 24c0 3-1 4-1 4M8 14h16M10 12h2" />
      </svg>
    ),
  },
  {
    num: 5,
    gradient: 'linear-gradient(135deg,#8b5cf6,#a78bfa,#8b5cf6)',
    glow: 'rgba(139,92,246,0.2)', border: 'rgba(139,92,246,0.3)',
    color: '#8b5cf6',
    icon: (
      <svg viewBox="0 0 32 32" fill="none" className="w-7 h-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="16" cy="24" rx="10" ry="5" />
        <path d="M16 19V7M10 7h12M9 19c-3-2-3-6 0-8" />
        <circle cx="16" cy="24" r="3" fill="currentColor" opacity="0.15" />
      </svg>
    ),
  },
  {
    num: 6,
    gradient: 'linear-gradient(135deg,#10b981,#34d399,#10b981)',
    glow: 'rgba(16,185,129,0.2)', border: 'rgba(16,185,129,0.3)',
    color: '#10b981',
    icon: (
      <svg viewBox="0 0 32 32" fill="none" className="w-7 h-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="14" width="22" height="14" rx="2" />
        <rect x="3" y="10" width="26" height="6" rx="1" />
        <path d="M16 10V5M12 5h8" />
      </svg>
    ),
  },
];

// ── Star field data (module-level so Math.random runs once, not on render) ───

const STARS = Array.from({ length: 55 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 1.8 + 0.6,
  delay: Math.random() * 6,
  dur: 2.5 + Math.random() * 4,
}));

// ── Types ─────────────────────────────────────────────────────────────────────

type FormState = {
  nom: string; prenom: string; phone: string;
  wilaya: string;
  is_painter: boolean; consent: boolean; invoice: File | null;
};
type Step = 'form' | 'done';
type PrizeText = { rank: string; label: string; badge?: string };
type Faq = { q: string; a: string };

// ── Theme ─────────────────────────────────────────────────────────────────────

function getTheme(dark: boolean) {
  if (dark) return {
    page: '#08080f',
    section: '#0a0a14',
    card: '#0f0f1c',
    cardAlt: '#12121f',
    glass: 'rgba(255,255,255,0.04)',
    glassHard: 'rgba(255,255,255,0.07)',
    input: 'rgba(255,255,255,0.05)',
    inputFocus: 'rgba(255,255,255,0.08)',
    border: 'rgba(255,255,255,0.07)',
    borderSub: 'rgba(255,255,255,0.05)',
    borderFocus: 'rgba(13,42,148,0.45)',
    text: '#f9fafb',
    sub: 'rgba(255,255,255,0.55)',
    muted: 'rgba(255,255,255,0.35)',
    faint: 'rgba(255,255,255,0.15)',
    navBg: 'rgba(8,8,15,0.92)',
    navBorder: 'rgba(255,255,255,0.06)',
    foot: '#060609',
    inputText: '#ffffff',
    placeholder: 'rgba(255,255,255,0.2)',
    selectBg: '#0f0f1c',
    pill: 'rgba(255,255,255,0.04)',
    orbA: 'rgba(13,42,148,0.08)',
    orbB: 'rgba(13,42,148,0.05)',
    orbC: 'rgba(245,158,11,0.04)',
    gridLine: 'rgba(255,255,255,0.025)',
    ringA: 'rgba(255,255,255,0.025)',
    ringB: 'rgba(255,255,255,0.015)',
    isDark: true,
  } as const;
  return {
    page: '#f3f3fa',
    section: '#ebebf5',
    card: '#ffffff',
    cardAlt: '#f8f8fd',
    glass: 'rgba(0,0,0,0.025)',
    glassHard: 'rgba(0,0,0,0.06)',
    input: 'rgba(0,0,0,0.04)',
    inputFocus: 'rgba(0,0,0,0.07)',
    border: 'rgba(0,0,0,0.09)',
    borderSub: 'rgba(0,0,0,0.05)',
    borderFocus: 'rgba(13,42,148,0.5)',
    text: '#0d0d1a',
    sub: 'rgba(0,0,0,0.6)',
    muted: 'rgba(0,0,0,0.4)',
    faint: 'rgba(0,0,0,0.2)',
    navBg: 'rgba(243,243,250,0.95)',
    navBorder: 'rgba(0,0,0,0.08)',
    foot: '#e6e6f2',
    inputText: '#0d0d1a',
    placeholder: 'rgba(0,0,0,0.3)',
    selectBg: '#ffffff',
    pill: 'rgba(0,0,0,0.03)',
    orbA: 'rgba(13,42,148,0.06)',
    orbB: 'rgba(13,42,148,0.04)',
    orbC: 'rgba(245,158,11,0.03)',
    gridLine: 'rgba(0,0,0,0.04)',
    ringA: 'rgba(0,0,0,0.04)',
    ringB: 'rgba(0,0,0,0.025)',
    isDark: false,
  } as const;
}

type Theme = ReturnType<typeof getTheme>;

// ── Hooks ─────────────────────────────────────────────────────────────────────

function useInView(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold },
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function reveal(visible: boolean, delay = 0, x = 0): React.CSSProperties {
  return {
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0px) translateX(0px)' : `translateY(36px) translateX(${x}px)`,
    transition: `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms`,
  };
}

// ── Components ────────────────────────────────────────────────────────────────

function StarField() {
  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden>
      {STARS.map(s => (
        <div
          key={s.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${s.x}%`, top: `${s.y}%`,
            width: `${s.size}px`, height: `${s.size}px`,
            opacity: 0.1,
            animation: `twinkle ${s.dur}s ease-in-out ${s.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

function RippleButton({
  children, onClick, style, className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  style?: React.CSSProperties;
  className?: string;
}) {
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const id = Date.now();
    setRipples(prev => [...prev, { id, x, y }]);
    setTimeout(() => setRipples(prev => prev.filter(rp => rp.id !== id)), 800);
    onClick?.();
  }
  return (
    <button onClick={handleClick} style={style} className={`relative overflow-hidden ${className ?? ''}`}>
      {children}
      {ripples.map(rp => (
        <span
          key={rp.id}
          className="absolute rounded-full bg-white/20 pointer-events-none"
          style={{
            width: 8, height: 8,
            left: rp.x - 4, top: rp.y - 4,
            animation: 'rippleOut 0.8s ease-out forwards',
          }}
        />
      ))}
    </button>
  );
}

function PrizeCard({ p, text, index, visible, th }: { p: typeof prizeVisuals[0]; text: PrizeText; index: number; visible: boolean; th: Theme }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const isGrand = index === 0;

  function onMove(e: React.MouseEvent) {
    const el = cardRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateX(${-y * 11}deg) rotateY(${x * 11}deg) translateY(-6px) scale(1.02)`;
    el.style.transition = 'transform 0.08s ease';
  }

  function onLeave() {
    const el = cardRef.current; if (!el) return;
    el.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) translateY(0) scale(1)';
    el.style.transition = 'transform 0.5s ease';
  }

  return (
    <div style={{ opacity: visible ? undefined : 0, animation: visible ? `bounceIn 0.6s cubic-bezier(0.34,1.56,0.64,1) ${index * 90}ms both` : undefined }}>
      <div
        ref={cardRef}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        className="relative h-full cursor-default"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {isGrand && (
          <div
            className="absolute -inset-2 rounded-3xl blur-xl pointer-events-none"
            style={{ background: p.gradient, opacity: th.isDark ? 0.35 : 0.25 }}
          />
        )}
        <div
          className="relative rounded-2xl p-px h-full"
          style={{ background: isGrand ? p.gradient : th.glassHard }}
        >
          <div
            className="relative rounded-2xl p-6 h-full flex flex-col gap-4"
            style={{ background: th.card, boxShadow: `0 24px 64px ${p.glow}` }}
          >
            {isGrand && (
              <div className="absolute inset-0 rounded-2xl pointer-events-none overflow-hidden" aria-hidden>
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(105deg,transparent 40%,rgba(255,255,255,0.06) 50%,transparent 60%)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 3s linear infinite',
                  }}
                />
              </div>
            )}
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg"
              style={{ background: p.gradient, color: '#fff', boxShadow: `0 8px 24px ${p.glow}` }}
            >
              {p.icon}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full"
                  style={{ background: `${p.color}22`, color: p.color }}
                >
                  {text.rank}
                </span>
                {isGrand && text.badge && (
                  <span className="text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-500">
                    {text.badge}
                  </span>
                )}
              </div>
              <div className="text-lg font-black leading-tight" style={{ color: th.text }}>{text.label}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FaqItem({ f, index, visible, th }: { f: Faq; index: number; visible: boolean; th: Theme }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={reveal(visible, index * 80)}>
          <div
            className="rounded-2xl overflow-hidden transition-all duration-300"
            style={{
              border: `1px solid ${open ? 'rgba(13,42,148,0.3)' : th.border}`,
              background: open ? (th.isDark ? 'rgba(13,42,148,0.04)' : 'rgba(13,42,148,0.02)') : 'transparent',
            }}
      >
        <button
          className="w-full flex items-center justify-between gap-4 px-6 py-5 text-start"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
        >
          <div className="flex items-center gap-4 min-w-0">
            <span className="text-blue-500 font-black text-xs tabular-nums flex-shrink-0 w-6">
              {String(index + 1).padStart(2, '0')}
            </span>
            <span className="font-semibold text-sm" style={{ color: th.text }}>{f.q}</span>
          </div>
            <div
            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              border: `1px solid ${open ? 'rgba(13,42,148,0.4)' : th.border}`,
              background: open ? 'rgba(13,42,148,0.15)' : 'transparent',
              transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s ease, background 0.3s ease, border-color 0.3s ease',
            }}
            aria-hidden
          >
            <svg className="w-3.5 h-3.5" style={{ color: open ? '#60a5fa' : th.muted }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16M4 12h16" />
            </svg>
          </div>
        </button>
        <div
          className="overflow-hidden"
          style={{ maxHeight: open ? '240px' : '0', transition: 'max-height 0.4s ease, opacity 0.4s ease', opacity: open ? 1 : 0 }}
        >
          <p className="px-6 pb-6 text-sm leading-relaxed ps-16" style={{ color: th.sub }}>{f.a}</p>
        </div>
      </div>
    </div>
  );
}

function ThemeToggle({ dark, onToggle, dict }: { dark: boolean; onToggle: () => void; dict: Dictionary }) {
  return (
    <button
      onClick={onToggle}
      className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90"
      style={{
        background: dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
        border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
      }}
      aria-label={dark ? dict.landing.themeToggle.toLight : dict.landing.themeToggle.toDark}
    >
      <div style={{ animation: 'themeSwitch 0.4s ease both' }} key={dark ? 'moon' : 'sun'}>
        {dark ? (
          <svg className="w-4.5 h-4.5 text-amber-300" style={{ width: 18, height: 18 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z" />
          </svg>
        ) : (
          <svg className="w-4.5 h-4.5 text-amber-500" style={{ width: 18, height: 18 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          </svg>
        )}
      </div>
    </button>
  );
}

function StoreSearch({
  value, onChange, placeholder, noResults, th,
}: {
  value: string; onChange: (v: string) => void;
  placeholder: string; noResults: string; th: Theme;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const filtered = STORES.filter(s => s.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="relative">
      <input
        type="text"
        value={open ? query : value}
        onChange={e => setQuery(e.target.value)}
        onFocus={() => { setOpen(true); setQuery(''); }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={value || placeholder}
        className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
        style={{ background: th.input, border: `1px solid ${th.border}`, color: th.inputText }}
        onFocusCapture={e => { e.currentTarget.style.border = `1px solid ${th.borderFocus}`; e.currentTarget.style.background = th.inputFocus; }}
        onBlurCapture={e => { e.currentTarget.style.border = `1px solid ${th.border}`; e.currentTarget.style.background = th.input; }}
        autoComplete="off"
      />
      {open && (
        <div
          className="absolute z-50 w-full mt-1 rounded-xl overflow-y-auto"
          style={{ maxHeight: '200px', background: th.selectBg, border: `1px solid ${th.border}`, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}
        >
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-sm" style={{ color: th.muted }}>{noResults}</div>
          ) : filtered.map(s => (
            <button
              key={s}
              type="button"
              onMouseDown={() => { onChange(s); setOpen(false); }}
              className="w-full text-start px-4 py-2.5 text-sm transition-colors"
              style={{ color: s === value ? '#60a5fa' : th.inputText, background: s === value ? 'rgba(13,42,148,0.1)' : 'transparent' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(13,42,148,0.06)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = s === value ? 'rgba(13,42,148,0.1)' : 'transparent'; }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LandingClient({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const formRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState<FormState>({ nom: '', prenom: '', phone: '', wilaya: '', is_painter: false, consent: false, invoice: null });
  const [step, setStep] = useState<Step>('form');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ accepted: boolean; message: string } | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [dark, setDark] = useState<boolean>(
    () => typeof window !== 'undefined' && localStorage.getItem('jotun-theme') === 'dark'
  );

  const { ref: prizesRef, visible: prizesVisible } = useInView();
  const { ref: faqRef, visible: faqVisible } = useInView();

  const th = getTheme(dark);
  const t = dict.landing;

  // Sync theme to DOM + localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('jotun-theme', dark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }, [dark]);

  // Scroll-triggered navbar
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const scrollToForm = () =>
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    const errors = t.form.errors;
    if (!form.nom.trim()) { setErrorMsg(errors.nomRequired); return; }
    if (!form.prenom.trim()) { setErrorMsg(errors.prenomRequired); return; }
    if (!form.phone.trim()) { setErrorMsg(errors.phoneRequired); return; }
    let phone = form.phone.replace(/[\s.-]/g, '');
    if (phone.startsWith('+213')) phone = phone.slice(4);
    else if (phone.startsWith('00213')) phone = phone.slice(5);
    if (phone.startsWith('0') && phone.length === 11) phone = phone.slice(1);
    if (/^[2-7]\d{8}$/.test(phone)) phone = '0' + phone;
    if (!/^0[2-7]\d{8}$/.test(phone)) { setErrorMsg(errors.phoneInvalid); return; }
    if (!form.wilaya) { setErrorMsg(errors.storeRequired); return; }
    if (form.is_painter && !form.invoice) { setErrorMsg(errors.invoiceRequiredPainter); return; }
    if (!form.consent) { setErrorMsg(errors.consentRequired); return; }
    if (!form.invoice) { setErrorMsg(errors.invoiceRequired); return; }

    setLoading(true);
    try {
      if (form.invoice) {
        const checkFd = new FormData();
        checkFd.append('invoice', form.invoice);
        const checkRes = await fetch('/api/check-invoice', { method: 'POST', headers: { 'x-requested-with': 'XMLHttpRequest' }, body: checkFd });
        const checkData = await checkRes.json() as { error?: string; ok?: boolean };
        if (!checkRes.ok) { setErrorMsg(checkData.error ?? errors.invoiceRejectedFallback); setLoading(false); return; }
      }
      const regRes = await fetch('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-requested-with': 'XMLHttpRequest' }, body: JSON.stringify({ nom: form.nom.trim(), prenom: form.prenom.trim(), phone, wilaya: form.wilaya, is_painter: form.is_painter }) });
      const regData = await regRes.json() as { error?: string; participantId?: number; requiresInvoice?: boolean; alreadyRegistered?: boolean; hasInvoice?: boolean };
      if (!regRes.ok) {
        if (regData.alreadyRegistered) {
          setErrorMsg(regData.hasInvoice ? errors.alreadyRegisteredWithInvoice : errors.alreadyRegistered);
        } else {
          setErrorMsg(regData.error ?? errors.registrationErrorFallback);
        }
        setLoading(false); return;
      }
      if (form.invoice && regData.participantId) {
        const fd = new FormData();
        fd.append('invoice', form.invoice);
        fd.append('participantId', String(regData.participantId));
        const upRes = await fetch('/api/upload-invoice', { method: 'POST', headers: { 'x-requested-with': 'XMLHttpRequest' }, body: fd });
        const upData = await upRes.json() as { error?: string; accepted?: boolean; message?: string };
        if (!upRes.ok) { setErrorMsg(upData.error ?? errors.uploadErrorFallback); setLoading(false); return; }
        setUploadResult({ accepted: upData.accepted === true, message: upData.message ?? '' });
      }
      setStep('done');
    } catch {
      setErrorMsg(errors.networkError);
    } finally {
      setLoading(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen overflow-x-hidden" style={{ background: th.page, color: th.text, transition: 'background 0.3s ease, color 0.3s ease' }}>

      {/* ── Navbar ───────────────────────────────────────────────────────── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          background: scrolled ? th.navBg : 'transparent',
          backdropFilter: scrolled ? 'blur(20px)' : 'none',
          borderBottom: scrolled ? `1px solid ${th.navBorder}` : '1px solid transparent',
          boxShadow: scrolled ? `0 8px 40px ${th.isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.08)'}` : 'none',
          transition: 'background 0.4s, backdrop-filter 0.4s, border-color 0.4s, box-shadow 0.4s',
        }}
      >

        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-base shadow-lg"
              style={{ background: 'linear-gradient(135deg,#0d2a94,#072060)', boxShadow: '0 4px 20px rgba(13,42,148,0.4)' }}
            >
              J
            </div>
            <div className="leading-none">
              <div className="font-black text-sm tracking-tight" style={{ color: th.text }}>JOTUN</div>
              <div className="text-[10px] font-bold text-blue-400 tracking-[0.2em] uppercase">Tamboola</div>
            </div>
          </div>

          <div className="ms-auto flex items-center gap-6">
            <a href="#prizes" className="text-sm transition-colors hidden md:block" style={{ color: th.muted }} onMouseEnter={e => (e.currentTarget.style.color = th.text)} onMouseLeave={e => (e.currentTarget.style.color = th.muted)}>{t.nav.prizes}</a>
            <a href="#faq" className="text-sm transition-colors hidden md:block" style={{ color: th.muted }} onMouseEnter={e => (e.currentTarget.style.color = th.text)} onMouseLeave={e => (e.currentTarget.style.color = th.muted)}>{t.nav.faq}</a>
            <LanguageSwitcher locale={locale} dark={th.isDark} />
            <ThemeToggle dark={dark} onToggle={() => setDark(d => !d)} dict={dict} />
            <RippleButton
              onClick={scrollToForm}
              className="text-sm font-bold text-white px-5 rounded-xl transition-all active:scale-95"
              style={{ background: 'linear-gradient(135deg,#0d2a94,#072060)', boxShadow: '0 0 20px rgba(13,42,148,0.35)', padding: '0.6rem 1.25rem' }}
            >
              {t.nav.participate}
            </RippleButton>
          </div>
        </div>
      </nav>
      <section id="register" ref={formRef} className="py-32 px-6 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse 50% 60% at 50% 0%, rgba(13,42,148,${th.isDark ? '0.1' : '0.06'}) 0%, transparent 70%)` }}
          aria-hidden
        />
        <div className="relative max-w-lg mx-auto">

          {/* Success state */}
          {step === 'done' ? (
            <div
              className="relative overflow-hidden rounded-3xl text-center p-10"
              style={{ border: '1px solid rgba(16,185,129,0.2)', background: `linear-gradient(135deg,rgba(16,185,129,${th.isDark ? '0.07' : '0.04'}),rgba(5,150,105,0.03))`, animation: 'bounceIn 0.6s cubic-bezier(0.34,1.56,0.64,1) both' }}
            >
              <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg,transparent,rgba(16,185,129,0.5),transparent)' }} aria-hidden />
              <div className="w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.12)' }}>
                <svg viewBox="0 0 24 24" className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-black mb-3" style={{ color: th.text }}>{t.success.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: th.sub }}>{uploadResult?.message || t.success.defaultMessage}</p>
              <button
                onClick={() => { setStep('form'); setUploadResult(null); setForm({ nom: '', prenom: '', phone: '', wilaya: '', is_painter: false, consent: false, invoice: null }); }}
                className="mt-8 text-sm text-blue-400 hover:text-blue-300 font-semibold transition-colors"
              >
                {t.success.newRegistration}
              </button>
            </div>
          ) : (
            <div
              className="relative overflow-hidden rounded-3xl"
              style={{
                border: `1px solid ${th.border}`,
                background: `linear-gradient(135deg,${th.card},${th.cardAlt})`,
                animation: 'slideInRight 0.6s ease-out 0.1s both',
              }}
            >
              <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg,transparent,rgba(13,42,148,0.6),transparent)' }} aria-hidden />

              <div className="px-8 py-7" style={{ borderBottom: `1px solid ${th.borderSub}` }}>
                <h3 className="font-bold text-xl" style={{ color: th.text }}>{t.form.cardTitle}</h3>
                <p className="text-sm mt-1" style={{ color: th.muted }}>{t.form.cardSubtitle}</p>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                {errorMsg && (
                  <div
                    className="rounded-xl p-4 flex gap-3 items-start text-sm"
                    style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', animation: 'bounceIn 0.4s ease both' }}
                  >
                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Nom + Prénom */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold tracking-[0.18em] uppercase mb-2.5" style={{ color: th.muted }}>
                      {t.form.nom.label} <span className="text-blue-500">*</span>
                    </label>
                    <input
                      type="text" required autoComplete="family-name"
                      value={form.nom} onChange={e => set('nom', e.target.value)}
                      placeholder={t.form.nom.placeholder}
                      className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                      style={{ background: th.input, border: `1px solid ${th.border}`, color: th.inputText }}
                      onFocus={e => { e.currentTarget.style.border = `1px solid ${th.borderFocus}`; e.currentTarget.style.background = th.inputFocus; }}
                      onBlur={e => { e.currentTarget.style.border = `1px solid ${th.border}`; e.currentTarget.style.background = th.input; }}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold tracking-[0.18em] uppercase mb-2.5" style={{ color: th.muted }}>
                      {t.form.prenom.label} <span className="text-blue-500">*</span>
                    </label>
                    <input
                      type="text" required autoComplete="given-name"
                      value={form.prenom} onChange={e => set('prenom', e.target.value)}
                      placeholder={t.form.prenom.placeholder}
                      className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                      style={{ background: th.input, border: `1px solid ${th.border}`, color: th.inputText }}
                      onFocus={e => { e.currentTarget.style.border = `1px solid ${th.borderFocus}`; e.currentTarget.style.background = th.inputFocus; }}
                      onBlur={e => { e.currentTarget.style.border = `1px solid ${th.border}`; e.currentTarget.style.background = th.input; }}
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                    <label className="block text-[11px] font-bold tracking-[0.18em] uppercase mb-2.5" style={{ color: th.muted }}>
                    {t.form.phone.label} <span className="text-blue-500">*</span>
                  </label>
                  <input
                    type="tel" required autoComplete="tel"
                    value={form.phone} onChange={e => set('phone', e.target.value)}
                    placeholder={t.form.phone.placeholder}
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                    style={{ background: th.input, border: `1px solid ${th.border}`, color: th.inputText }}
                    onFocus={e => { e.currentTarget.style.border = `1px solid ${th.borderFocus}`; e.currentTarget.style.background = th.inputFocus; }}
                    onBlur={e => { e.currentTarget.style.border = `1px solid ${th.border}`; e.currentTarget.style.background = th.input; }}
                  />
                </div>

                {/* Point de vente */}
                <div>
                  <label className="block text-[11px] font-bold tracking-[0.18em] uppercase mb-2.5" style={{ color: th.muted }}>
                    {t.form.store.label} <span className="text-blue-500">*</span>
                  </label>
                  <StoreSearch
                    value={form.wilaya}
                    onChange={v => set('wilaya', v)}
                    placeholder={t.form.store.placeholder}
                    noResults={t.form.store.noResults}
                    th={th}
                  />
                </div>

                {/* Profession */}
                <div>
                  <label className="block text-[11px] font-bold tracking-[0.18em] uppercase mb-2.5" style={{ color: th.muted }}>{t.form.profession.label}</label>
                  <div
                    className="flex items-center justify-between gap-4 px-4 py-3.5 rounded-xl"
                    style={{ border: `1px solid ${th.border}`, background: th.glass }}
                  >
                    <span className="text-sm font-semibold" style={{ color: th.sub }}>{t.form.profession.isPainter}</span>
                    <button
                      type="button"
                      onClick={() => set('is_painter', !form.is_painter)}
                      className="relative flex-shrink-0 w-14 h-7 rounded-full transition-all duration-300"
                      style={{ background: form.is_painter ? '#22c55e' : '#ef4444' }}
                      aria-pressed={form.is_painter}
                    >
                      <span
                        className="absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all duration-300"
                        style={{ insetInlineStart: form.is_painter ? '1.75rem' : '0.25rem' }}
                      />
                      <span
                        className="absolute inset-0 flex items-center text-[10px] font-black text-white transition-all duration-300"
                        style={{ paddingInlineStart: form.is_painter ? '0.4rem' : undefined, paddingInlineEnd: form.is_painter ? undefined : '0.4rem', justifyContent: form.is_painter ? 'flex-start' : 'flex-end' }}
                      >
                        {form.is_painter ? t.form.profession.yes : t.form.profession.no}
                      </span>
                    </button>
                  </div>
                  
                </div>

                {/* Invoice upload */}
                <div>
                  <label className="block text-[11px] font-bold tracking-[0.18em] uppercase mb-2.5" style={{ color: th.muted }}>
                    {t.form.invoice.label} <span className="text-blue-500">*</span>
                  </label>
                  <label
                    className="flex flex-col items-center justify-center mb-5 gap-3 w-full border-2 border-dashed rounded-xl px-4 py-8 cursor-pointer transition-all"
                    style={{
                      borderColor: form.invoice ? 'rgba(16,185,129,0.4)' : th.border,
                      background: form.invoice ? `rgba(16,185,129,${th.isDark ? '0.05' : '0.03'})` : th.glass,
                    }}
                    onMouseEnter={e => { if (!form.invoice) e.currentTarget.style.borderColor = 'rgba(239,68,68,0.35)'; }}
                    onMouseLeave={e => { if (!form.invoice) e.currentTarget.style.borderColor = th.border; }}
                  >
                    <input type="file" accept="image/*,application/pdf" className="hidden" onChange={e => set('invoice', e.target.files?.[0] ?? null)} />
                    {form.invoice ? (
                      <>
                        <svg viewBox="0 0 24 24" className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm font-semibold text-emerald-400">{form.invoice.name}</span>
                        <span className="text-xs" style={{ color: th.faint }}>{t.form.invoice.changeHint}</span>
                      </>
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" className="w-8 h-8" style={{ color: th.muted }} fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                        <span className="text-sm font-semibold" style={{ color: th.muted }}>{t.form.invoice.dropLabel}</span>
                        <span className="text-xs" style={{ color: th.faint }}>{t.form.invoice.dropHint}</span>
                      </>
                    )}
                  </label>
                  <PhotoTips dark={th.isDark} dict={t.form.invoice.photoTips} />

                
                </div>

                {/* Consent */}
                <div>
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <button
                      type="button"
                      onClick={() => set('consent', !form.consent)}
                      className="mt-0.5 w-5 h-5 rounded flex-shrink-0 flex items-center justify-center transition-all border-2"
                      style={{ background: form.consent ? '#ef4444' : 'transparent', borderColor: form.consent ? '#ef4444' : th.muted }}
                    >
                      {form.consent && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    <span className="text-sm leading-relaxed transition-colors" style={{ color: th.muted }}>
                      {t.form.consentPrefix}
                      <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline underline-offset-2">
                        {t.form.consentLink}
                      </a>
                      {t.form.consentSuffix}
                    </span>
                  </label>
                </div>

                {/* Submit */}
                <RippleButton
                  className="w-full font-bold text-sm text-white rounded-xl py-4 flex items-center justify-center gap-2.5 transition-all active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: 'linear-gradient(135deg,#0d2a94,#072060)',
                    boxShadow: form.consent ? '0 0 32px rgba(13,42,148,0.4)' : 'none',
                  }}
                >
                  {loading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      {form.is_painter ? t.form.submit.loadingPainter : t.form.submit.loadingDefault}
                    </>
                  ) : (
                    form.is_painter ? t.form.submit.painter : t.form.submit.default
                  )}
                </RippleButton>
              </form>
            </div>
          )}
        </div>
      </section>
      <div className="h-px" style={{ background: 'linear-gradient(90deg,transparent,rgba(13,42,148,0.3),transparent)' }} />
  <section id="prizes" className="py-32 px-6 relative" style={{ background: th.page }}>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse 60% 40% at 50% 50%, rgba(13,42,148,${th.isDark ? '0.04' : '0.025'}) 0%, transparent 70%)` }}
          aria-hidden
        />
        <div className="relative max-w-5xl mx-auto">
          <div ref={prizesRef} className="text-center mb-16">
            <div style={reveal(prizesVisible, 0)}>
              <div className="inline-flex items-center gap-3 mb-5">
                <div className="h-px w-10 bg-blue-500/50" />
                <span className="text-blue-400 text-xs font-bold tracking-[0.3em] uppercase">{t.prizesSection.eyebrow}</span>
                <div className="h-px w-10 bg-blue-500/50" />
              </div>
            </div>
            <div style={reveal(prizesVisible, 80)}>
              <h2 className="text-5xl md:text-6xl font-black mb-4" style={{ color: th.text }}>{t.prizesSection.title}</h2>
            </div>
            <div style={reveal(prizesVisible, 140)}>
              <p className="text-lg max-w-md mx-auto" style={{ color: th.muted }}>{t.prizesSection.subtitle}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {prizeVisuals.map((p, i) => (
              <PrizeCard key={p.num} p={p} text={t.prizes[i]} index={i} visible={prizesVisible} th={th} />
            ))}
          </div>
        </div>
      </section>
      <div className="h-px" style={{ background: 'linear-gradient(90deg,transparent,rgba(13,42,148,0.3),transparent)' }} />

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section id="faq" className="py-32 px-6 relative" style={{ background: th.page }}>
        <div className="relative max-w-2xl mx-auto">
          <div ref={faqRef} className="text-center mb-14">
            <div style={reveal(faqVisible, 0)}>
              <div className="inline-flex items-center gap-3 mb-5">
                <div className="h-px w-10 bg-blue-500/50" />
                <span className="text-blue-400 text-xs font-bold tracking-[0.3em] uppercase">{t.faqSection.eyebrow}</span>
                <div className="h-px w-10 bg-blue-500/50" />
              </div>
            </div>
            <div style={reveal(faqVisible, 80)}>
              <h2 className="text-5xl font-black" style={{ color: th.text }}>{t.faqSection.title}</h2>
            </div>
          </div>
          <div className="space-y-3">
            {t.faqs.map((f, i) => <FaqItem key={f.q} f={f} index={i} visible={faqVisible} th={th} />)}
          </div>
        </div>
      </section>

      {/* ── Divider ──────────────────────────────────────────────────────── */}
      <div className="h-px" style={{ background: 'linear-gradient(90deg,transparent,rgba(13,42,148,0.25),transparent)' }} />

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer
        className="relative px-6 py-16"
        style={{ background: th.foot, borderTop: `1px solid ${th.border}` }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white" style={{ background: 'linear-gradient(135deg,#ef4444,#b91c1c)', boxShadow: '0 4px 16px rgba(239,68,68,0.3)' }}>
                J
              </div>
              <div>
                <div className="font-black tracking-tight" style={{ color: th.text }}>JOTUN</div>
                <div className="text-[10px] text-blue-400 font-bold tracking-[0.2em] uppercase">Tamboola</div>
              </div>
            </div>
            <p className="text-sm text-center" style={{ color: th.faint }}>
              {t.footer.tagline}
            </p>
            <div className="flex items-center gap-6">
              <a href="#register" className="text-sm transition-colors" style={{ color: th.faint }} onMouseEnter={e => (e.currentTarget.style.color = th.text)} onMouseLeave={e => (e.currentTarget.style.color = th.faint)}>{t.nav.participate}</a>
            </div>
          </div>
          <div className="mt-10 pt-8 text-center text-xs" style={{ borderTop: `1px solid ${th.borderSub}`, color: th.faint }}>
            © {new Date().getFullYear()} Jotun Algérie. {t.footer.rights}
          </div>
        </div>
      </footer>

    </main>
  );
}
