import { createSupabaseServerClient } from '@jvp/shared-db';
import { buildCookieAdapter } from '@/lib/session';
import { resolveActiveWorkspace } from '@/lib/active-workspace';
import { buildReconciliationWorkbook, type MatchCandidate, type ParsedCfdi, type ParsedBankTransaction } from '@jvp/module-cfdi';
import { NextResponse } from 'next/server';

export const GET = async (
  _request: Request,
  context: { params: Promise<{ id: string }> },
) => {
  const { id } = await context.params;
  const { adapter, getCookie } = await buildCookieAdapter();
  const supabase = createSupabaseServerClient(adapter);

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const workspaceId = await resolveActiveWorkspace(
    supabase,
    userData.user.id,
    getCookie('active_workspace_id'),
  );
  if (!workspaceId) return NextResponse.json({ error: 'Sin workspace' }, { status: 400 });

  const { data: recon } = await supabase
    .from('reconciliations')
    .select('id, name, statement_id, workspaces(name)')
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .single();
  if (!recon) return NextResponse.json({ error: 'Conciliación no encontrada' }, { status: 404 });

  const wsObj = recon.workspaces as { name?: string } | { name?: string }[] | null;
  const wsName = Array.isArray(wsObj) ? wsObj[0]?.name ?? 'Workspace' : wsObj?.name ?? 'Workspace';

  const { data: matchesRaw } = await supabase
    .from('reconciliation_matches')
    .select('id, cfdi_id, transaction_id, match_type, confidence, review_status, rationale')
    .eq('reconciliation_id', id);

  const matches: MatchCandidate[] = (matchesRaw ?? []).map((m) => ({
    cfdiId: m.cfdi_id,
    transactionId: m.transaction_id,
    matchType: m.match_type,
    confidence: Number(m.confidence),
    reviewStatus: m.review_status,
    rationale: m.rationale ?? '',
  }));

  // Load all CFDIs and txs referenced (matched + unmatched).
  const { data: cfdiRows } = await supabase
    .from('cfdi_xmls')
    .select('*')
    .eq('workspace_id', workspaceId);

  const { data: txRows } = await supabase
    .from('bank_transactions')
    .select('*')
    .eq('statement_id', recon.statement_id);

  const cfdisById: Record<string, ParsedCfdi & { id: string }> = {};
  for (const c of cfdiRows ?? []) {
    cfdisById[c.id] = {
      id: c.id,
      uuidSat: c.uuid_sat,
      emisorRfc: c.emisor_rfc,
      emisorNombre: c.emisor_nombre,
      receptorRfc: c.receptor_rfc,
      receptorNombre: c.receptor_nombre,
      total: Number(c.total),
      subtotal: c.subtotal !== null ? Number(c.subtotal) : null,
      fecha: new Date(c.fecha),
      serie: c.serie,
      folio: c.folio,
      comprobanteType: c.comprobante_type,
      formaPago: c.forma_pago,
      metodoPago: c.metodo_pago,
      moneda: c.moneda ?? 'MXN',
    };
  }

  const txsById: Record<string, ParsedBankTransaction & { id: string }> = {};
  for (const t of txRows ?? []) {
    txsById[t.id] = {
      id: t.id,
      fecha: new Date(t.fecha),
      concepto: t.concepto,
      monto: Number(t.monto),
      referencia: t.referencia,
      isCredit: t.is_credit,
    };
  }

  // Unmatched: lo que no está en `matches`.
  const matchedCfdiIds = new Set(matches.map((m) => m.cfdiId).filter(Boolean));
  const matchedTxIds = new Set(matches.map((m) => m.transactionId).filter(Boolean));

  const unmatchedCfdis = Object.values(cfdisById).filter((c) => !matchedCfdiIds.has(c.id));
  const unmatchedTransactions = Object.values(txsById).filter((t) => !matchedTxIds.has(t.id));

  const buffer = await buildReconciliationWorkbook({
    workspaceName: wsName,
    reconciliationName: recon.name,
    cfdisById,
    txsById,
    matches,
    unmatchedCfdis,
    unmatchedTransactions,
  });

  const sanitizedName = recon.name.replace(/[^a-z0-9-]+/gi, '_').slice(0, 60);
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="conciliacion-${sanitizedName}.xlsx"`,
      'Cache-Control': 'no-store',
    },
  });
};
