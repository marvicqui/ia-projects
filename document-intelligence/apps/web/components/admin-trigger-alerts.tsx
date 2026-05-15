'use client';

import { useState } from 'react';

interface RunResult {
  scanned: number;
  emailsSent: number;
  whatsappSent: number;
  skipped: number;
  errors: Array<{ contractorId: string; docType: string; error: string }>;
}

export const AdminTriggerAlerts = () => {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const trigger = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/admin/laboral-alerts/trigger', { method: 'POST' });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? 'Error');
      setResult(j as RunResult);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-8 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            Alertas de cumplimiento laboral
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Job automático corre diario a las 8am CDMX (14:00 UTC). Acá puedes dispararlo manualmente para testear.
          </p>
        </div>
        <button
          onClick={trigger}
          disabled={busy}
          className="shrink-0 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          {busy ? 'Enviando…' : 'Disparar ahora'}
        </button>
      </div>
      {result && (
        <div className="mt-3 grid gap-2 rounded-md bg-zinc-50 p-3 text-xs dark:bg-zinc-900 md:grid-cols-4">
          <div>
            <span className="text-zinc-500">Escaneados:</span> <strong>{result.scanned}</strong>
          </div>
          <div>
            <span className="text-zinc-500">Emails enviados:</span> <strong>{result.emailsSent}</strong>
          </div>
          <div>
            <span className="text-zinc-500">WhatsApp enviados:</span> <strong>{result.whatsappSent}</strong>
          </div>
          <div>
            <span className="text-zinc-500">Saltados (ya alertados 24h):</span>{' '}
            <strong>{result.skipped}</strong>
          </div>
          {result.errors.length > 0 && (
            <div className="md:col-span-4">
              <p className="text-red-600">{result.errors.length} errores:</p>
              <ul className="mt-1 space-y-1">
                {result.errors.map((e, i) => (
                  <li key={i} className="font-mono text-[10px] text-red-600">
                    {e.docType}: {e.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </section>
  );
};
