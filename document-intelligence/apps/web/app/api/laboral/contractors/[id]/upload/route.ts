import { createSupabaseServerClient } from '@jvp/shared-db';
import { buildCookieAdapter } from '@/lib/session';
import { resolveActiveWorkspace } from '@/lib/active-workspace';
import { extractLaboralDoc, computeComplianceLevel, type LaboralDocType } from '@jvp/module-laboral';
import { createAdminClient } from '@/lib/admin';
import { NextResponse } from 'next/server';

const VALID_TYPES: LaboralDocType[] = ['repse', 'sat_32d', 'imss_32d', 'infonavit', 'csf'];

export const POST = async (
  request: Request,
  context: { params: Promise<{ id: string }> },
) => {
  const { id: contractorId } = await context.params;
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

  // Verificar que el contractor pertenece al workspace.
  const { data: contractor } = await supabase
    .from('laboral_contractors')
    .select('id')
    .eq('id', contractorId)
    .eq('workspace_id', workspaceId)
    .single();
  if (!contractor) {
    return NextResponse.json({ error: 'Contratista no encontrado' }, { status: 404 });
  }

  const form = await request.formData();
  const docType = form.get('doc_type') as LaboralDocType | null;
  const file = form.get('file') as File | null;

  if (!docType || !VALID_TYPES.includes(docType)) {
    return NextResponse.json({ error: 'doc_type invalido' }, { status: 400 });
  }
  if (!file) return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'Archivo excede 10MB' }, { status: 400 });
  }
  if (file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'Solo se aceptan PDFs' }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64 = buffer.toString('base64');

  // Subir a Storage (bucket "documents") usando service-role para no luchar con RLS.
  const admin = createAdminClient();
  const storagePath = `${workspaceId}/laboral/${contractorId}/${docType}-${Date.now()}.pdf`;
  const { error: uploadErr } = await admin.storage
    .from('documents')
    .upload(storagePath, buffer, { contentType: 'application/pdf', upsert: false });

  if (uploadErr) {
    return NextResponse.json({ error: `Upload storage: ${uploadErr.message}` }, { status: 500 });
  }

  // Registrar en `documents` table.
  const { data: docRow, error: docErr } = await admin
    .from('documents')
    .insert({
      workspace_id: workspaceId,
      module: 'laboral',
      document_subtype: docType,
      storage_path: storagePath,
      file_name: file.name,
      mime_type: 'application/pdf',
      size_bytes: file.size,
      uploaded_by: userData.user.id,
    })
    .select('id')
    .single();
  if (docErr || !docRow) {
    return NextResponse.json({ error: `Insert document: ${docErr?.message}` }, { status: 500 });
  }

  // Llamar Claude para extraer.
  let extracted;
  try {
    extracted = await extractLaboralDoc({ pdfBase64: base64, type: docType });
  } catch (err) {
    return NextResponse.json(
      { error: `Extracción IA falló: ${(err as Error).message}` },
      { status: 500 },
    );
  }

  // Insertar extraction.
  const { data: extractionRow, error: extErr } = await admin
    .from('laboral_extractions')
    .insert({
      workspace_id: workspaceId,
      contractor_id: contractorId,
      doc_type: docType,
      document_id: docRow.id,
      extracted_data: extracted,
      emitted_at: extracted.emittedAt,
      expires_at: extracted.expiresAt,
      valid: extracted.valid,
      model_used: 'claude-haiku-4-5',
      confidence: extracted.confidence,
    })
    .select('id')
    .single();
  if (extErr || !extractionRow) {
    return NextResponse.json({ error: `Insert extraction: ${extErr?.message}` }, { status: 500 });
  }

  // Recomputar compliance.
  const level = computeComplianceLevel({
    valid: extracted.valid,
    expiresAt: extracted.expiresAt,
  });
  const daysUntil =
    extracted.expiresAt !== null
      ? Math.floor(
          (new Date(extracted.expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000),
        )
      : null;

  await admin
    .from('laboral_compliance_status')
    .upsert(
      {
        workspace_id: workspaceId,
        contractor_id: contractorId,
        doc_type: docType,
        level,
        days_until_expiry: daysUntil,
        last_extraction_id: extractionRow.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'contractor_id,doc_type' },
    );

  return NextResponse.json({
    extraction_id: extractionRow.id,
    extracted,
    compliance_level: level,
  });
};
