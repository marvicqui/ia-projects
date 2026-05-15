import { createSupabaseServerClient } from '@jvp/shared-db';
import {
  runDeterministicMatcher,
  inferMatchesWithLlm,
  type CfdiRecord,
  type TransactionRecord,
} from '@jvp/module-cfdi';
import { complete } from '@jvp/shared-agents';
import { buildCookieAdapter } from '@/lib/session';
import { NextResponse } from 'next/server';

interface ReconcileBody {
  statementId: string;
  name?: string;
  ourRfc?: string;
  enableLlm?: boolean;
}

export const POST = async (request: Request) => {
  const { adapter, getCookie } = await buildCookieAdapter();
  const supabase = createSupabaseServerClient(adapter);

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }
  const workspaceId = getCookie('active_workspace_id');
  if (!workspaceId) {
    return NextResponse.json({ error: 'Sin workspace activo' }, { status: 400 });
  }

  const body = (await request.json()) as ReconcileBody;
  if (!body.statementId) {
    return NextResponse.json({ error: 'statementId requerido' }, { status: 400 });
  }

  const { data: cfdiRows } = await supabase
    .from('cfdi_xmls')
    .select('*')
    .eq('workspace_id', workspaceId);

  const { data: txRows } = await supabase
    .from('bank_transactions')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('statement_id', body.statementId);

  if (!cfdiRows || !txRows) {
    return NextResponse.json({ error: 'No se pudieron cargar datos' }, { status: 500 });
  }

  const cfdis: CfdiRecord[] = cfdiRows.map((r) => ({
    id: r.id,
    uuidSat: r.uuid_sat,
    emisorRfc: r.emisor_rfc,
    emisorNombre: r.emisor_nombre,
    receptorRfc: r.receptor_rfc,
    receptorNombre: r.receptor_nombre,
    total: Number(r.total),
    subtotal: r.subtotal !== null ? Number(r.subtotal) : null,
    fecha: new Date(r.fecha),
    serie: r.serie,
    folio: r.folio,
    comprobanteType: r.comprobante_type,
    formaPago: r.forma_pago,
    metodoPago: r.metodo_pago,
    moneda: r.moneda ?? 'MXN',
  }));

  const txs: TransactionRecord[] = txRows.map((r) => ({
    id: r.id,
    fecha: new Date(r.fecha),
    concepto: r.concepto,
    monto: Number(r.monto),
    referencia: r.referencia,
    isCredit: r.is_credit,
  }));

  const deterministic = runDeterministicMatcher({
    cfdis,
    transactions: txs,
    ourRfc: body.ourRfc ?? null,
  });

  let llmMatches: typeof deterministic.matches = [];
  if (
    body.enableLlm !== false &&
    deterministic.unmatchedTransactions.length &&
    deterministic.unmatchedCfdis.length
  ) {
    try {
      llmMatches = await inferMatchesWithLlm(
        deterministic.unmatchedTransactions,
        deterministic.unmatchedCfdis,
        (system, prompt) => complete([{ role: 'user', content: prompt }], { system }),
      );
    } catch (err) {
      console.error('LLM pass failed:', err);
    }
  }

  const allMatches = [...deterministic.matches, ...llmMatches];

  const { data: reconRow, error: reconErr } = await supabase
    .from('reconciliations')
    .insert({
      workspace_id: workspaceId,
      name: body.name ?? `Conciliación ${new Date().toISOString().slice(0, 10)}`,
      statement_id: body.statementId,
      status: 'completed',
      stats: { ...deterministic.stats, matchedLlm: llmMatches.length },
      completed_at: new Date().toISOString(),
      created_by: userData.user.id,
    })
    .select('id')
    .single();

  if (reconErr || !reconRow) {
    return NextResponse.json(
      { error: reconErr?.message ?? 'reconciliation insert failed' },
      { status: 500 },
    );
  }

  if (allMatches.length) {
    const matchRows = allMatches.map((m) => ({
      workspace_id: workspaceId,
      reconciliation_id: reconRow.id,
      cfdi_id: m.cfdiId,
      transaction_id: m.transactionId,
      match_type: m.matchType,
      confidence: m.confidence,
      review_status: m.reviewStatus,
      rationale: m.rationale,
    }));
    await supabase.from('reconciliation_matches').insert(matchRows);
  }

  return NextResponse.json({
    reconciliationId: reconRow.id,
    stats: { ...deterministic.stats, matchedLlm: llmMatches.length },
    matches: allMatches.length,
  });
};
