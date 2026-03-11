import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _supabase: SupabaseClient | null = null;
let _supabaseServer: SupabaseClient | null = null;
let _supabaseServerAnon: SupabaseClient | null = null;

/** Cliente Supabase para uso no browser (client-side) */
export function getSupabase(): SupabaseClient | null {
  if (typeof window === "undefined") return null;
  if (_supabase) return _supabase;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && key) {
    _supabase = createClient(url, key);
  }
  return _supabase;
}

/** Cliente Supabase para uso em API routes (server-side). Usa service_role para bypass de RLS. */
export function getSupabaseServer(): SupabaseClient | null {
  if (typeof window !== "undefined") return null;
  if (_supabaseServer) return _supabaseServer;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) {
    _supabaseServer = createClient(url, key, { auth: { persistSession: false } });
  }
  return _supabaseServer;
}

/** Cliente Supabase server-side com anon key. Usado para RPCs como auth_validate_user. */
export function getSupabaseServerAnon(): SupabaseClient | null {
  if (typeof window !== "undefined") return null;
  if (_supabaseServerAnon) return _supabaseServerAnon;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && key) {
    _supabaseServerAnon = createClient(url, key, { auth: { persistSession: false } });
  }
  return _supabaseServerAnon;
}

export const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return !!(url && key);
};
