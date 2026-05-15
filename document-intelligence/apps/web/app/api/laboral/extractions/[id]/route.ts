import { createSupabaseServerClient } from '@jvp/shared-db';
import { buildCookieAdapter } from '@/lib/session';
import { resolveActiveWorkspace } from '@/lib/active-workspace';
import { createAdminClient } from '@/lib/admin';
import { computeComplianceLevel } from '@jvp/module-laboral';
import { NextResponse } from 'next/server';

export const DELETE = async (
  _request: Request,
  context: { params: Promise<{ id: string }> },
) => {
  const { id: extractionId } = await context.params;
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

  // Cargar la extracción para conocer contractor + doc_type + document_id.
  const { data: extraction } = await supabase
    .from('laboral_extractions')
    .select('id, contractor_id, doc_type, document_id, workspace_id')
    .eq('id', extractionId)
    .eq('workspace_id', workspaceId)
    .single();

  if (!extraction) {
    return NextResponse.json({ error: 'Extracción no encontrada' }, { status: 404 });
  }

  const admin = createAdminClient();

  // 1. Borrar el archivo de Storage (best-effort).
  if (extraction.document_id) {
    const { data: doc } = await admin
      .from('documents')
      .select('storage_path')
      .eq('id', extraction.document_id)
      .single();
    if (doc?.storage_path) {
      await admin.storage.from('documents').remove([doc.storage_path]).catch(() => null);
    }
    await admin.from('documents').delete().eq('id', extraction.document_id);
  }

  // 2. Borrar la extracción.
  const { error: delErr } = await admin
    .from('laboral_extractions')
    .delete()
    .eq('id', extractionId);
  if (delErr) {
    return NextResponse.json({ error: `Delete extraction: ${delErr.message}` }, { status: 500 });
  }

  // 3. Recalcular compliance_status: usar la siguiente extracción más reciente de
  //    ese (contractor, doc_type), o marcar como missing si no queda ninguna.
  const { data: nextExt } = await admin
    .from('laboral_extractions')
    .select('id, expires_at, valid')
    .eq('contractor_id', extraction.contractor_id)
    .eq('doc_type', extraction.doc_type)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (nextExt) {
    const level = computeComplianceLevel({
      valid: nextExt.valid,
      expiresAt: nextExt.expires_at,
    });
    const daysUntil =
      nextExt.expires_at !== null
        ? Math.floor(
            (new Date(nextExt.expires_at).getTime() - Date.now()) / (24 * 60 * 60 * 1000),
          )
        : null;
    await admin
      .from('laboral_compliance_status')
      .upsert(
        {
          workspace_id: workspaceId,
          contractor_id: extraction.contractor_id,
          doc_type: extraction.doc_type,
          level,
          days_until_expiry: daysUntil,
          last_extraction_id: nextExt.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'contractor_id,doc_type' },
      );
  } else {
    // No quedan extracciones de ese tipo: borrar la fila de status (vuelve a "missing").
    await admin
      .from('laboral_compliance_status')
      .delete()
      .eq('contractor_id', extraction.contractor_id)
      .eq('doc_type', extraction.doc_type);
  }

  return NextResponse.json({ ok: true });
};
