import { redirect } from "next/navigation";
import { EntregadorProvider } from "@/components/entregador/EntregadorContext";
import { getServerSupabase } from "@/lib/supabase/server";

export default async function EntregadorLayout({ children }: { children: React.ReactNode }) {
  // Auth-gate: área do entregador exige sessão. Sem Supabase configurado, libera (modo dev/demo).
  const sb = await getServerSupabase();
  if (sb) {
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) redirect("/login");
  }
  return <EntregadorProvider>{children}</EntregadorProvider>;
}
