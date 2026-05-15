'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewContractorPage() {
  const router = useRouter();
  const [rfc, setRfc] = useState('');
  const [razon, setRazon] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/laboral/contractors', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          rfc,
          razon_social: razon,
          contact_email: email || undefined,
          contact_phone: phone || undefined,
        }),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error ?? 'Error');
      }
      const { id } = (await res.json()) as { id: string };
      router.push(`/laboral/${id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Nuevo contratista</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Después de crear el contratista podrás subir sus documentos (REPSE, SAT 32-D, IMSS, INFONAVIT, CSF).
      </p>

      <form onSubmit={submit} className="mt-8 space-y-5">
        <div>
          <label className="block text-sm font-medium">RFC *</label>
          <input
            required
            value={rfc}
            onChange={(e) => setRfc(e.target.value.toUpperCase())}
            placeholder="ABC123456XYZ"
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm font-mono uppercase dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Razón social *</label>
          <input
            required
            value={razon}
            onChange={(e) => setRazon(e.target.value)}
            placeholder="Servicios Profesionales SA de CV"
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Email de contacto</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="contacto@empresa.com"
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <p className="mt-1 text-xs text-zinc-500">Lo usaremos para alertas de vencimiento.</p>
        </div>
        <div>
          <label className="block text-sm font-medium">Teléfono (WhatsApp)</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+521234567890"
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => router.push('/laboral')}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            {busy ? 'Creando…' : 'Crear contratista'}
          </button>
        </div>
      </form>
    </main>
  );
}
