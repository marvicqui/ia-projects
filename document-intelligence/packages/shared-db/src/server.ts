import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { env } from './env';

export interface CookieToSet {
  name: string;
  value: string;
  options?: Record<string, unknown>;
}

export interface CookieStore {
  getAll: () => Array<{ name: string; value: string }>;
  setAll?: (cookies: CookieToSet[]) => void;
  // Legacy single-cookie accessors (used by route handlers that pass `cookies()` adapter).
  get?: (name: string) => { value: string } | undefined;
  set?: (cookie: { name: string; value: string } & Record<string, unknown>) => void;
}

export const createSupabaseServerClient = (cookies: CookieStore) =>
  createServerClient(env.supabaseUrl(), env.supabaseAnonKey(), {
    cookies: {
      getAll: () => cookies.getAll(),
      setAll: (toSet: CookieToSet[]) => {
        try {
          if (cookies.setAll) {
            cookies.setAll(toSet);
          } else if (cookies.set) {
            for (const c of toSet) cookies.set({ name: c.name, value: c.value, ...(c.options ?? {}) });
          }
        } catch {
          // Server Component context — cookies are read-only here.
        }
      },
    },
  });

export const createSupabaseServiceClient = () =>
  createClient(env.supabaseUrl(), env.supabaseServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
