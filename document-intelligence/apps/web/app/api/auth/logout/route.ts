import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const POST = async (request: Request) => {
  const url = new URL(request.url);
  const response = NextResponse.redirect(new URL('/', url.origin));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return response;

  const cookieStore = await cookies();
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll().map((c) => ({ name: c.name, value: c.value })),
      setAll: (
        toSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>,
      ) => {
        for (const c of toSet) {
          response.cookies.set({ name: c.name, value: c.value, ...(c.options ?? {}) });
        }
      },
    },
  });

  await supabase.auth.signOut();
  return response;
};
