import { createSupabaseServerClient } from '@jvp/shared-db';
import { buildCookieAdapter } from '@/lib/session';
import { NextResponse } from 'next/server';

export const POST = async () => {
  const { adapter } = await buildCookieAdapter();
  const supabase = createSupabaseServerClient(adapter);
  await supabase.auth.signOut();
  return NextResponse.redirect(
    new URL('/', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  );
};
