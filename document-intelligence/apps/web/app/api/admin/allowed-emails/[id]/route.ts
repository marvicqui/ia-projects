import { guardAdmin } from '@/lib/admin';
import { NextResponse } from 'next/server';

export const DELETE = async (
  _request: Request,
  context: { params: Promise<{ id: string }> },
) => {
  const { id } = await context.params;
  const { supabase } = await guardAdmin();

  const { error } = await supabase.from('allowed_emails').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
};
