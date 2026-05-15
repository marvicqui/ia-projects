import { guardAdmin } from '@/lib/admin';
import { NextResponse } from 'next/server';

// PATCH: toggle is_platform_admin del profile
export const PATCH = async (
  request: Request,
  context: { params: Promise<{ id: string }> },
) => {
  const { id } = await context.params;
  const { session, supabase } = await guardAdmin();
  const body = (await request.json()) as { is_platform_admin?: boolean };

  // No permite que el admin se quite el flag a si mismo (evita lockout).
  if (id === session.userId && body.is_platform_admin === false) {
    return NextResponse.json(
      { error: 'No puedes quitarte tu propio flag de platform admin' },
      { status: 400 },
    );
  }

  if (typeof body.is_platform_admin === 'boolean') {
    const { error } = await supabase
      .from('profiles')
      .update({ is_platform_admin: body.is_platform_admin })
      .eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
};

// DELETE: borra el user de auth.users (cascade en profiles/workspace_members/etc)
export const DELETE = async (
  _request: Request,
  context: { params: Promise<{ id: string }> },
) => {
  const { id } = await context.params;
  const { session, supabase } = await guardAdmin();

  if (id === session.userId) {
    return NextResponse.json({ error: 'No puedes borrarte a ti mismo' }, { status: 400 });
  }

  const { error } = await supabase.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
};
