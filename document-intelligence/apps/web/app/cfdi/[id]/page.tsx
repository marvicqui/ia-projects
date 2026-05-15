import { requireAppSession, buildCookieAdapter } from '@/lib/session';
import { Shell } from '@/components/shell';
import { createSupabaseServerClient } from '@jvp/shared-db';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { MatchesTable, type MatchRow, type UnmatchedCfdi, type UnmatchedTx } from './matches-table';

interface ReconciliationPageProps {
  params: Promise<{ id: string }>;
}

export default async function ReconciliationDetailPage({ params }: ReconciliationPageProps) {
  const { id } = await params;
  const session = await requireAppSession();
  const { adapter } = await buildCookieAdapter();
  const supabase = createSupabaseServerClient(adapter);

  const { data: recon } = await supabase
    .from('reconciliations')
    .select('id, name, status, stats, started_at, completed_at, statement_id')
    .eq('id', id)
    .eq('workspace_id', session.workspaceId)
    .single();

  if (!recon) notFound();

  // Fetch all matches with joined CFDI + tx data
  const { data: matchesRaw } = await supabase
    .from('reconciliation_matches')
    .select(`
      id, match_type, confidence, review_status, rationale, created_at,
      cfdi:cfdi_xmls(id, uuid_sat, emisor_rfc, emisor_nombre, receptor_rfc, receptor_nombre, total, fecha, comprobante_type, folio, serie),
      tx:bank_transactions(id, fecha, concepto, monto, referencia, is_credit)
    `)
    .eq('reconciliation_id', id)
    .order('match_type', { ascending: true })
    .order('confidence', { ascending: false });

  type CfdiInfo = {
    id: string;
    uuid_sat: string;
    emisor_rfc: string;
    emisor_nombre: string | null;
    receptor_rfc: string;
    receptor_nombre: string | null;
    total: number | string;
    fecha: string;
    comprobante_type: string;
    folio: string | null;
    serie: string | null;
  };
  type TxInfo = {
    id: string;
    fecha: string;
    concepto: string;
    monto: number | string;
    referencia: string | null;
    is_credit: boolean;
  };

  const matches: MatchRow[] = (matchesRaw ?? []).map((r) => {
    const cfdiRaw = r.cfdi as CfdiInfo | CfdiInfo[] | null;
    const txRaw = r.tx as TxInfo | TxInfo[] | null;
    const cfdi = Array.isArray(cfdiRaw) ? cfdiRaw[0] : cfdiRaw;
    const tx = Array.isArray(txRaw) ? txRaw[0] : txRaw;
    return {
      id: r.id,
      match_type: r.match_type,
      confidence: Number(r.confidence),
      review_status: r.review_status,
      rationale: r.rationale,
      cfdi: cfdi
        ? {
            id: cfdi.id,
            uuid_sat: cfdi.uuid_sat,
            emisor_rfc: cfdi.emisor_rfc,
            emisor_nombre: cfdi.emisor_nombre,
            receptor_rfc: cfdi.receptor_rfc,
            receptor_nombre: cfdi.receptor_nombre,
            total: Number(cfdi.total),
            fecha: cfdi.fecha,
            comprobante_type: cfdi.comprobante_type,
            folio: cfdi.folio,
            serie: cfdi.serie,
          }
        : null,
      tx: tx
        ? {
            id: tx.id,
            fecha: tx.fecha,
            concepto: tx.concepto,
            monto: Number(tx.monto),
            referencia: tx.referencia,
            is_credit: tx.is_credit,
          }
        : null,
    };
  });

  // Unmatched CFDIs: CFDIs en workspace que NO están en los matches de esta reconciliación.
  const matchedCfdiIds = matches.map((m) => m.cfdi?.id).filter((x): x is string => !!x);
  const { data: unmatchedCfdiRaw } = await supabase
    .from('cfdi_xmls')
    .select('id, uuid_sat, emisor_rfc, emisor_nombre, receptor_rfc, receptor_nombre, total, fecha, comprobante_type')
    .eq('workspace_id', session.workspaceId)
    .not('id', 'in', matchedCfdiIds.length ? `(${matchedCfdiIds.join(',')})` : '(00000000-0000-0000-0000-000000000000)')
    .order('fecha', { ascending: false })
    .limit(100);

  const unmatchedCfdis: UnmatchedCfdi[] = (unmatchedCfdiRaw ?? []).map((c) => ({
    id: c.id,
    uuid_sat: c.uuid_sat,
    emisor: c.emisor_nombre ?? c.emisor_rfc,
    receptor: c.receptor_nombre ?? c.receptor_rfc,
    total: Number(c.total),
    fecha: c.fecha,
    tipo: c.comprobante_type,
  }));

  // Unmatched transactions: tx del statement no incluidas en los matches.
  const matchedTxIds = matches.map((m) => m.tx?.id).filter((x): x is string => !!x);
  const { data: unmatchedTxRaw } = await supabase
    .from('bank_transactions')
    .select('id, fecha, concepto, monto, referencia, is_credit')
    .eq('statement_id', recon.statement_id)
    .not('id', 'in', matchedTxIds.length ? `(${matchedTxIds.join(',')})` : '(00000000-0000-0000-0000-000000000000)')
    .order('fecha', { ascending: true });

  const unmatchedTxs: UnmatchedTx[] = (unmatchedTxRaw ?? []).map((t) => ({
    id: t.id,
    fecha: t.fecha,
    concepto: t.concepto,
    monto: Number(t.monto),
    referencia: t.referencia,
    is_credit: t.is_credit,
  }));

  const stats = (recon.stats ?? {}) as Record<string, number>;

  return (
    <Shell active="/cfdi" email={session.email} isPlatformAdmin={session.isPlatformAdmin} workspaceName={session.workspaceName}>
      <header className="flex items-start justify-between gap-4">
        <div>
          <Link href="/cfdi" className="text-xs text-zinc-500 hover:underline">
            ← Volver a conciliaciones
          </Link>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{recon.name}</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {new Date(recon.started_at).toLocaleString('es-MX')}
            {recon.completed_at && ` · completada ${new Date(recon.completed_at).toLocaleString('es-MX')}`}
          </p>
        </div>
        <a
          href={`/api/cfdi/${id}/export`}
          className="shrink-0 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Exportar Excel
        </a>
      </header>

      <section className="mt-6 grid gap-3 md:grid-cols-5">
        <StatCard label="Exact" value={stats.matchedExact ?? 0} tone="emerald" />
        <StatCard label="Fuzzy" value={stats.matchedFuzzy ?? 0} tone="amber" />
        <StatCard label="LLM" value={stats.matchedLlm ?? 0} tone="indigo" />
        <StatCard label="CFDIs sin match" value={unmatchedCfdis.length} tone="zinc" />
        <StatCard label="Tx sin CFDI" value={unmatchedTxs.length} tone="rose" />
      </section>

      <MatchesTable
        matches={matches}
        unmatchedCfdis={unmatchedCfdis}
        unmatchedTxs={unmatchedTxs}
        reconciliationId={id}
      />
    </Shell>
  );
}

const TONE_CLASS: Record<string, string> = {
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200',
  amber: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200',
  indigo: 'border-indigo-200 bg-indigo-50 text-indigo-900 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-200',
  zinc: 'border-zinc-200 bg-zinc-50 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200',
  rose: 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200',
};

const StatCard = ({ label, value, tone }: { label: string; value: number; tone: keyof typeof TONE_CLASS }) => (
  <div className={`rounded-lg border p-4 ${TONE_CLASS[tone]}`}>
    <p className="text-xs uppercase tracking-wide opacity-70">{label}</p>
    <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
  </div>
);
