import { createSupabaseServerClient } from '@jvp/shared-db';
import { buildCookieAdapter } from '@/lib/session';
import { resolveActiveWorkspace } from '@/lib/active-workspace';
import { createAdminClient } from '@/lib/admin';
import { NextResponse } from 'next/server';

export const PATCH = async (
  request: Request,
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

  const body = (await request.json()) as {
    razon_social?: string;
    contact_email?: string | null;
    contact_phone?: string | null;
    is_active?: boolean;
  };

  const update: Record<string, unknown> = {};
  if (typeof body.razon_social === 'string') update.razon_social = body.razon_social.trim();
  if (body.contact_email !== undefined) update.contact_email = body.contact_email?.trim() || null;
  if (body.contact_phone !== undefined) update.contact_phone = body.contact_phone?.trim() || null;
  if (typeof body.is_active === 'boolean') update.is_active = body.is_active;

  if (!Object.keys(update).length) {
    return NextResponse.json({ error: 'Sin cambios' }, { status: 400 });
  }

  const { error } = await supabase
    .from('laboral_contractors')
    .update(update)
    .eq('id', id)
    .eq('workspace_id', workspaceId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
};

export const DELETE = async (
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

  // Verificar ownership con el cliente del usuario (respeta RLS).
  const { data: contractor } = await supabase
    .from('laboral_contractors')
    .select('id')
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .single();
  if (!contractor) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  const admin = createAdminClient();

  // 1. Recolectar document_ids + storage_paths de las extracciones del contratista.
  const { data: docs } = await admin
    .from('laboral_extractions')
    .select('document_id, documents:document_id(storage_path)')
    .eq('contractor_id', id);

  const storagePaths: string[] = [];
  const documentIds: string[] = [];
  for (const row of docs ?? []) {
    if (row.document_id) documentIds.push(row.document_id);
    const docObj = row.documents as { storage_path?: string } | { storage_path?: string }[] | null;
    const path = Array.isArray(docObj) ? docObj[0]?.storage_path : docObj?.storage_path;
    if (path) storagePaths.push(path);
  }

  // 2. Borrar archivos de Storage (best-effort).
  if (storagePaths.length) {
    await admin.storage.from('documents').remove(storagePaths).catch(() => null);
  }

  // 3. Borrar el contratista. CASCADE borra extractions, compliance_status, alerts.
  const { error: delErr } = await admin
    .from('laboral_contractors')
    .delete()
    .eq('id', id)
    .eq('workspace_id', workspaceId);
  if (delErr) {
    return NextResponse.json({ error: `Delete contratista: ${delErr.message}` }, { status: 500 });
  }

  // 4. Borrar rows de la tabla documents (no CASCADE desde contractor).
  if (documentIds.length) {
    await admin.from('documents').delete().in('id', documentIds);
  }

  return NextResponse.json({ ok: true });
};
