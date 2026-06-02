import { redirect } from "next/navigation";
import { EntregaProvider } from "@/components/negocio/EntregaContext";
import { getServerSupabase } from "@/lib/supabase/server";

export default async function NegocioLayout({ children }: { children: React.ReactNode }) {
  // Auth-gate: área do lojista exige sessão. Sem Supabase configurado, libera (modo dev/demo).
  const sb = await getServerSupabase();
  if (sb) {
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) redirect("/login");
  }
  return <EntregaProvider>{children}</EntregaProvider>;
}
