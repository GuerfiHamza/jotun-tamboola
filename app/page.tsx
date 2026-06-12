'use client';
import PhotoTips from './components/PhotoTips';
import { useState, useRef } from 'react';
import Link from 'next/link';

const prizes = [
  { rank: '1er Prix', label: 'Télévision 55"', icon: '📺', bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-400 text-amber-900', glow: 'shadow-amber-100' },
  { rank: '2ème Prix', label: 'Réfrigérateur', icon: '🧊', bg: 'bg-slate-50', border: 'border-slate-200', badge: 'bg-slate-300 text-slate-800', glow: 'shadow-slate-100' },
  { rank: '3ème Prix', label: 'Machine à laver', icon: '🫧', bg: 'bg-orange-50', border: 'border-orange-200', badge: 'bg-orange-300 text-orange-900', glow: 'shadow-orange-100' },
  { rank: '4ème Prix', label: 'Climatiseur', icon: '❄️', bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-300 text-blue-900', glow: 'shadow-blue-100' },
  { rank: '5ème Prix', label: 'Aspirateur', icon: '💨', bg: 'bg-purple-50', border: 'border-purple-200', badge: 'bg-purple-300 text-purple-900', glow: 'shadow-purple-100' },
  { rank: '6ème Prix', label: 'Kit outils Jotun', icon: '🎁', bg: 'bg-green-50', border: 'border-green-200', badge: 'bg-green-300 text-green-900', glow: 'shadow-green-100' },
];

const howSteps = [
  { n: '01', title: 'Inscrivez-vous', sub: 'Remplissez le formulaire en quelques minutes avec vos informations.' },
  { n: '02', title: 'Soumettez une facture', sub: 'Les peintres uploadent une facture Jotun ≥ 20 000 DA pour valider.' },
  { n: '03', title: 'Entrez dans le tirage', sub: 'Votre dossier est validé et vous participez automatiquement.' },
  { n: '04', title: 'Gagnez un prix', sub: "Les gagnants sont contactés directement par l'équipe Jotun." },
];

const faqs = [
  { q: 'Qui peut participer ?', a: "Tout acheteur de produits Jotun en Algérie. Les peintres en bâtiment doivent fournir une facture justificative." },
  { q: 'Quelle est la date limite ?', a: "Les inscriptions sont ouvertes jusqu'à la fin de la campagne. Le tirage au sort sera annoncé sur nos canaux officiels." },
  { q: "Comment saurai-je si j'ai gagné ?", a: "L'équipe Jotun vous contactera directement par téléphone au numéro fourni lors de l'inscription." },
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

type FormState = {
  full_name: string;
  phone: string;
  wilaya: string;
  is_painter: boolean;
  consent: boolean;
  invoice: File | null;
};

type Step = 'form' | 'done';

export default function LandingPage() {
  const formRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState<FormState>({
    full_name: '', phone: '', wilaya: '', is_painter: false, consent: false, invoice: null,
  });
  const [step, setStep] = useState<Step>('form');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ accepted: boolean; message: string } | null>(null);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');

    if (!form.full_name.trim()) { setErrorMsg('Veuillez entrer votre nom complet.'); return; }
    if (!form.phone.trim()) { setErrorMsg('Veuillez entrer votre numéro de téléphone.'); return; }
    let phone = form.phone.replace(/[\s.-]/g, '');
    if (phone.startsWith('+213')) phone = phone.slice(4);
    else if (phone.startsWith('00213')) phone = phone.slice(5);
    if (phone.startsWith('0') && phone.length === 11) phone = phone.slice(1);
    if (/^[2-7]\d{8}$/.test(phone)) phone = '0' + phone;
    if (!/^0[2-7]\d{8}$/.test(phone)) { setErrorMsg('Numéro de téléphone algérien invalide (ex : 0550123456 ou +213550123456).'); return; }
    if (!form.wilaya) { setErrorMsg('Veuillez sélectionner votre wilaya.'); return; }
    if (form.is_painter && !form.invoice) { setErrorMsg('Veuillez joindre votre facture Jotun.'); return; }
    if (!form.consent) { setErrorMsg('Veuillez accepter les conditions de participation.'); return; }
if (!form.invoice) { setErrorMsg('Veuillez joindre votre facture Jotun.'); return; }

    setLoading(true);
    try {
      const regRes = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-requested-with': 'XMLHttpRequest' },
        body: JSON.stringify({
          full_name: form.full_name.trim(),
          phone,
          wilaya: form.wilaya,
          is_painter: form.is_painter,
        }),
      });
      const regData = await regRes.json() as { error?: string; participantId?: number; requiresInvoice?: boolean };
      if (!regRes.ok) { setErrorMsg(regData.error ?? "Erreur lors de l'inscription."); setLoading(false); return; }

      if (form.invoice && regData.participantId) {
  const fd = new FormData();
  fd.append('invoice', form.invoice);
  fd.append('participantId', String(regData.participantId));
  const upRes = await fetch('/api/upload-invoice', {
    method: 'POST',
    headers: { 'x-requested-with': 'XMLHttpRequest' },
    body: fd,
  });
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

  return (
    <main className="min-h-screen bg-white overflow-x-hidden">

      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-red-600 rounded-xl flex items-center justify-center text-white font-black text-sm tracking-tight">J</div>
            <div className="leading-none">
              <div className="font-black text-gray-900 text-sm tracking-tight">JOTUN</div>
              <div className="text-xs font-bold text-red-600 tracking-widest">TAMBOOLA</div>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-6">
            <a href="#prizes" className="text-sm text-gray-500 hover:text-gray-900 transition-colors hidden md:block">Prix</a>
            <a href="#how" className="text-sm text-gray-500 hover:text-gray-900 transition-colors hidden md:block">Comment jouer</a>
            <a href="#faq" className="text-sm text-gray-500 hover:text-gray-900 transition-colors hidden md:block">FAQ</a>
            <button onClick={scrollToForm} className="bg-red-600 hover:bg-red-700 active:scale-95 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all">
              Participer →
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-28 pb-24 px-6 overflow-hidden bg-gradient-to-br from-red-600 via-red-700 to-red-900">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-white/5" />
          <div className="absolute -bottom-20 -left-20 w-[400px] h-[400px] rounded-full bg-white/5" />
          <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.5" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots)" />
          </svg>
        </div>
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 mb-8">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-white/90 text-sm font-semibold">Campagne en cours — Inscriptions ouvertes</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-white leading-none tracking-tight mb-6">
            La Tamboola<br /><span className="text-red-200">Jotun</span>
          </h1>
          <p className="text-red-100 text-lg md:text-xl max-w-xl mx-auto mb-4 leading-relaxed">
            Achetez des produits Jotun, inscrivez-vous et tentez de remporter l&apos;un des
            <strong className="text-white"> 6 prix exceptionnels</strong>.
          </p>
          <p className="text-red-200/70 text-sm mb-10">Ouvert à tous les acheteurs Jotun en Algérie · Tirage au sort officiel</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={scrollToForm} className="bg-white hover:bg-gray-50 active:scale-95 text-red-700 font-black text-base px-8 py-4 rounded-2xl transition-all shadow-xl shadow-red-900/30">
              Je participe maintenant →
            </button>
            <Link href="#prizes" className="border-2 border-white/30 hover:border-white/60 text-white font-semibold text-base px-8 py-4 rounded-2xl transition-all backdrop-blur-sm">
              Voir les prix ↓
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-16 max-w-lg mx-auto">
            {[{ n: '6', label: 'Prix à gagner' }, { n: '20K', label: 'DA min. facture' }, { n: '100%', label: 'Gratuit' }].map(s => (
              <div key={s.label} className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
                <div className="text-white font-black text-2xl">{s.n}</div>
                <div className="text-red-200 text-xs mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="bg-red-900 leading-none">
        <svg viewBox="0 0 1440 60" className="w-full block" preserveAspectRatio="none">
          <path d="M0,60 C360,0 1080,60 1440,20 L1440,60 Z" fill="white" />
        </svg>
      </div>

      {/* ── Prizes ── */}
      <section id="prizes" className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-red-600 font-bold text-sm tracking-widest uppercase">Les récompenses</span>
            <h2 className="text-4xl font-black text-gray-900 mt-2">Prix à gagner</h2>
            <p className="text-gray-500 mt-3 max-w-md mx-auto">Six gagnants tirés au sort parmi tous les participants valides de la campagne.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {prizes.map((p, i) => (
              <div key={p.rank} className={`relative ${p.bg} border-2 ${p.border} rounded-2xl p-6 transition-transform hover:-translate-y-1 hover:shadow-lg ${p.glow} ${i === 0 ? 'sm:col-span-2 lg:col-span-1 ring-2 ring-amber-300 ring-offset-2' : ''}`}>
                {i === 0 && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-900 text-xs font-black px-3 py-1 rounded-full whitespace-nowrap">⭐ GRAND PRIX</div>
                )}
                <div className="text-4xl mb-3">{p.icon}</div>
                <div className={`inline-block text-xs font-black px-2.5 py-1 rounded-full mb-2 ${p.badge}`}>{p.rank}</div>
                <div className="text-gray-900 font-bold text-lg">{p.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" className="py-24 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-red-600 font-bold text-sm tracking-widest uppercase">Participation</span>
            <h2 className="text-4xl font-black text-gray-900 mt-2">Comment jouer ?</h2>
            <p className="text-gray-500 mt-3 max-w-md mx-auto">Quatre étapes simples pour tenter votre chance.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {howSteps.map((s, i) => (
              <div key={s.n} className="relative">
                {i < howSteps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-full w-full h-px border-t-2 border-dashed border-red-200 z-0" style={{ width: 'calc(100% - 2rem)', left: '75%' }} />
                )}
                <div className="relative bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow z-10">
                  <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center text-white font-black text-sm mb-4">{s.n}</div>
                  <h3 className="font-bold text-gray-900 mb-2">{s.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{s.sub}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-10 bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 flex gap-4 items-start">
            <div className="text-3xl flex-shrink-0">🖌️</div>
            <div>
              <div className="font-bold text-amber-900 mb-1">Vous êtes peintre en bâtiment ?</div>
              <p className="text-amber-800 text-sm leading-relaxed">
                Une facture d&apos;achat Jotun d&apos;un montant minimum de <strong>20 000 DA</strong> est requise pour valider votre participation. Elle sera analysée automatiquement par notre système.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-24 px-6 bg-white">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-red-600 font-bold text-sm tracking-widest uppercase">Questions fréquentes</span>
            <h2 className="text-4xl font-black text-gray-900 mt-2">FAQ</h2>
          </div>
          <div className="space-y-4">
            {faqs.map(f => (
              <div key={f.q} className="border border-gray-100 rounded-2xl p-6 hover:border-red-100 hover:bg-red-50/30 transition-all">
                <div className="font-bold text-gray-900 mb-2 flex gap-3">
                  <span className="text-red-500 flex-shrink-0">?</span>{f.q}
                </div>
                <p className="text-gray-500 text-sm leading-relaxed pl-6">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Registration Form ── */}
      <section id="register" ref={formRef} className="py-24 px-6 bg-gray-50">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-10">
            <span className="text-red-600 font-bold text-sm tracking-widest uppercase">Inscription</span>
            <h2 className="text-4xl font-black text-gray-900 mt-2">Participez maintenant</h2>
            <p className="text-gray-500 mt-3">Inscription gratuite et rapide.</p>
          </div>

          {step === 'done' ? (
            <div className="bg-white rounded-2xl border-2 border-green-200 shadow-sm p-10 text-center">
              <div className="text-5xl mb-4">🎉</div>
              <h3 className="text-xl font-black text-gray-900 mb-2">Inscription confirmée !</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                {uploadResult?.message
                  ? uploadResult.message
                  : 'Vous êtes bien inscrit à la Tamboola Jotun. Bonne chance !'}
              </p>
              <button
                onClick={() => { setStep('form'); setUploadResult(null); setForm({ full_name: '', phone: '', wilaya: '', is_painter: false, consent: false, invoice: null }); }}
                className="mt-6 text-sm text-red-600 font-semibold hover:underline"
              >
                Nouvelle inscription
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-5">
                <h3 className="text-white font-bold text-lg">Créer votre participation</h3>
                <p className="text-red-100 text-sm mt-0.5">Rejoignez le programme et tentez votre chance</p>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {errorMsg && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3.5 flex gap-2 items-start">
                    <span className="flex-shrink-0">❌</span><span>{errorMsg}</span>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nom complet <span className="text-red-500">*</span></label>
                  <input type="text" required autoComplete="name" value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Ahmed Benali"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Numéro de téléphone <span className="text-red-500">*</span></label>
                  <input type="tel" required autoComplete="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="0555 123 456"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Wilaya <span className="text-red-500">*</span></label>
                  <select required value={form.wilaya} onChange={e => set('wilaya', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all">
                    <option value="">— Sélectionner votre wilaya —</option>
                    {WILAYAS.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Profession</label>
                  <button type="button" onClick={() => set('is_painter', !form.is_painter)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${form.is_painter ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-gray-50 hover:border-gray-300'}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 transition-all ${form.is_painter ? 'bg-red-100' : 'bg-gray-200'}`}>🖌️</div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-semibold ${form.is_painter ? 'text-red-700' : 'text-gray-700'}`}>Je suis peintre en bâtiment</div>
                      <div className="text-xs text-gray-500 mt-0.5">{form.is_painter ? 'Une facture Jotun ≥ 20 000 DA sera requise' : 'Cliquez si vous exercez ce métier'}</div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${form.is_painter ? 'bg-red-600 border-red-600' : 'border-gray-300'}`}>
                      {form.is_painter && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </button>
                </div>

                {/* Invoice upload — always required */}
<div>
  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
    Facture Jotun <span className="text-red-500">*</span>
  </label>
  <PhotoTips />
  <label className={`flex flex-col items-center justify-center gap-2 w-full border-2 border-dashed rounded-xl px-4 py-6 cursor-pointer transition-all
    ${form.invoice ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-gray-50 hover:border-red-300 hover:bg-red-50/40'}`}>
    <input
      type="file"
      accept="image/*,application/pdf"
      className="hidden"
      onChange={e => set('invoice', e.target.files?.[0] ?? null)}
    />
    {form.invoice ? (
      <><span className="text-2xl">✅</span><span className="text-sm font-semibold text-green-700">{form.invoice.name}</span><span className="text-xs text-green-600">Cliquez pour changer</span></>
    ) : (
      <><span className="text-2xl">📎</span><span className="text-sm font-semibold text-gray-600">Joindre la facture</span><span className="text-xs text-gray-400">JPG, PNG ou PDF · max 10 Mo</span></>
    )}
  </label>
  {form.is_painter && (
    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mt-2">
      ⚠️ En tant que peintre, votre facture doit afficher un montant ≥ 20 000 DA.
    </p>
  )}
</div>

                <div>
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <button type="button" onClick={() => set('consent', !form.consent)}
                      className={`mt-0.5 w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all ${form.consent ? 'bg-red-600 border-red-600' : 'border-gray-300 group-hover:border-red-400'}`}>
                      {form.consent && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    <span className="text-sm text-gray-600 leading-relaxed">
                      J&apos;accepte de participer à la Tamboola Jotun et consens à ce que mes informations soient utilisées dans le cadre de ce programme.
                    </span>
                  </label>
                </div>

                <button type="submit" disabled={loading || !form.consent}
                  className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl py-3.5 text-sm transition-all flex items-center justify-center gap-2">
                  {loading ? (
                    <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>{form.is_painter ? 'Envoi en cours...' : 'Inscription en cours...'}</>
                  ) : (
                    form.is_painter ? "S'inscrire et envoyer la facture →" : "S'inscrire →"
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-gray-900 text-white px-6 py-12">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center font-black">J</div>
              <div>
                <div className="font-black tracking-tight">JOTUN</div>
                <div className="text-xs text-red-400 font-bold tracking-widest">TAMBOOLA</div>
              </div>
            </div>
            <p className="text-gray-400 text-sm text-center">Programme de fidélité Jotun Algérie · Tirage au sort officiel</p>
            <div className="flex items-center gap-4">
              <a href="#register" className="text-gray-400 hover:text-white text-sm transition-colors">Participer</a>
              <a href="/admin/login" className="text-gray-400 hover:text-white text-sm transition-colors">Admin</a>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-600 text-xs">
            © {new Date().getFullYear()} Jotun Algérie. Tous droits réservés.
          </div>
        </div>
      </footer>

    </main>
  );
}