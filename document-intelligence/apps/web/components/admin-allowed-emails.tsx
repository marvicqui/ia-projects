'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { formatDate } from '@/lib/dates';

interface AllowedEmail {
  id: string;
  email: string;
  notes: string | null;
  created_at: string;
}

interface Props {
  initial: AllowedEmail[];
}

export const AdminAllowedEmails = ({ initial }: Props) => {
  const router = useRouter();
  const [items, setItems] = useState<AllowedEmail[]>(initial);
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = await fetch('/api/admin/allowed-emails', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, notes: notes || undefined }),
    });
    if (!res.ok) {
      const j = await res.json();
      setError(j.error ?? 'Error');
      return;
    }
    const { entry } = (await res.json()) as { entry: AllowedEmail };
    setItems([entry, ...items]);
    setEmail('');
    setNotes('');
  };

  const remove = (id: string) => {
    startTransition(async () => {
      const res = await fetch(`/api/admin/allowed-emails/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setItems(items.filter((i) => i.id !== id));
        router.refresh();
      }
    });
  };

  return (
    <section className="mt-8">
      <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">Emails permitidos</h2>
      <p className="mt-1 text-xs text-zinc-500">
        Si la lista está vacía, cualquiera puede registrarse. Al agregar el primer email, el control empieza a aplicar.
      </p>

      <form onSubmit={add} className="mt-3 flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs text-zinc-500">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="usuario@empresa.com"
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs text-zinc-500">Notas (opcional)</label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Cliente piloto, etc."
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Agregar
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-3 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-900">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Email</th>
              <th className="px-4 py-2 text-left font-medium">Notas</th>
              <th className="px-4 py-2 text-left font-medium">Agregado</th>
              <th className="px-4 py-2 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} className="border-t border-zinc-200 dark:border-zinc-800">
                <td className="px-4 py-2 font-mono text-xs">{i.email}</td>
                <td className="px-4 py-2 text-xs text-zinc-500">{i.notes ?? '—'}</td>
                <td className="px-4 py-2 text-xs text-zinc-500">
                  {formatDate(i.created_at)}
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    onClick={() => remove(i.id)}
                    disabled={pending}
                    className="text-xs text-red-600 hover:underline disabled:opacity-50"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {!items.length && (
              <tr>
                <td className="px-4 py-6 text-center text-sm text-zinc-500" colSpan={4}>
                  Sin emails permitidos. Cualquiera puede registrarse hasta que agregues uno.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
