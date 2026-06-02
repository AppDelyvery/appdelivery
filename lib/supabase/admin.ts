import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/integracoes";

// Client de servidor com service role — BYPASSA RLS. NUNCA importar em código de client.
// Usar só em server actions/route handlers para operações privilegiadas (ex.: verificação, split).
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export function getAdminSupabase(): SupabaseClient | null {
  if (!SUPABASE_URL || !SERVICE_ROLE) return null;
  return createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
