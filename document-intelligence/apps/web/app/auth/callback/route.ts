import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const GET = async (request: Request) => {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/dashboard';

  const response = NextResponse.redirect(new URL(next, url.origin));

  if (!code) return response;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase env vars missing in /auth/callback');
    return NextResponse.redirect(new URL('/login?error=env', url.origin));
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll().map((c) => ({ name: c.name, value: c.value })),
      setAll: (
        toSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>,
      ) => {
        for (const c of toSet) {
          response.cookies.set({
            name: c.name,
            value: c.value,
            ...(c.options ?? {}),
          });
        }
      },
    },
  });

  const { error: exchangeErr, data: exchangeData } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeErr) {
    console.error('exchangeCodeForSession failed:', exchangeErr.message);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(exchangeErr.message)}`, url.origin),
    );
  }

  // Set active_workspace_id cookie. Esto NO se puede hacer desde RSC en Next 15.
  const userId = exchangeData.user?.id;
  if (userId) {
    const { data: member } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();
    if (member?.workspace_id) {
      response.cookies.set({
        name: 'active_workspace_id',
        value: member.workspace_id,
        path: '/',
        sameSite: 'lax',
      });
    }
  }

  return response;
};
