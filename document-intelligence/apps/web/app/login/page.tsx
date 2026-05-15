'use client';

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@jvp/shared-db';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const supabase = createSupabaseBrowserClient();

  const sendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    setError(null);
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (err) {
      setError(err.message);
      setStatus('error');
    } else {
      setStatus('sent');
    }
  };

  const oauth = async (provider: 'google' | 'azure') => {
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <h1 className="text-3xl font-semibold">Iniciar sesión</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Accede a tu workspace de JVP Document Intelligence.
      </p>

      <div className="mt-8 space-y-3">
        <button
          type="button"
          onClick={() => oauth('google')}
          className="w-full rounded-md border border-zinc-300 py-3 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Continuar con Google
        </button>
        <button
          type="button"
          onClick={() => oauth('azure')}
          className="w-full rounded-md border border-zinc-300 py-3 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Continuar con Microsoft
        </button>
      </div>

      <div className="my-6 flex items-center gap-3 text-xs text-zinc-400">
        <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
        <span>o por correo</span>
        <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
      </div>

      <form onSubmit={sendMagicLink} className="space-y-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@correo.com"
          className="w-full rounded-md border border-zinc-300 px-4 py-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="submit"
          disabled={status === 'sending'}
          className="w-full rounded-md bg-zinc-900 py-3 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          {status === 'sending' ? 'Enviando…' : 'Enviar enlace mágico'}
        </button>
      </form>

      {status === 'sent' && (
        <p className="mt-4 text-sm text-emerald-600">Revisa tu correo para el enlace de acceso.</p>
      )}
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
    </main>
  );
}
