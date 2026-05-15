'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function NewReconciliationPage() {
  const router = useRouter();
  const xmlInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const [xmlFiles, setXmlFiles] = useState<File[]>([]);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [bank, setBank] = useState<'BBVA' | 'SANTANDER' | 'BANAMEX'>('BBVA');
  const [name, setName] = useState('');
  const [ourRfc, setOurRfc] = useState('');
  const [enableLlm, setEnableLlm] = useState(true);
  const [status, setStatus] = useState<string>('');
  const [busy, setBusy] = useState(false);

  const totalXmlSize = xmlFiles.reduce((sum, f) => sum + f.size, 0);
  const fmtBytes = (b: number): string =>
    b < 1024 ? `${b} B` : b < 1024 * 1024 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1024 / 1024).toFixed(2)} MB`;

  const run = async () => {
    if (!xmlFiles.length && !csvFile) {
      setStatus('Sube al menos CFDIs o estado de cuenta.');
      return;
    }
    setBusy(true);

    try {
      if (xmlFiles.length) {
        setStatus(`Cargando ${xmlFiles.length} CFDIs…`);
        const fd = new FormData();
        fd.append('kind', 'cfdi');
        for (const f of xmlFiles) fd.append('files', f);
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

      setStatus('Corriendo matcher en 3 pasadas (puede tardar 10-20s si la pasada IA está activa)…');
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

      setStatus('Listo. Redirigiendo…');
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
        Sube CFDIs (XML) y tu estado de cuenta (CSV). Corremos matching en 3 pasadas: exacto → difuso → IA.
      </p>

      <div className="mt-8 space-y-6">
        <div>
          <label className="block text-sm font-medium">Nombre de la conciliación (opcional)</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Conciliación mayo 2026"
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">RFC de tu empresa (opcional)</label>
          <input
            value={ourRfc}
            onChange={(e) => setOurRfc(e.target.value.toUpperCase())}
            placeholder="ABC123456XYZ"
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm font-mono uppercase dark:border-zinc-700 dark:bg-zinc-900"
          />
          <p className="mt-1 text-xs text-zinc-500">
            Ayuda al matcher a distinguir ingresos (CFDI emitido por ti) de egresos (CFDI recibido).
          </p>
        </div>

        {/* CFDI Dropzone */}
        <div>
          <label className="block text-sm font-medium">CFDIs (XML, varios archivos)</label>
          <button
            type="button"
            onClick={() => xmlInputRef.current?.click()}
            className="mt-1 flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-zinc-300 px-6 py-8 text-center hover:border-zinc-500 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            <svg className="h-8 w-8 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
              />
            </svg>
            <span className="text-sm font-medium">
              {xmlFiles.length
                ? `${xmlFiles.length} CFDIs seleccionados (${fmtBytes(totalXmlSize)})`
                : 'Clic para seleccionar XMLs'}
            </span>
            <span className="text-xs text-zinc-500">
              {xmlFiles.length ? 'Clic para cambiar' : 'Puedes seleccionar varios a la vez'}
            </span>
          </button>
          <input
            ref={xmlInputRef}
            type="file"
            multiple
            accept=".xml,application/xml,text/xml"
            onChange={(e) => setXmlFiles(e.target.files ? Array.from(e.target.files) : [])}
            className="hidden"
          />
        </div>

        {/* Bank statement Dropzone */}
        <div>
          <label className="block text-sm font-medium">Estado de cuenta bancario</label>
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
            <button
              type="button"
              onClick={() => csvInputRef.current?.click()}
              className="flex flex-1 items-center justify-center gap-2 rounded-md border-2 border-dashed border-zinc-300 px-4 py-2 text-sm hover:border-zinc-500 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
            >
              <svg className="h-5 w-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <span>
                {csvFile ? `${csvFile.name} (${fmtBytes(csvFile.size)})` : 'Clic para seleccionar CSV'}
              </span>
            </button>
          </div>
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)}
            className="hidden"
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={enableLlm}
            onChange={(e) => setEnableLlm(e.target.checked)}
            className="h-4 w-4"
          />
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

        {status && (
          <p
            className={
              'rounded-md p-3 text-sm ' +
              (status.startsWith('Error')
                ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
                : status === 'Listo. Redirigiendo…'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-zinc-50 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300')
            }
          >
            {status}
          </p>
        )}
      </div>
    </main>
  );
}
