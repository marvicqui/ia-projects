'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';

type MatchType = 'exact' | 'fuzzy' | 'llm_inferred' | 'manual';
type ReviewStatus = 'auto' | 'pending' | 'confirmed' | 'rejected';

export interface MatchRow {
  id: string;
  match_type: MatchType;
  confidence: number;
  review_status: ReviewStatus;
  rationale: string | null;
  cfdi: {
    id: string;
    uuid_sat: string;
    emisor_rfc: string;
    emisor_nombre: string | null;
    receptor_rfc: string;
    receptor_nombre: string | null;
    total: number;
    fecha: string;
    comprobante_type: string;
    folio: string | null;
    serie: string | null;
  } | null;
  tx: {
    id: string;
    fecha: string;
    concepto: string;
    monto: number;
    referencia: string | null;
    is_credit: boolean;
  } | null;
}

export interface UnmatchedCfdi {
  id: string;
  uuid_sat: string;
  emisor: string;
  receptor: string;
  total: number;
  fecha: string;
  tipo: string;
}

export interface UnmatchedTx {
  id: string;
  fecha: string;
  concepto: string;
  monto: number;
  referencia: string | null;
  is_credit: boolean;
}

interface Props {
  matches: MatchRow[];
  unmatchedCfdis: UnmatchedCfdi[];
  unmatchedTxs: UnmatchedTx[];
  reconciliationId: string;
}

const MATCH_LABELS: Record<MatchType, string> = {
  exact: 'Exact',
  fuzzy: 'Fuzzy',
  llm_inferred: 'LLM',
  manual: 'Manual',
};

const MATCH_COLORS: Record<MatchType, string> = {
  exact: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  fuzzy: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  llm_inferred: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300',
  manual: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300',
};

const STATUS_LABELS: Record<ReviewStatus, string> = {
  auto: 'Automático',
  pending: 'Pendiente revisión',
  confirmed: 'Confirmado',
  rejected: 'Rechazado',
};

const STATUS_COLORS: Record<ReviewStatus, string> = {
  auto: 'text-zinc-500',
  pending: 'text-amber-700 dark:text-amber-400',
  confirmed: 'text-emerald-700 dark:text-emerald-400',
  rejected: 'text-rose-700 dark:text-rose-400',
};

const fmtMoney = (n: number): string =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

const fmtDate = (s: string): string => new Date(s).toLocaleDateString('es-MX');

export const MatchesTable = ({ matches, unmatchedCfdis, unmatchedTxs, reconciliationId }: Props) => {
  const router = useRouter();
  const [filterType, setFilterType] = useState<'all' | MatchType>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | ReviewStatus>('all');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [tab, setTab] = useState<'matches' | 'unmatched-cfdi' | 'unmatched-tx'>('matches');

  const filtered = useMemo(() => {
    return matches.filter((m) => {
      if (filterType !== 'all' && m.match_type !== filterType) return false;
      if (filterStatus !== 'all' && m.review_status !== filterStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        const haystack = [
          m.cfdi?.emisor_nombre,
          m.cfdi?.receptor_nombre,
          m.cfdi?.emisor_rfc,
          m.cfdi?.receptor_rfc,
          m.cfdi?.uuid_sat,
          m.tx?.concepto,
          m.tx?.referencia,
          m.rationale,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [matches, filterType, filterStatus, search]);

  const updateStatus = async (id: string, status: 'confirmed' | 'rejected') => {
    setBusy(id);
    const res = await fetch(`/api/cfdi/matches/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ review_status: status }),
    });
    setBusy(null);
    if (res.ok) {
      router.refresh();
    } else {
      alert((await res.json()).error ?? 'Error');
    }
  };

  return (
    <>
      <div className="mt-8 flex flex-wrap gap-3 border-b border-zinc-200 dark:border-zinc-800">
        <TabButton active={tab === 'matches'} onClick={() => setTab('matches')}>
          Matches ({matches.length})
        </TabButton>
        <TabButton active={tab === 'unmatched-cfdi'} onClick={() => setTab('unmatched-cfdi')}>
          CFDIs sin match ({unmatchedCfdis.length})
        </TabButton>
        <TabButton active={tab === 'unmatched-tx'} onClick={() => setTab('unmatched-tx')}>
          Transacciones sin CFDI ({unmatchedTxs.length})
        </TabButton>
      </div>

      {tab === 'matches' && (
        <>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs text-zinc-500">Tipo de match</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as 'all' | MatchType)}
                className="mt-1 rounded-md border border-zinc-300 px-3 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              >
                <option value="all">Todos</option>
                <option value="exact">Exact</option>
                <option value="fuzzy">Fuzzy</option>
                <option value="llm_inferred">LLM</option>
                <option value="manual">Manual</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-500">Estado de revisión</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as 'all' | ReviewStatus)}
                className="mt-1 rounded-md border border-zinc-300 px-3 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              >
                <option value="all">Todos</option>
                <option value="auto">Automático</option>
                <option value="pending">Pendiente revisión</option>
                <option value="confirmed">Confirmado</option>
                <option value="rejected">Rechazado</option>
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs text-zinc-500">Buscar</label>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="RFC, UUID, concepto, rationale…"
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>
            <span className="ml-auto text-xs text-zinc-500">
              {filtered.length} de {matches.length}
            </span>
          </div>

          <div className="mt-3 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-900">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Tipo</th>
                  <th className="px-3 py-2 text-left font-medium">CFDI</th>
                  <th className="px-3 py-2 text-right font-medium">Monto CFDI</th>
                  <th className="px-3 py-2 text-left font-medium">Transacción</th>
                  <th className="px-3 py-2 text-right font-medium">Monto Tx</th>
                  <th className="px-3 py-2 text-center font-medium">Conf.</th>
                  <th className="px-3 py-2 text-left font-medium">Estado</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <Row
                    key={m.id}
                    match={m}
                    expanded={expanded === m.id}
                    onExpand={() => setExpanded(expanded === m.id ? null : m.id)}
                    onConfirm={() => updateStatus(m.id, 'confirmed')}
                    onReject={() => updateStatus(m.id, 'rejected')}
                    busy={busy === m.id}
                  />
                ))}
                {!filtered.length && (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-center text-sm text-zinc-500">
                      Sin matches que coincidan con los filtros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'unmatched-cfdi' && (
        <div className="mt-4 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-900">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Fecha</th>
                <th className="px-3 py-2 text-left font-medium">Tipo</th>
                <th className="px-3 py-2 text-left font-medium">Emisor</th>
                <th className="px-3 py-2 text-left font-medium">Receptor</th>
                <th className="px-3 py-2 text-right font-medium">Total</th>
                <th className="px-3 py-2 text-left font-medium">UUID</th>
              </tr>
            </thead>
            <tbody>
              {unmatchedCfdis.map((c) => (
                <tr key={c.id} className="border-t border-zinc-200 dark:border-zinc-800">
                  <td className="px-3 py-2 whitespace-nowrap">{fmtDate(c.fecha)}</td>
                  <td className="px-3 py-2"><Badge>{c.tipo}</Badge></td>
                  <td className="px-3 py-2 max-w-[220px] truncate">{c.emisor}</td>
                  <td className="px-3 py-2 max-w-[220px] truncate">{c.receptor}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmtMoney(c.total)}</td>
                  <td className="px-3 py-2 font-mono text-[10px] text-zinc-500">{c.uuid_sat.slice(0, 13)}…</td>
                </tr>
              ))}
              {!unmatchedCfdis.length && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-sm text-zinc-500">
                    Todos los CFDIs del workspace fueron matcheados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'unmatched-tx' && (
        <div className="mt-4 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-900">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Fecha</th>
                <th className="px-3 py-2 text-left font-medium">Dirección</th>
                <th className="px-3 py-2 text-left font-medium">Concepto</th>
                <th className="px-3 py-2 text-right font-medium">Monto</th>
                <th className="px-3 py-2 text-left font-medium">Referencia</th>
              </tr>
            </thead>
            <tbody>
              {unmatchedTxs.map((t) => (
                <tr key={t.id} className="border-t border-zinc-200 dark:border-zinc-800">
                  <td className="px-3 py-2 whitespace-nowrap">{fmtDate(t.fecha)}</td>
                  <td className="px-3 py-2">
                    <Badge>{t.is_credit ? 'Ingreso' : 'Egreso'}</Badge>
                  </td>
                  <td className="px-3 py-2">{t.concepto}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmtMoney(t.monto)}</td>
                  <td className="px-3 py-2 text-xs text-zinc-500">{t.referencia ?? '—'}</td>
                </tr>
              ))}
              {!unmatchedTxs.length && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-sm text-zinc-500">
                    Toda transacción del estado de cuenta tiene CFDI emparejado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-zinc-500">
        Reconciliación ID: <code className="font-mono">{reconciliationId}</code>
      </p>
    </>
  );
};

interface RowProps {
  match: MatchRow;
  expanded: boolean;
  onExpand: () => void;
  onConfirm: () => void;
  onReject: () => void;
  busy: boolean;
}

const Row = ({ match, expanded, onExpand, onConfirm, onReject, busy }: RowProps) => {
  const { cfdi, tx, match_type, confidence, review_status, rationale } = match;
  return (
    <>
      <tr className="border-t border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900">
        <td className="px-3 py-2">
          <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${MATCH_COLORS[match_type]}`}>
            {MATCH_LABELS[match_type]}
          </span>
        </td>
        <td className="px-3 py-2">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-zinc-500">{cfdi ? fmtDate(cfdi.fecha) : '—'}</span>
            <span className="text-sm truncate max-w-[180px]">
              {cfdi ? cfdi.emisor_nombre ?? cfdi.emisor_rfc : '—'}
            </span>
            <span className="text-[10px] text-zinc-400 font-mono">{cfdi?.comprobante_type}</span>
          </div>
        </td>
        <td className="px-3 py-2 text-right tabular-nums">{cfdi ? fmtMoney(cfdi.total) : '—'}</td>
        <td className="px-3 py-2">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-zinc-500">{tx ? fmtDate(tx.fecha) : '—'}</span>
            <span className="text-sm truncate max-w-[220px]">{tx?.concepto ?? '—'}</span>
            <span className="text-[10px] text-zinc-400">{tx?.is_credit ? 'Ingreso' : 'Egreso'}</span>
          </div>
        </td>
        <td className="px-3 py-2 text-right tabular-nums">{tx ? fmtMoney(tx.monto) : '—'}</td>
        <td className="px-3 py-2 text-center text-xs tabular-nums">
          {(confidence * 100).toFixed(0)}%
        </td>
        <td className={`px-3 py-2 text-xs ${STATUS_COLORS[review_status]}`}>
          {STATUS_LABELS[review_status]}
        </td>
        <td className="px-3 py-2 text-right">
          <button onClick={onExpand} className="text-xs text-zinc-500 hover:underline">
            {expanded ? '▲ Cerrar' : '▼ Ver'}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-zinc-50 dark:bg-zinc-900/50">
          <td colSpan={8} className="px-6 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="text-xs uppercase tracking-wide text-zinc-500">CFDI completo</h4>
                {cfdi && (
                  <dl className="mt-2 grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-xs">
                    <dt className="text-zinc-500">UUID:</dt>
                    <dd className="font-mono">{cfdi.uuid_sat}</dd>
                    <dt className="text-zinc-500">Tipo:</dt>
                    <dd>{cfdi.comprobante_type}</dd>
                    <dt className="text-zinc-500">Folio/Serie:</dt>
                    <dd>{cfdi.serie ?? ''} {cfdi.folio ?? '—'}</dd>
                    <dt className="text-zinc-500">Emisor:</dt>
                    <dd>{cfdi.emisor_rfc} · {cfdi.emisor_nombre ?? '—'}</dd>
                    <dt className="text-zinc-500">Receptor:</dt>
                    <dd>{cfdi.receptor_rfc} · {cfdi.receptor_nombre ?? '—'}</dd>
                  </dl>
                )}
              </div>
              <div>
                <h4 className="text-xs uppercase tracking-wide text-zinc-500">Transacción completa</h4>
                {tx && (
                  <dl className="mt-2 grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-xs">
                    <dt className="text-zinc-500">Fecha:</dt>
                    <dd>{fmtDate(tx.fecha)}</dd>
                    <dt className="text-zinc-500">Dirección:</dt>
                    <dd>{tx.is_credit ? 'Ingreso' : 'Egreso'}</dd>
                    <dt className="text-zinc-500">Concepto:</dt>
                    <dd>{tx.concepto}</dd>
                    <dt className="text-zinc-500">Monto:</dt>
                    <dd className="tabular-nums">{fmtMoney(tx.monto)}</dd>
                    <dt className="text-zinc-500">Referencia:</dt>
                    <dd>{tx.referencia ?? '—'}</dd>
                  </dl>
                )}
              </div>
            </div>
            <div className="mt-3">
              <h4 className="text-xs uppercase tracking-wide text-zinc-500">Por qué este match (rationale)</h4>
              <p className="mt-1 text-xs">{rationale ?? '(sin rationale)'}</p>
            </div>
            {review_status === 'pending' && (
              <div className="mt-3 flex gap-2">
                <button
                  onClick={onConfirm}
                  disabled={busy}
                  className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  Confirmar match
                </button>
                <button
                  onClick={onReject}
                  disabled={busy}
                  className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  Rechazar
                </button>
              </div>
            )}
            {(review_status === 'confirmed' || review_status === 'rejected') && (
              <div className="mt-3 flex gap-2">
                <button
                  onClick={onReject}
                  disabled={busy}
                  className="text-xs text-zinc-500 underline hover:text-zinc-700"
                >
                  Cambiar a {review_status === 'confirmed' ? 'rechazado' : 'confirmado'}
                </button>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
};

const TabButton = ({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    className={
      'border-b-2 px-3 py-2 text-sm font-medium transition ' +
      (active
        ? 'border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100'
        : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300')
    }
  >
    {children}
  </button>
);

const Badge = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-block rounded bg-zinc-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
    {children}
  </span>
);
