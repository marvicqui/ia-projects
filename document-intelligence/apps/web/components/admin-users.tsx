'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export interface AdminUser {
  id: string;
  email: string;
  display_name: string | null;
  is_platform_admin: boolean;
  created_at: string;
  workspace_count: number;
  is_self: boolean;
}

interface Props {
  initial: AdminUser[];
}

export const AdminUsers = ({ initial }: Props) => {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const toggleAdmin = (id: string, current: boolean) => {
    setError(null);
    setBusy(id);
    startTransition(async () => {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ is_platform_admin: !current }),
      });
      setBusy(null);
      if (!res.ok) {
        const j = await res.json();
        setError(j.error ?? 'Error');
        return;
      }
      setUsers(users.map((u) => (u.id === id ? { ...u, is_platform_admin: !current } : u)));
      router.refresh();
    });
  };

  const remove = (id: string, email: string) => {
    if (!confirm(`Eliminar al usuario ${email}? Esta accion borra TODOS sus datos (workspaces, docs).`)) {
      return;
    }
    setError(null);
    setBusy(id);
    startTransition(async () => {
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      setBusy(null);
      if (!res.ok) {
        const j = await res.json();
        setError(j.error ?? 'Error');
        return;
      }
      setUsers(users.filter((u) => u.id !== id));
      router.refresh();
    });
  };

  return (
    <section className="mt-8">
      <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">Usuarios registrados</h2>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-3 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-900">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Email</th>
              <th className="px-4 py-2 text-left font-medium">Nombre</th>
              <th className="px-4 py-2 text-center font-medium">Workspaces</th>
              <th className="px-4 py-2 text-center font-medium">Platform Admin</th>
              <th className="px-4 py-2 text-left font-medium">Registrado</th>
              <th className="px-4 py-2 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-zinc-200 dark:border-zinc-800">
                <td className="px-4 py-2 font-mono text-xs">
                  {u.email}
                  {u.is_self && <span className="ml-2 text-[10px] text-zinc-500">(tu)</span>}
                </td>
                <td className="px-4 py-2 text-xs">{u.display_name ?? '—'}</td>
                <td className="px-4 py-2 text-center text-xs tabular-nums">{u.workspace_count}</td>
                <td className="px-4 py-2 text-center">
                  <button
                    onClick={() => toggleAdmin(u.id, u.is_platform_admin)}
                    disabled={busy === u.id || u.is_self}
                    title={u.is_self ? 'No puedes modificar tu propio rol' : ''}
                    className={
                      'rounded px-2 py-1 text-xs ' +
                      (u.is_platform_admin
                        ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-950 dark:text-red-300'
                        : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300') +
                      (u.is_self ? ' cursor-not-allowed opacity-50' : '')
                    }
                  >
                    {u.is_platform_admin ? '✓ Sí' : '— No'}
                  </button>
                </td>
                <td className="px-4 py-2 text-xs text-zinc-500">
                  {new Date(u.created_at).toLocaleDateString('es-MX')}
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    onClick={() => remove(u.id, u.email)}
                    disabled={busy === u.id || u.is_self}
                    title={u.is_self ? 'No puedes eliminarte' : ''}
                    className="text-xs text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {!users.length && (
              <tr>
                <td className="px-4 py-6 text-center text-sm text-zinc-500" colSpan={6}>
                  Sin usuarios registrados aún.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
