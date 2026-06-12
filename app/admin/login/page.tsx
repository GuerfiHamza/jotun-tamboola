'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLogin() {
  const router = useRouter();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

 async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  setError('');
  setLoading(true);
  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-requested-with': 'XMLHttpRequest', },
      body: JSON.stringify(form),
    });
    const data = await res.json() as { success?: boolean; error?: string };
    if (!res.ok || !data.success) {
      setError(data.error ?? 'Erreur de connexion');
      return;
    }
    // Force a hard redirect so the cookie is picked up by middleware
    window.location.href = '/admin';
  } finally {
    setLoading(false);
  }
}

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-red-600 rounded-xl flex items-center justify-center text-white font-bold text-xl mx-auto mb-3">J</div>
          <h1 className="text-xl font-bold text-gray-900">Administration</h1>
          <p className="text-sm text-gray-500">Jotun Tamboola Dashboard</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          {error && (
            <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3 mb-4 flex gap-2">
              <span>❌</span><span>{error}</span>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Nom d&apos;utilisateur</label>
              <input
                type="text" required value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Mot de passe</label>
              <input
                type="password" required value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors"
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}