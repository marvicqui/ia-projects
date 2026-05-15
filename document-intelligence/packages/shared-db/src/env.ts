// Direct access to process.env.NEXT_PUBLIC_* is required for Next.js to
// statically inline the value into the client bundle. Dynamic access
// (process.env[varName]) is NOT replaced and breaks client rendering.

export const env = {
  supabaseUrl: () => {
    const v = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!v) throw new Error('Missing required env var: NEXT_PUBLIC_SUPABASE_URL');
    return v;
  },
  supabaseAnonKey: () => {
    const v = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!v) throw new Error('Missing required env var: NEXT_PUBLIC_SUPABASE_ANON_KEY');
    return v;
  },
  supabaseServiceRoleKey: () => {
    const v = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!v) throw new Error('Missing required env var: SUPABASE_SERVICE_ROLE_KEY');
    return v;
  },
};
