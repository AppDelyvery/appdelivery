import { redirect } from "next/navigation";
import { EntregadorProvider } from "@/components/entregador/EntregadorContext";
import { getServerSupabase } from "@/lib/supabase/server";
import { rotaPorPapel } from "@/lib/papel";

export default async function EntregadorLayout({ children }: { children: React.ReactNode }) {
  // Gate por papel: área do entregador é só de quem é 'entregador'. Outro papel volta pra sua home.
  const sb = await getServerSupabase();
  if (sb) {
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) redirect("/login");
    const { data: perfil } = await sb.from("profiles").select("role").eq("id", user.id).single();
    const role = (perfil as { role?: string } | null)?.role;
    if (role !== "entregador") redirect(rotaPorPapel(role));
  }
  return <EntregadorProvider>{children}</EntregadorProvider>;
}
