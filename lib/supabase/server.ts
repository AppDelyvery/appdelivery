import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL, hasSupabase } from "@/lib/integracoes";

// Client de servidor cookie-aware (Server Components / Server Actions). cookies() é async no Next 16.
export async function getServerSupabase(): Promise<SupabaseClient | null> {
  if (!hasSupabase()) return null;
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // chamado de um Server Component (sem permissão de set) — ok, o proxy renova depois.
        }
      },
    },
  });
}
