'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDate, formatDateTime } from '@/lib/dates';
import type { ExtractionRow } from './contractor-documents';

interface Props {
  extractions: ExtractionRow[];
}

export const ExtractionsHistory = ({ extractions }: Props) => {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const remove = async (id: string, label: string) => {
    if (!confirm(`¿Borrar esta extracción de ${label}? Se elimina también el PDF del storage.`)) return;
    setBusy(id);
    setError(null);
    try {
      const res = await fetch(`/api/laboral/extractions/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error ?? 'Error');
      }
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="mt-3 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-900">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Fecha subida</th>
              <th className="px-3 py-2 text-left font-medium">Tipo</th>
              <th className="px-3 py-2 text-center font-medium">Válido</th>
              <th className="px-3 py-2 text-center font-medium">Vence</th>
              <th className="px-3 py-2 text-right font-medium">Conf.</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {extractions.map((e) => (
              <tr key={e.id} className="border-t border-zinc-200 dark:border-zinc-800">
                <td className="px-3 py-2 text-xs">{formatDateTime(e.created_at)}</td>
                <td className="px-3 py-2 font-mono text-xs uppercase">{e.doc_type}</td>
                <td className="px-3 py-2 text-center">
                  {e.valid ? '✓' : <span className="text-red-600">✗</span>}
                </td>
                <td className="px-3 py-2 text-center text-xs text-zinc-500">
                  {e.expires_at ? formatDate(e.expires_at) : '—'}
                </td>
                <td className="px-3 py-2 text-right text-xs tabular-nums">
                  {(e.confidence * 100).toFixed(0)}%
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={() => remove(e.id, e.doc_type)}
                    disabled={busy === e.id}
                    className="text-xs text-red-600 hover:underline disabled:opacity-50"
                  >
                    {busy === e.id ? 'Borrando…' : 'Borrar'}
                  </button>
                </td>
              </tr>
            ))}
            {!extractions.length && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-sm text-zinc-500">
                  Aún no hay documentos subidos para este contratista.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
};
