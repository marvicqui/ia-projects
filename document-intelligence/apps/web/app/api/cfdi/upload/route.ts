import { createSupabaseServerClient } from '@jvp/shared-db';
import { parseCfdiXml, parseBankCsv, type BankCode } from '@jvp/module-cfdi';
import { buildCookieAdapter } from '@/lib/session';
import { resolveActiveWorkspace } from '@/lib/active-workspace';
import { NextResponse } from 'next/server';

export const POST = async (request: Request) => {
  const { adapter, getCookie } = await buildCookieAdapter();
  const supabase = createSupabaseServerClient(adapter);

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }
  const workspaceId = await resolveActiveWorkspace(
    supabase,
    userData.user.id,
    getCookie('active_workspace_id'),
  );
  if (!workspaceId) {
    return NextResponse.json(
      { error: 'No tienes workspace asociado. Recarga la página tras iniciar sesión.' },
      { status: 400 },
    );
  }

  const form = await request.formData();
  const kind = form.get('kind');
  const files = form.getAll('files') as File[];
  const bank = (form.get('bank') as BankCode | null) ?? 'BBVA';

  if (!files.length) {
    return NextResponse.json({ error: 'Sin archivos' }, { status: 400 });
  }

  if (kind === 'cfdi') {
    const inserted: Array<{ id: string; uuidSat: string }> = [];
    const errors: Array<{ file: string; error: string }> = [];

    for (const file of files) {
      try {
        const xml = await file.text();
        const parsed = parseCfdiXml(xml);

        const { data, error } = await supabase
          .from('cfdi_xmls')
          .insert({
            workspace_id: workspaceId,
            uuid_sat: parsed.uuidSat,
            emisor_rfc: parsed.emisorRfc,
            emisor_nombre: parsed.emisorNombre,
            receptor_rfc: parsed.receptorRfc,
            receptor_nombre: parsed.receptorNombre,
            total: parsed.total,
            subtotal: parsed.subtotal,
            fecha: parsed.fecha.toISOString(),
            serie: parsed.serie,
            folio: parsed.folio,
            comprobante_type: parsed.comprobanteType,
            forma_pago: parsed.formaPago,
            metodo_pago: parsed.metodoPago,
            moneda: parsed.moneda,
            raw_xml: xml,
          })
          .select('id, uuid_sat')
          .single();

        if (error) {
          errors.push({ file: file.name, error: error.message });
        } else if (data) {
          inserted.push({ id: data.id, uuidSat: data.uuid_sat });
        }
      } catch (err) {
        errors.push({ file: file.name, error: (err as Error).message });
      }
    }

    return NextResponse.json({ inserted, errors });
  }

  if (kind === 'bank') {
    const file = files[0]!;
    const csv = await file.text();
    let parsed;
    try {
      parsed = parseBankCsv(bank, csv);
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 400 });
    }

    const { data: stmtRow, error: stmtErr } = await supabase
      .from('bank_statements')
      .insert({
        workspace_id: workspaceId,
        bank: parsed.bank,
        period_start: parsed.periodStart?.toISOString().slice(0, 10) ?? null,
        period_end: parsed.periodEnd?.toISOString().slice(0, 10) ?? null,
        uploaded_by: userData.user.id,
      })
      .select('id')
      .single();

    if (stmtErr || !stmtRow) {
      return NextResponse.json({ error: stmtErr?.message ?? 'insert failed' }, { status: 500 });
    }

    const rows = parsed.transactions.map((t) => ({
      workspace_id: workspaceId,
      statement_id: stmtRow.id,
      fecha: t.fecha.toISOString().slice(0, 10),
      concepto: t.concepto,
      monto: t.monto,
      referencia: t.referencia,
      is_credit: t.isCredit,
    }));

    const { error: txErr } = await supabase.from('bank_transactions').insert(rows);
    if (txErr) {
      return NextResponse.json({ error: txErr.message }, { status: 500 });
    }

    return NextResponse.json({ statementId: stmtRow.id, transactions: rows.length });
  }

  return NextResponse.json({ error: 'Unknown kind' }, { status: 400 });
};
