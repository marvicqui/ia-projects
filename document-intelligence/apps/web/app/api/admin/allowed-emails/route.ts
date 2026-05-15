import { guardAdmin } from '@/lib/admin';
import { NextResponse } from 'next/server';

export const POST = async (request: Request) => {
  const { session, supabase } = await guardAdmin();
  const body = (await request.json()) as { email?: string; notes?: string };

  const email = body.email?.trim().toLowerCase();
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Email invalido' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('allowed_emails')
    .insert({ email, notes: body.notes ?? null, created_by: session.userId })
    .select('id, email, notes, created_at')
    .single();

  if (error) {
    const status = error.code === '23505' ? 409 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
  return NextResponse.json({ entry: data });
};
