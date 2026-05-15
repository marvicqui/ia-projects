import { createBrowserClient } from '@supabase/ssr';
import { env } from './env';

export const createSupabaseBrowserClient = () =>
  createBrowserClient(env.supabaseUrl(), env.supabaseAnonKey());
