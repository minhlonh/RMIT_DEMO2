import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** True when real credentials are present. When false, the app runs in demo mode. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/**
 * supabase-js throws on empty strings, so in demo mode we construct the client with
 * inert fallback values. No request is ever sent while isSupabaseConfigured is false
 * (all call sites check the flag first).
 */
export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'http://127.0.0.1:54321',
  supabaseAnonKey || 'demo-mode-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);