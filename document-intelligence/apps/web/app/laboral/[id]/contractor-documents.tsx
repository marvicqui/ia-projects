'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { formatDate } from '@/lib/dates';

type Level = 'compliant' | 'expiring' | 'expired' | 'invalid' | 'missing';

const DOC_TYPES: Array<{ key: string; label: string; subtitle: string }> = [
  { key: 'repse', label: 'REPSE', subtitle: 'Registro STPS · vigencia 3 años' },
  { key: 'sat_32d', label: 'SAT 32-D', subtitle: 'Opinión Cumplimiento · 30 días' },
  { key: 'imss_32d', label: 'IMSS 32-D', subtitle: 'Opinión Cumplimiento IMSS · 30 días' },
  { key: 'infonavit', label: 'INFONAVIT', subtitle: 'Constancia INFONAVIT · 30 días' },
  { key: 'csf', label: 'CSF', subtitle: 'Constancia Situación Fiscal · sin vencimiento' },
];

const LEVEL_STYLE: Record<Level, string> = {
  compliant: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  expiring: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  expired: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  invalid: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
  missing: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
};
const LEVEL_LABEL: Record<Level, string> = {
  compliant: 'Vigente',
  expiring: 'Por vencer',
  expired: 'Vencido',
  invalid: 'Inválido',
  missing: 'Faltante',
};

export interface DocStatus {
  level: Level;
  days_until_expiry: number | null;
  updated_at: string;
}

export type DocStatusByType = Record<string, DocStatus>;

export interface ExtractionRow {
  id: string;
  doc_type: string;
  extracted_data: unknown;
  emitted_at: string | null;
  expires_at: string | null;
  valid: boolean;
  confidence: number;
  created_at: string;
}

interface Props {
  contractorId: string;
  statusByType: DocStatusByType;
  extractions: ExtractionRow[];
}

export const ContractorDocuments = ({ contractorId, statusByType, extractions }: Props) => {
  return (
    <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {DOC_TYPES.map((d) => {
        const status = statusByType[d.key];
        const lastExt = extractions.find((e) => e.doc_type === d.key);
        return (
          <DocCard
            key={d.key}
            contractorId={contractorId}
            docType={d.key}
            label={d.label}
            subtitle={d.subtitle}
            status={status}
            lastExtraction={lastExt}
          />
        );
      })}
    </section>
  );
};

interface CardProps {
  contractorId: string;
  docType: string;
  label: string;
  subtitle: string;
  status: DocStatus | undefined;
  lastExtraction: ExtractionRow | undefined;
}

const DocCard = ({ contractorId, docType, label, subtitle, status, lastExtraction }: CardProps) => {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('');

  const level: Level = status?.level ?? 'missing';

  const onPick = () => inputRef.current?.click();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    setProgress('Subiendo archivo…');
    try {
      const fd = new FormData();
      fd.append('doc_type', docType);
      fd.append('file', file);
      setProgress('Extrayendo con Claude (15-25s)…');
      const res = await fetch(`/api/laboral/contractors/${contractorId}/upload`, {
        method: 'POST',
        body: fd,
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error ?? 'Error');
      }
      setProgress('Listo.');
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const extData = lastExtraction?.extracted_data as Record<string, unknown> | null;

  return (
    <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h3 className="font-semibold">{label}</h3>
          <p className="text-xs text-zinc-500">{subtitle}</p>
        </div>
        <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${LEVEL_STYLE[level]}`}>
          {LEVEL_LABEL[level]}
        </span>
      </div>

      {status?.days_until_expiry !== null && status?.days_until_expiry !== undefined && (
        <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
          {status.days_until_expiry >= 0
            ? `Vence en ${status.days_until_expiry} día${status.days_until_expiry === 1 ? '' : 's'}`
            : `Vencido hace ${Math.abs(status.days_until_expiry)} día${Math.abs(status.days_until_expiry) === 1 ? '' : 's'}`}
        </p>
      )}

      {lastExtraction && (
        <div className="mt-3 rounded bg-zinc-50 p-2 text-xs dark:bg-zinc-900">
          {lastExtraction.emitted_at && <div>Emitido: {formatDate(lastExtraction.emitted_at)}</div>}
          {lastExtraction.expires_at && <div>Vence: {formatDate(lastExtraction.expires_at)}</div>}
          {typeof extData?.rationale === 'string' && extData.rationale && (
            <div className="mt-1 text-zinc-600 dark:text-zinc-400">{extData.rationale}</div>
          )}
        </div>
      )}

      <div className="mt-3">
        <button
          onClick={onPick}
          disabled={busy}
          className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          {busy ? progress : lastExtraction ? 'Subir nuevo PDF' : 'Subir PDF'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          onChange={onFile}
          className="hidden"
        />
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>
    </div>
  );
};
