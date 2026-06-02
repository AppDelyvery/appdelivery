"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL, hasSupabase } from "@/lib/integracoes";

// Client de browser (anon key + RLS). Singleton. null se as envs não estiverem setadas.
let client: SupabaseClient | null = null;

export function getBrowserSupabase(): SupabaseClient | null {
  if (!hasSupabase()) return null;
  if (!client) client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return client;
}
