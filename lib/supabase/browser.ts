"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL, hasSupabase } from "@/lib/integracoes";

// Client de browser cookie-aware (@supabase/ssr) — a sessão fica em cookie p/ o server ler.
// Singleton. null se as envs não estiverem setadas (UI cai no fallback).
let client: SupabaseClient | null = null;

export function getBrowserSupabase(): SupabaseClient | null {
  if (!hasSupabase()) return null;
  if (!client) client = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return client;
}
