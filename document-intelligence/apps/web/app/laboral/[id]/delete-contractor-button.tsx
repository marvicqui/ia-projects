'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  contractorId: string;
  contractorName: string;
}

export const DeleteContractorButton = ({ contractorId, contractorName }: Props) => {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async () => {
    const confirmText = prompt(
      `Esta acción borra al contratista "${contractorName}" y TODOS sus documentos (extracciones, PDFs, alertas, historial).\n\nEscribe exactamente "BORRAR" para confirmar:`,
    );
    if (confirmText !== 'BORRAR') {
      if (confirmText !== null) alert('Confirmación incorrecta. Cancelado.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/laboral/contractors/${contractorId}`, { method: 'DELETE' });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error ?? 'Error');
      }
      router.push('/laboral');
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="text-right">
      <button
        onClick={remove}
        disabled={busy}
        className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
      >
        {busy ? 'Borrando…' : '🗑 Borrar contratista'}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
};
