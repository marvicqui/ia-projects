import { createSupabaseServerClient } from '@jvp/shared-db';
import { buildCookieAdapter } from '@/lib/session';
import { resolveActiveWorkspace } from '@/lib/active-workspace';
import { NextResponse } from 'next/server';

export const POST = async (request: Request) => {
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
    rfc?: string;
    razon_social?: string;
    contact_email?: string;
    contact_phone?: string;
  };

  if (!body.rfc || !body.razon_social) {
    return NextResponse.json({ error: 'RFC y razón social son requeridos' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('laboral_contractors')
    .insert({
      workspace_id: workspaceId,
      rfc: body.rfc.toUpperCase().trim(),
      razon_social: body.razon_social.trim(),
      contact_email: body.contact_email?.trim() || null,
      contact_phone: body.contact_phone?.trim() || null,
      created_by: userData.user.id,
    })
    .select('id')
    .single();

  if (error) {
    const status = error.code === '23505' ? 409 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
  return NextResponse.json({ id: data.id });
};
