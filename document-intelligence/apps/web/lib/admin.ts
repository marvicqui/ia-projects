import { createClient } from '@supabase/supabase-js';
import { requirePlatformAdmin } from '@/lib/session';

// Service-role Supabase client. Solo usar en endpoints/server-actions
// protegidos por requirePlatformAdmin().
export const createAdminClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase admin credentials missing');
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

// Gate uniforme para todas las rutas /api/admin/*.
export const guardAdmin = async () => {
  const session = await requirePlatformAdmin();
  return { session, supabase: createAdminClient() };
};
