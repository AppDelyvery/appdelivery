import { redirect } from "next/navigation";
import { EntregaProvider } from "@/components/negocio/EntregaContext";
import { getServerSupabase } from "@/lib/supabase/server";
import { rotaPorPapel } from "@/lib/papel";

export default async function NegocioLayout({ children }: { children: React.ReactNode }) {
  // Gate por papel: área do lojista é só de quem é 'estabelecimento'. Outro papel volta pra sua home.
  const sb = await getServerSupabase();
  if (sb) {
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) redirect("/login");
    const { data: perfil } = await sb.from("profiles").select("role").eq("id", user.id).single();
    const role = (perfil as { role?: string } | null)?.role;
    // papel errado vai pra sua home; papel nulo/desconhecido NÃO volta pro /negocio (evita loop) -> /login
    if (role !== "estabelecimento") {
      const dest = rotaPorPapel(role);
      redirect(dest.startsWith("/negocio") ? "/login" : dest);
    }
  }
  return <EntregaProvider>{children}</EntregaProvider>;
}
