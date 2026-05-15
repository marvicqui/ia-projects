'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewReconciliationPage() {
  const router = useRouter();
  const [xmlFiles, setXmlFiles] = useState<FileList | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [bank, setBank] = useState<'BBVA' | 'SANTANDER' | 'BANAMEX'>('BBVA');
  const [name, setName] = useState('');
  const [ourRfc, setOurRfc] = useState('');
  const [enableLlm, setEnableLlm] = useState(true);
  const [status, setStatus] = useState<string>('');
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!xmlFiles?.length && !csvFile) {
      setStatus('Sube al menos CFDIs o estado de cuenta.');
      return;
    }
    setBusy(true);

    try {
      if (xmlFiles?.length) {
        setStatus(`Cargando ${xmlFiles.length} CFDIs…`);
        const fd = new FormData();
        fd.append('kind', 'cfdi');
        for (const f of Array.from(xmlFiles)) fd.append('files', f);
        const res = await fetch('/api/cfdi/upload', { method: 'POST', body: fd });
        if (!res.ok) throw new Error((await res.json()).error ?? 'Error subiendo CFDIs');
      }

      let statementId: string | null = null;
      if (csvFile) {
        setStatus('Cargando estado de cuenta…');
        const fd = new FormData();
        fd.append('kind', 'bank');
        fd.append('bank', bank);
        fd.append('files', csvFile);
        const res = await fetch('/api/cfdi/upload', { method: 'POST', body: fd });
        if (!res.ok) throw new Error((await res.json()).error ?? 'Error subiendo estado de cuenta');
        const data = (await res.json()) as { statementId: string };
        statementId = data.statementId;
      }

      if (!statementId) {
        setStatus('CFDIs cargados. Para correr conciliación necesitas un estado de cuenta.');
        setBusy(false);
        return;
      }

      setStatus('Corriendo matcher en 3 pasadas…');
      const reconRes = await fetch('/api/cfdi/reconcile', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          statementId,
          name: name || undefined,
          ourRfc: ourRfc || undefined,
          enableLlm,
        }),
      });

      if (!reconRes.ok) throw new Error((await reconRes.json()).error ?? 'Error conciliando');

      setStatus('Listo.');
      router.push('/cfdi');
    } catch (err) {
      setStatus(`Error: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Nueva conciliación</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Sube CFDIs (XML) y tu estado de cuenta (CSV). Corremos exacto → difuso → IA.
      </p>

      <div className="mt-8 space-y-6">
        <div>
          <label className="block text-sm font-medium">Nombre (opcional)</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Conciliación Mayo 2026"
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">RFC de tu empresa (opcional)</label>
          <input
            value={ourRfc}
            onChange={(e) => setOurRfc(e.target.value.toUpperCase())}
            placeholder="ABC123456XYZ"
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <p className="mt-1 text-xs text-zinc-500">
            Ayuda al matcher a distinguir ingresos (CFDI emitido por ti) de egresos (CFDI recibido).
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium">CFDIs (XML, varios)</label>
          <input
            type="file"
            multiple
            accept=".xml,application/xml"
            onChange={(e) => setXmlFiles(e.target.files)}
            className="mt-1 w-full text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Estado de cuenta (CSV)</label>
          <div className="mt-1 flex gap-2">
            <select
              value={bank}
              onChange={(e) => setBank(e.target.value as typeof bank)}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="BBVA">BBVA</option>
              <option value="SANTANDER">Santander</option>
              <option value="BANAMEX">Banamex</option>
            </select>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)}
              className="flex-1 text-sm"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={enableLlm} onChange={(e) => setEnableLlm(e.target.checked)} />
          Activar pasada 3 (IA Claude) para casos no resueltos por reglas
        </label>

        <button
          type="button"
          onClick={run}
          disabled={busy}
          className="w-full rounded-md bg-zinc-900 py-3 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          {busy ? 'Procesando…' : 'Conciliar'}
        </button>

        {status && <p className="text-sm text-zinc-600 dark:text-zinc-400">{status}</p>}
      </div>
    </main>
  );
}
