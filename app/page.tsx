'use client';
import PhotoTips from './components/PhotoTips';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

// ── Data ─────────────────────────────────────────────────────────────────────

const prizes = [
  {
    rank: '1er Prix', label: 'Télévision 55"', num: 1,
    gradient: 'linear-gradient(135deg,#f59e0b,#fcd34d,#f59e0b)',
    glow: 'rgba(251,191,36,0.35)', border: 'rgba(251,191,36,0.5)',
    badge: 'GRAND PRIX', color: '#fbbf24',
    icon: (
      <svg viewBox="0 0 32 32" fill="none" className="w-7 h-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="26" height="18" rx="2"/>
        <path d="M10 27h12M16 23v4"/>
        <rect x="6" y="8" width="20" height="12" rx="1" fill="currentColor" opacity="0.12"/>
      </svg>
    ),
  },
  {
    rank: '2ème Prix', label: 'Réfrigérateur', num: 2,
    gradient: 'linear-gradient(135deg,#94a3b8,#cbd5e1,#94a3b8)',
    glow: 'rgba(148,163,184,0.2)', border: 'rgba(148,163,184,0.3)',
    color: '#94a3b8',
    icon: (
      <svg viewBox="0 0 32 32" fill="none" className="w-7 h-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="7" y="2" width="18" height="28" rx="2"/>
        <path d="M7 14h18"/>
        <path d="M13 8v4M13 19v6"/>
      </svg>
    ),
  },
  {
    rank: '3ème Prix', label: 'Machine à laver', num: 3,
    gradient: 'linear-gradient(135deg,#f97316,#fb923c,#f97316)',
    glow: 'rgba(249,115,22,0.2)', border: 'rgba(249,115,22,0.3)',
    color: '#f97316',
    icon: (
      <svg viewBox="0 0 32 32" fill="none" className="w-7 h-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="2" width="26" height="28" rx="2"/>
        <circle cx="16" cy="18" r="7"/>
        <circle cx="16" cy="18" r="3" fill="currentColor" opacity="0.12"/>
        <circle cx="9" cy="7" r="1.5" fill="currentColor"/>
        <circle cx="14" cy="7" r="1.5" fill="currentColor"/>
      </svg>
    ),
  },
  {
    rank: '4ème Prix', label: 'Climatiseur', num: 4,
    gradient: 'linear-gradient(135deg,#3b82f6,#60a5fa,#3b82f6)',
    glow: 'rgba(59,130,246,0.2)', border: 'rgba(59,130,246,0.3)',
    color: '#3b82f6',
    icon: (
      <svg viewBox="0 0 32 32" fill="none" className="w-7 h-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="9" width="26" height="11" rx="2"/>
        <path d="M8 24c0 3 1 4 1 4M16 24v5M24 24c0 3-1 4-1 4"/>
        <path d="M8 14h16M10 12h2"/>
      </svg>
    ),
  },
  {
    rank: '5ème Prix', label: 'Aspirateur', num: 5,
    gradient: 'linear-gradient(135deg,#8b5cf6,#a78bfa,#8b5cf6)',
    glow: 'rgba(139,92,246,0.2)', border: 'rgba(139,92,246,0.3)',
    color: '#8b5cf6',
    icon: (
      <svg viewBox="0 0 32 32" fill="none" className="w-7 h-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="16" cy="24" rx="10" ry="5"/>
        <path d="M16 19V7"/>
        <circle cx="16" cy="24" r="3" fill="currentColor" opacity="0.15"/>
        <path d="M10 7h12"/>
        <path d="M9 19c-3-2-3-6 0-8"/>
      </svg>
    ),
  },
  {
    rank: '6ème Prix', label: 'Kit outils Jotun', num: 6,
    gradient: 'linear-gradient(135deg,#10b981,#34d399,#10b981)',
    glow: 'rgba(16,185,129,0.2)', border: 'rgba(16,185,129,0.3)',
    color: '#10b981',
    icon: (
      <svg viewBox="0 0 32 32" fill="none" className="w-7 h-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="14" width="22" height="14" rx="2"/>
        <rect x="3" y="10" width="26" height="6" rx="1"/>
        <path d="M16 10V5M12 5h8"/>
      </svg>
    ),
  },
];

const howSteps = [
  { n: '01', title: 'Inscrivez-vous',      sub: 'Remplissez le formulaire en quelques minutes avec vos informations.' },
  { n: '02', title: 'Soumettez une facture', sub: 'Les peintres uploadent une facture Jotun ≥ 20 000 DA pour valider.' },
  { n: '03', title: 'Entrez dans le tirage', sub: 'Votre dossier est validé et vous participez automatiquement.' },
  { n: '04', title: 'Gagnez un prix',       sub: "Les gagnants sont contactés directement par l'équipe Jotun." },
];

const faqs = [
  { q: 'Qui peut participer ?',              a: "Tout acheteur de produits Jotun en Algérie. Les peintres en bâtiment doivent fournir une facture justificative." },
  { q: 'Quelle est la date limite ?',        a: "Les inscriptions sont ouvertes jusqu'à la fin de la campagne. Le tirage au sort sera annoncé sur nos canaux officiels." },
  { q: "Comment saurai-je si j'ai gagné ?",  a: "L'équipe Jotun vous contactera directement par téléphone au numéro fourni lors de l'inscription." },
  { q: 'Puis-je soumettre plusieurs factures ?', a: "Oui, les peintres peuvent soumettre plusieurs factures. Seule la facture acceptée (≥ 20 000 DA) compte pour la participation." },
];

const WILAYAS = [
  'Adrar','Chlef','Laghouat','Oum El Bouaghi','Batna','Béjaïa','Biskra','Béchar',
  'Blida','Bouira','Tamanrasset','Tébessa','Tlemcen','Tiaret','Tizi Ouzou','Alger',
  'Djelfa','Jijel','Sétif','Saïda','Skikda','Sidi Bel Abbès','Annaba','Guelma',
  'Constantine','Médéa','Mostaganem',"M'Sila",'Mascara','Ouargla','Oran','El Bayadh',
  'Illizi','Bordj Bou Arréridj','Boumerdès','El Tarf','Tindouf','Tissemsilt',
  'El Oued','Khenchela','Souk Ahras','Tipaza','Mila','Aïn Defla','Naâma',
  'Aïn Témouchent','Ghardaïa','Relizane','Timimoun','Bordj Badji Mokhtar',
  'Ouled Djellal','Béni Abbès','In Salah','In Guezzam','Touggourt','Djanet',
  "El M'Ghair",'El Meniaa',
];

// ── Types ─────────────────────────────────────────────────────────────────────

type FormState = {
  full_name: string;
  phone:     string;
  wilaya:    string;
  is_painter: boolean;
  consent:   boolean;
  invoice:   File | null;
};

type Step = 'form' | 'done';

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function reveal(visible: boolean, delay = 0, x = 0) {
  return {
    opacity: visible ? 1 : 0,
    transform: visible
      ? 'translateY(0px) translateX(0px)'
      : `translateY(36px) translateX(${x}px)`,
    transition: `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms`,
  } as React.CSSProperties;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PrizeCard({ p, index, visible }: { p: typeof prizes[0]; index: number; visible: boolean }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const isGrand = index === 0;

  function onMove(e: React.MouseEvent) {
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width  - 0.5;
    const y = (e.clientY - r.top)  / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateX(${-y * 11}deg) rotateY(${x * 11}deg) translateY(-6px)`;
    el.style.transition = 'transform 0.08s ease';
  }

  function onLeave() {
    const el = cardRef.current;
    if (!el) return;
    el.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) translateY(0)';
    el.style.transition = 'transform 0.5s ease';
  }

  return (
    <div style={reveal(visible, index * 90)}>
      <div
        ref={cardRef}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        className="relative h-full cursor-default"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Glow halo */}
        {isGrand && (
          <div
            className="absolute -inset-2 rounded-3xl blur-xl pointer-events-none"
            style={{ background: p.gradient, opacity: 0.35 }}
          />
        )}

        {/* Card border */}
        <div
          className="relative rounded-2xl p-px h-full"
          style={{
            background: isGrand ? p.gradient : `rgba(255,255,255,0.07)`,
          }}
        >
          {/* Card body */}
          <div
            className="relative bg-[#0f0f1c] rounded-2xl p-6 h-full flex flex-col gap-4"
            style={{ boxShadow: `0 24px 64px ${p.glow}` }}
          >
            {/* Shimmer sweep on grand prize */}
            {isGrand && (
              <div
                className="absolute inset-0 rounded-2xl pointer-events-none overflow-hidden"
                aria-hidden
              >
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.06) 50%, transparent 60%)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 3s linear infinite',
                  }}
                />
              </div>
            )}

            {/* Icon badge */}
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
                  {p.rank}
                </span>
                {isGrand && p.badge && (
                  <span className="text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300">
                    {p.badge}
                  </span>
                )}
              </div>
              <div className="text-white font-black text-xl leading-tight">{p.label}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FaqItem({ f, index, visible }: { f: typeof faqs[0]; index: number; visible: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={reveal(visible, index * 80)}>
      <div className="border border-white/8 rounded-2xl overflow-hidden transition-colors hover:border-red-500/25">
        <button
          className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
        >
          <div className="flex items-center gap-4 min-w-0">
            <span className="text-red-500 font-black text-xs tabular-nums flex-shrink-0 w-6">
              {String(index + 1).padStart(2, '0')}
            </span>
            <span className="font-semibold text-white text-sm">{f.q}</span>
          </div>
          <div
            className="w-7 h-7 rounded-full border border-white/10 flex items-center justify-center flex-shrink-0"
            style={{ transition: 'transform 0.3s ease, background 0.3s ease', transform: open ? 'rotate(45deg)' : 'rotate(0deg)', background: open ? 'rgba(239,68,68,0.15)' : 'transparent' }}
            aria-hidden
          >
            <svg className={`w-3.5 h-3.5 ${open ? 'text-red-400' : 'text-white/40'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16M4 12h16" />
            </svg>
          </div>
        </button>
        <div
          className="overflow-hidden"
          style={{ maxHeight: open ? '240px' : '0', transition: 'max-height 0.4s ease, opacity 0.4s ease', opacity: open ? 1 : 0 }}
        >
          <p className="px-6 pb-6 text-white/50 text-sm leading-relaxed pl-16">{f.a}</p>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const formRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState<FormState>({
    full_name: '', phone: '', wilaya: '', is_painter: false, consent: false, invoice: null,
  });
  const [step,         setStep]         = useState<Step>('form');
  const [errorMsg,     setErrorMsg]     = useState('');
  const [loading,      setLoading]      = useState(false);
  const [uploadResult, setUploadResult] = useState<{ accepted: boolean; message: string } | null>(null);
  const [scrolled,     setScrolled]     = useState(false);

  const { ref: prizesRef,  visible: prizesVisible  } = useInView();
  const { ref: stepsRef,   visible: stepsVisible   } = useInView();
  const { ref: faqRef,     visible: faqVisible     } = useInView();
  const { ref: formTitleRef, visible: formTitleVisible } = useInView();

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

    if (!form.full_name.trim()) { setErrorMsg('Veuillez entrer votre nom complet.'); return; }
    if (!form.phone.trim())     { setErrorMsg('Veuillez entrer votre numéro de téléphone.'); return; }
    let phone = form.phone.replace(/[\s.-]/g, '');
    if (phone.startsWith('+213'))  phone = phone.slice(4);
    else if (phone.startsWith('00213')) phone = phone.slice(5);
    if (phone.startsWith('0') && phone.length === 11) phone = phone.slice(1);
    if (/^[2-7]\d{8}$/.test(phone)) phone = '0' + phone;
    if (!/^0[2-7]\d{8}$/.test(phone)) { setErrorMsg('Numéro de téléphone algérien invalide (ex : 0550123456 ou +213550123456).'); return; }
    if (!form.wilaya)   { setErrorMsg('Veuillez sélectionner votre wilaya.'); return; }
    if (form.is_painter && !form.invoice) { setErrorMsg('Veuillez joindre votre facture Jotun.'); return; }
    if (!form.consent)  { setErrorMsg('Veuillez accepter les conditions de participation.'); return; }
    if (!form.invoice)  { setErrorMsg('Veuillez joindre votre facture Jotun.'); return; }

    setLoading(true);
    try {
      if (form.invoice) {
        const checkFd = new FormData();
        checkFd.append('invoice', form.invoice);
        const checkRes  = await fetch('/api/check-invoice', { method: 'POST', headers: { 'x-requested-with': 'XMLHttpRequest' }, body: checkFd });
        const checkData = await checkRes.json() as { error?: string; ok?: boolean };
        if (!checkRes.ok) { setErrorMsg(checkData.error ?? "Cette facture ne peut pas être acceptée."); setLoading(false); return; }
      }

      const regRes  = await fetch('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-requested-with': 'XMLHttpRequest' }, body: JSON.stringify({ full_name: form.full_name.trim(), phone, wilaya: form.wilaya, is_painter: form.is_painter }) });
      const regData = await regRes.json() as { error?: string; participantId?: number; requiresInvoice?: boolean; alreadyRegistered?: boolean; hasInvoice?: boolean };
      if (!regRes.ok) {
        if (regData.alreadyRegistered) {
          setErrorMsg(regData.hasInvoice ? 'Ce numéro est déjà inscrit et a déjà soumis une facture.' : 'Ce numéro de téléphone est déjà inscrit.');
        } else {
          setErrorMsg(regData.error ?? "Erreur lors de l'inscription.");
        }
        setLoading(false);
        return;
      }

      if (form.invoice && regData.participantId) {
        const fd = new FormData();
        fd.append('invoice', form.invoice);
        fd.append('participantId', String(regData.participantId));
        const upRes  = await fetch('/api/upload-invoice', { method: 'POST', headers: { 'x-requested-with': 'XMLHttpRequest' }, body: fd });
        const upData = await upRes.json() as { error?: string; accepted?: boolean; message?: string };
        if (!upRes.ok) { setErrorMsg(upData.error ?? "Erreur lors de l'envoi de la facture."); setLoading(false); return; }
        setUploadResult({ accepted: upData.accepted === true, message: upData.message ?? '' });
      }

      setStep('done');
    } catch {
      setErrorMsg('Une erreur réseau est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-[#08080f] text-white overflow-x-hidden">

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          background: scrolled ? 'rgba(8,8,15,0.92)' : 'transparent',
          backdropFilter: scrolled ? 'blur(20px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
          boxShadow: scrolled ? '0 8px 40px rgba(0,0,0,0.5)' : 'none',
          transition: 'background 0.4s, backdrop-filter 0.4s, border-color 0.4s, box-shadow 0.4s',
        }}
      >
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-3">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-base shadow-lg"
              style={{ background: 'linear-gradient(135deg,#ef4444,#b91c1c)', boxShadow: '0 4px 20px rgba(239,68,68,0.4)' }}
            >
              J
            </div>
            <div className="leading-none">
              <div className="font-black text-white text-sm tracking-tight">JOTUN</div>
              <div className="text-[10px] font-bold text-red-400 tracking-[0.2em] uppercase">Tamboola</div>
            </div>
          </div>

          {/* Nav links */}
          <div className="ml-auto flex items-center gap-8">
            <a href="#prizes" className="text-sm text-white/45 hover:text-white transition-colors hidden md:block">Prix</a>
            <a href="#how"    className="text-sm text-white/45 hover:text-white transition-colors hidden md:block">Comment jouer</a>
            <a href="#faq"    className="text-sm text-white/45 hover:text-white transition-colors hidden md:block">FAQ</a>
            <button
              onClick={scrollToForm}
              className="text-sm font-bold text-white px-5 py-2.5 rounded-xl transition-all active:scale-95"
              style={{ background: 'linear-gradient(135deg,#ef4444,#b91c1c)', boxShadow: '0 0 20px rgba(239,68,68,0.35)' }}
            >
              Participer
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center px-6 overflow-hidden">

        {/* Background */}
        <div className="absolute inset-0" aria-hidden>
          {/* Radial gradient */}
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(239,68,68,0.18) 0%, transparent 70%)' }} />
          {/* Grid */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px)',
              backgroundSize: '64px 64px',
            }}
          />
          {/* Floating orbs */}
          <div className="absolute top-1/4 left-[15%] w-[480px] h-[480px] rounded-full blur-[100px] animate-float"   style={{ background: 'rgba(239,68,68,0.07)' }} />
          <div className="absolute bottom-1/4 right-[10%] w-[380px] h-[380px] rounded-full blur-[80px] animate-float-alt"   style={{ background: 'rgba(239,68,68,0.05)' }} />
          <div className="absolute top-2/3 left-1/2 w-[300px] h-[300px] rounded-full blur-[80px]" style={{ background: 'rgba(245,158,11,0.04)', animation: 'float 11s ease-in-out infinite 3s' }} />
          {/* Rotating ring */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full border border-white/[0.025] animate-rotate-slow"
            style={{ borderStyle: 'dashed' }}
          />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1100px] h-[1100px] rounded-full border border-white/[0.015]"
            style={{ borderStyle: 'dashed', animation: 'rotateSlow 35s linear infinite reverse' }}
          />
        </div>

        {/* Content */}
        <div className="relative max-w-5xl mx-auto text-center pt-24">

          {/* Status pill */}
          <div style={{ animation: 'fadeInUp 0.65s ease-out 0.15s both' }}>
            <div className="inline-flex items-center gap-2.5 border border-white/10 rounded-full px-4 py-2 mb-10" style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)' }}>
              <span className="w-2 h-2 bg-emerald-400 rounded-full" style={{ animation: 'pulseGlow 2s ease-in-out infinite', boxShadow: '0 0 8px rgba(52,211,153,0.8)' }} />
              <span className="text-white/75 text-sm font-medium">Campagne en cours · Inscriptions ouvertes</span>
            </div>
          </div>

          {/* Headline */}
          <div style={{ animation: 'fadeInUp 0.7s ease-out 0.3s both' }}>
            <h1 className="font-black tracking-tight leading-none mb-6" style={{ fontSize: 'clamp(3.5rem, 10vw, 8rem)' }}>
              <span className="text-white">La </span>
              <span
                style={{
                  background: 'linear-gradient(135deg,#ef4444,#f87171,#ef4444)',
                  backgroundSize: '200% 200%',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  animation: 'gradientShift 5s ease infinite',
                }}
              >
                Tamboola
              </span>
              <br />
              <span
                style={{
                  background: 'linear-gradient(135deg,#f59e0b,#fcd34d,#f59e0b)',
                  backgroundSize: '200% 200%',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  animation: 'gradientShift 5s ease infinite 1.2s',
                }}
              >
                Jotun
              </span>
            </h1>
          </div>

          {/* Subline */}
          <div style={{ animation: 'fadeInUp 0.7s ease-out 0.45s both' }}>
            <p className="text-white/55 text-lg md:text-xl max-w-xl mx-auto mb-10 leading-relaxed">
              Achetez des produits Jotun, inscrivez-vous et tentez de remporter
              l&apos;un des <strong className="text-white">6 prix exceptionnels</strong>.
            </p>
          </div>

          {/* CTAs */}
          <div style={{ animation: 'fadeInUp 0.7s ease-out 0.6s both' }}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-20">
              <button
                onClick={scrollToForm}
                className="relative font-black text-base text-white px-9 py-4.5 rounded-2xl transition-all active:scale-95"
                style={{
                  background: 'linear-gradient(135deg,#ef4444,#b91c1c)',
                  animation: 'pulseGlow 2.5s ease-in-out infinite',
                  padding: '1rem 2.25rem',
                }}
              >
                Je participe maintenant →
              </button>
              <Link
                href="#prizes"
                className="font-semibold text-base text-white/80 hover:text-white px-9 rounded-2xl border border-white/12 hover:border-white/25 transition-all"
                style={{ padding: '1rem 2.25rem', background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(8px)' }}
              >
                Voir les prix ↓
              </Link>
            </div>
          </div>

          {/* Stat chips */}
          <div style={{ animation: 'fadeInUp 0.7s ease-out 0.75s both' }}>
            <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
              {[{ n: '6', label: 'Prix à gagner' }, { n: '20K', label: 'DA min.' }, { n: '100%', label: 'Gratuit' }].map(s => (
                <div
                  key={s.label}
                  className="rounded-2xl p-4 border border-white/6"
                  style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(8px)' }}
                >
                  <div className="font-black text-xl text-white">{s.n}</div>
                  <div className="text-white/35 text-[11px] mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Scroll cue */}
          <div className="mt-16 flex flex-col items-center gap-2 opacity-30">
            <span className="text-[10px] text-white uppercase tracking-widest">Défiler</span>
            <svg className="w-4 h-4 text-white animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </section>

      {/* ── Section divider ─────────────────────────────────────────────────── */}
      <div className="h-px" style={{ background: 'linear-gradient(90deg,transparent,rgba(239,68,68,0.3),transparent)' }} />

      {/* ── Prizes ─────────────────────────────────────────────────────────── */}
      <section id="prizes" className="py-32 px-6 relative">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(239,68,68,0.04) 0%, transparent 70%)' }} aria-hidden />

        <div className="relative max-w-5xl mx-auto">
          {/* Heading */}
          <div ref={prizesRef} className="text-center mb-16">
            <div style={reveal(prizesVisible, 0)}>
              <div className="inline-flex items-center gap-3 mb-5">
                <div className="h-px w-10 bg-red-500/50" />
                <span className="text-red-400 text-xs font-bold tracking-[0.3em] uppercase">Les récompenses</span>
                <div className="h-px w-10 bg-red-500/50" />
              </div>
            </div>
            <div style={reveal(prizesVisible, 80)}>
              <h2 className="text-5xl md:text-6xl font-black text-white mb-4">Prix à gagner</h2>
            </div>
            <div style={reveal(prizesVisible, 140)}>
              <p className="text-white/45 text-lg max-w-md mx-auto">Six gagnants tirés au sort parmi tous les participants valides.</p>
            </div>
          </div>

          {/* Cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {prizes.map((p, i) => (
              <PrizeCard key={p.rank} p={p} index={i} visible={prizesVisible} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Section divider ─────────────────────────────────────────────────── */}
      <div className="h-px" style={{ background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.06),transparent)' }} />

      {/* ── How it works ───────────────────────────────────────────────────── */}
      <section id="how" className="py-32 px-6 relative overflow-hidden" style={{ background: '#0a0a14' }}>
        {/* Central spine line */}
        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px" style={{ background: 'linear-gradient(to bottom,transparent,rgba(239,68,68,0.15),transparent)' }} aria-hidden />

        <div className="relative max-w-5xl mx-auto">
          {/* Heading */}
          <div ref={stepsRef} className="text-center mb-20">
            <div style={reveal(stepsVisible, 0)}>
              <div className="inline-flex items-center gap-3 mb-5">
                <div className="h-px w-10 bg-red-500/50" />
                <span className="text-red-400 text-xs font-bold tracking-[0.3em] uppercase">Participation</span>
                <div className="h-px w-10 bg-red-500/50" />
              </div>
            </div>
            <div style={reveal(stepsVisible, 80)}>
              <h2 className="text-5xl md:text-6xl font-black text-white">Comment jouer ?</h2>
            </div>
          </div>

          {/* Steps */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            {/* Connector (desktop) */}
            <div
              className="hidden lg:block absolute top-10 left-[calc(12.5%+28px)] right-[calc(12.5%+28px)] h-px pointer-events-none"
              style={{
                background: 'linear-gradient(90deg,rgba(239,68,68,0.4),rgba(239,68,68,0.2),rgba(239,68,68,0.4))',
                opacity: stepsVisible ? 1 : 0,
                transition: 'opacity 1s ease 0.6s',
              }}
              aria-hidden
            />

            {howSteps.map((s, i) => (
              <div key={s.n} style={reveal(stepsVisible, 200 + i * 120)} className="flex flex-col items-center md:items-start text-center md:text-left">
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 font-black text-white text-xl relative z-10 flex-shrink-0"
                  style={{
                    background: 'linear-gradient(135deg,#ef4444,#b91c1c)',
                    boxShadow: '0 8px 32px rgba(239,68,68,0.35)',
                  }}
                >
                  {s.n}
                </div>
                <h3 className="font-bold text-white text-lg mb-2">{s.title}</h3>
                <p className="text-white/45 text-sm leading-relaxed">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Painter callout */}
          <div
            className="mt-16 relative overflow-hidden rounded-2xl"
            style={{
              border: '1px solid rgba(245,158,11,0.2)',
              background: 'linear-gradient(135deg,rgba(245,158,11,0.06),rgba(180,83,9,0.03))',
              ...reveal(stepsVisible, 700),
            }}
          >
            <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg,transparent,rgba(245,158,11,0.4),transparent)' }} aria-hidden />
            <div className="p-6 flex gap-5 items-start">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(245,158,11,0.12)' }}>
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </div>
              <div>
                <div className="font-bold text-amber-400 mb-1">Vous êtes peintre en bâtiment ?</div>
                <p className="text-amber-200/55 text-sm leading-relaxed">
                  Une facture d&apos;achat Jotun d&apos;un montant minimum de{' '}
                  <strong className="text-amber-300">20 000 DA</strong> est requise pour valider votre participation.
                  Elle sera analysée automatiquement par notre système.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section divider ─────────────────────────────────────────────────── */}
      <div className="h-px" style={{ background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.06),transparent)' }} />

      {/* ── FAQ ────────────────────────────────────────────────────────────── */}
      <section id="faq" className="py-32 px-6 relative bg-[#08080f]">
        <div className="relative max-w-2xl mx-auto">
          <div ref={faqRef} className="text-center mb-14">
            <div style={reveal(faqVisible, 0)}>
              <div className="inline-flex items-center gap-3 mb-5">
                <div className="h-px w-10 bg-red-500/50" />
                <span className="text-red-400 text-xs font-bold tracking-[0.3em] uppercase">Questions fréquentes</span>
                <div className="h-px w-10 bg-red-500/50" />
              </div>
            </div>
            <div style={reveal(faqVisible, 80)}>
              <h2 className="text-5xl font-black text-white">FAQ</h2>
            </div>
          </div>

          <div className="space-y-3">
            {faqs.map((f, i) => (
              <FaqItem key={f.q} f={f} index={i} visible={faqVisible} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Section divider ─────────────────────────────────────────────────── */}
      <div className="h-px" style={{ background: 'linear-gradient(90deg,transparent,rgba(239,68,68,0.25),transparent)' }} />

      {/* ── Registration ───────────────────────────────────────────────────── */}
      <section id="register" ref={formRef} className="py-32 px-6 relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 50% 60% at 50% 0%, rgba(239,68,68,0.1) 0%, transparent 70%)' }}
          aria-hidden
        />

        <div className="relative max-w-lg mx-auto">
          {/* Heading */}
          <div ref={formTitleRef} className="text-center mb-12">
            <div style={reveal(formTitleVisible, 0)}>
              <div className="inline-flex items-center gap-3 mb-5">
                <div className="h-px w-10 bg-red-500/50" />
                <span className="text-red-400 text-xs font-bold tracking-[0.3em] uppercase">Inscription</span>
                <div className="h-px w-10 bg-red-500/50" />
              </div>
            </div>
            <div style={reveal(formTitleVisible, 80)}>
              <h2 className="text-5xl font-black text-white mb-3">Participez maintenant</h2>
            </div>
            <div style={reveal(formTitleVisible, 140)}>
              <p className="text-white/40">Inscription gratuite et rapide.</p>
            </div>
          </div>

          {/* Success state */}
          {step === 'done' ? (
            <div
              className="relative overflow-hidden rounded-3xl text-center p-10"
              style={{ border: '1px solid rgba(16,185,129,0.2)', background: 'linear-gradient(135deg,rgba(16,185,129,0.07),rgba(5,150,105,0.04))' }}
            >
              <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg,transparent,rgba(16,185,129,0.5),transparent)' }} aria-hidden />
              <div
                className="w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center"
                style={{ background: 'rgba(16,185,129,0.12)' }}
              >
                <svg viewBox="0 0 24 24" className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-black text-white mb-3">Inscription confirmée !</h3>
              <p className="text-white/50 text-sm leading-relaxed">
                {uploadResult?.message || 'Vous êtes bien inscrit à la Tamboola Jotun. Bonne chance !'}
              </p>
              <button
                onClick={() => { setStep('form'); setUploadResult(null); setForm({ full_name: '', phone: '', wilaya: '', is_painter: false, consent: false, invoice: null }); }}
                className="mt-8 text-sm text-red-400 hover:text-red-300 font-semibold transition-colors"
              >
                Nouvelle inscription →
              </button>
            </div>
          ) : (
            /* Form card */
            <div
              className="relative overflow-hidden rounded-3xl"
              style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'linear-gradient(135deg,#0f0f1c,#12121f)' }}
            >
              {/* Top accent */}
              <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg,transparent,rgba(239,68,68,0.6),transparent)' }} aria-hidden />

              {/* Card header */}
              <div className="px-8 py-7 border-b border-white/5">
                <h3 className="text-white font-bold text-xl">Créer votre participation</h3>
                <p className="text-white/35 text-sm mt-1">Rejoignez le programme et tentez votre chance</p>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                {/* Error */}
                {errorMsg && (
                  <div
                    className="rounded-xl p-4 flex gap-3 items-start text-sm"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}
                  >
                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Name */}
                <div>
                  <label className="block text-[11px] font-bold text-white/40 tracking-[0.18em] uppercase mb-2.5">
                    Nom complet <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text" required autoComplete="name"
                    value={form.full_name} onChange={e => set('full_name', e.target.value)}
                    placeholder="Ahmed Benali"
                    className="w-full rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 outline-none transition-all"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                    onFocus={e => { e.currentTarget.style.border = '1px solid rgba(239,68,68,0.45)'; e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
                    onBlur={e => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.08)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-[11px] font-bold text-white/40 tracking-[0.18em] uppercase mb-2.5">
                    Téléphone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel" required autoComplete="tel"
                    value={form.phone} onChange={e => set('phone', e.target.value)}
                    placeholder="0555 123 456"
                    className="w-full rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 outline-none transition-all"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                    onFocus={e => { e.currentTarget.style.border = '1px solid rgba(239,68,68,0.45)'; e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
                    onBlur={e => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.08)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                  />
                </div>

                {/* Wilaya */}
                <div>
                  <label className="block text-[11px] font-bold text-white/40 tracking-[0.18em] uppercase mb-2.5">
                    Wilaya <span className="text-red-500">*</span>
                  </label>
                  <select
                    required value={form.wilaya} onChange={e => set('wilaya', e.target.value)}
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all appearance-none"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: form.wilaya ? '#fff' : 'rgba(255,255,255,0.2)',
                      colorScheme: 'dark',
                    }}
                    onFocus={e => { e.currentTarget.style.border = '1px solid rgba(239,68,68,0.45)'; }}
                    onBlur={e => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.08)'; }}
                  >
                    <option value="" style={{ background: '#0f0f1c', color: 'rgba(255,255,255,0.4)' }}>— Sélectionner votre wilaya —</option>
                    {WILAYAS.map(w => <option key={w} value={w} style={{ background: '#0f0f1c', color: '#fff' }}>{w}</option>)}
                  </select>
                </div>

                {/* Profession toggle */}
                <div>
                  <label className="block text-[11px] font-bold text-white/40 tracking-[0.18em] uppercase mb-2.5">Profession</label>
                  <button
                    type="button"
                    onClick={() => set('is_painter', !form.is_painter)}
                    className="w-full flex items-center gap-4 p-4 rounded-xl text-left transition-all"
                    style={{
                      border: form.is_painter ? '1px solid rgba(239,68,68,0.35)' : '1px solid rgba(255,255,255,0.08)',
                      background: form.is_painter ? 'rgba(239,68,68,0.07)' : 'rgba(255,255,255,0.03)',
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
                      style={{ background: form.is_painter ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.06)' }}
                    >
                      <svg viewBox="0 0 24 24" className={`w-5 h-5 transition-colors ${form.is_painter ? 'text-red-400' : 'text-white/35'}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className={`text-sm font-semibold transition-colors ${form.is_painter ? 'text-red-300' : 'text-white/60'}`}>
                        Je suis peintre en bâtiment
                      </div>
                      <div className="text-[11px] text-white/25 mt-0.5">
                        {form.is_painter ? 'Facture Jotun ≥ 20 000 DA requise' : 'Cliquez si vous exercez ce métier'}
                      </div>
                    </div>
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all"
                      style={{ background: form.is_painter ? '#ef4444' : 'transparent', borderColor: form.is_painter ? '#ef4444' : 'rgba(255,255,255,0.2)' }}
                    >
                      {form.is_painter && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </button>
                </div>

                {/* Invoice upload */}
                <div>
                  <label className="block text-[11px] font-bold text-white/40 tracking-[0.18em] uppercase mb-2.5">
                    Facture Jotun <span className="text-red-500">*</span>
                  </label>
                  <PhotoTips />
                  <label
                    className="flex flex-col items-center justify-center gap-3 w-full border-2 border-dashed rounded-xl px-4 py-8 cursor-pointer transition-all"
                    style={{
                      borderColor: form.invoice ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.1)',
                      background: form.invoice ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.02)',
                    }}
                    onMouseEnter={e => { if (!form.invoice) e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; }}
                    onMouseLeave={e => { if (!form.invoice) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                  >
                    <input type="file" accept="image/*,application/pdf" className="hidden" onChange={e => set('invoice', e.target.files?.[0] ?? null)} />
                    {form.invoice ? (
                      <>
                        <svg viewBox="0 0 24 24" className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm font-semibold text-emerald-400">{form.invoice.name}</span>
                        <span className="text-xs text-white/25">Cliquez pour changer</span>
                      </>
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" className="w-8 h-8 text-white/25" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                        <span className="text-sm font-semibold text-white/40">Joindre la facture</span>
                        <span className="text-xs text-white/20">JPG, PNG ou PDF · max 10 Mo</span>
                      </>
                    )}
                  </label>
                  {form.is_painter && (
                    <p className="text-xs mt-2 px-3 py-2 rounded-lg" style={{ color: 'rgba(253,230,138,0.8)', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}>
                      En tant que peintre, votre facture doit afficher un montant ≥ 20 000 DA.
                    </p>
                  )}
                </div>

                {/* Consent */}
                <div>
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <button
                      type="button"
                      onClick={() => set('consent', !form.consent)}
                      className="mt-0.5 w-5 h-5 rounded flex-shrink-0 flex items-center justify-center transition-all border-2"
                      style={{ background: form.consent ? '#ef4444' : 'transparent', borderColor: form.consent ? '#ef4444' : 'rgba(255,255,255,0.2)' }}
                    >
                      {form.consent && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    <span className="text-sm text-white/40 group-hover:text-white/55 leading-relaxed transition-colors">
                      J&apos;accepte de participer à la Tamboola Jotun et consens à ce que mes informations soient utilisées dans le cadre de ce programme.
                    </span>
                  </label>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading || !form.consent}
                  className="w-full font-bold text-sm text-white rounded-xl py-4 flex items-center justify-center gap-2.5 transition-all active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: 'linear-gradient(135deg,#ef4444,#b91c1c)',
                    boxShadow: form.consent ? '0 0 32px rgba(239,68,68,0.4)' : 'none',
                  }}
                >
                  {loading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      {form.is_painter ? 'Envoi en cours...' : 'Inscription en cours...'}
                    </>
                  ) : (
                    form.is_painter ? "S'inscrire et envoyer la facture →" : "S'inscrire →"
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="relative px-6 py-16 border-t border-white/5" style={{ background: '#060609' }}>
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            {/* Brand */}
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white"
                style={{ background: 'linear-gradient(135deg,#ef4444,#b91c1c)', boxShadow: '0 4px 16px rgba(239,68,68,0.3)' }}
              >
                J
              </div>
              <div>
                <div className="font-black text-white tracking-tight">JOTUN</div>
                <div className="text-[10px] text-red-400 font-bold tracking-[0.2em] uppercase">Tamboola</div>
              </div>
            </div>

            <p className="text-white/25 text-sm text-center">
              Programme de fidélité Jotun Algérie · Tirage au sort officiel
            </p>

            <div className="flex items-center gap-6">
              <a href="#register"    className="text-white/25 hover:text-white text-sm transition-colors">Participer</a>
              <a href="/admin/login" className="text-white/25 hover:text-white text-sm transition-colors">Admin</a>
            </div>
          </div>

          <div className="mt-10 pt-8 text-center text-white/15 text-xs" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            © {new Date().getFullYear()} Jotun Algérie. Tous droits réservés.
          </div>
        </div>
      </footer>

    </main>
  );
}
