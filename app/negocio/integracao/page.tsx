import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import IntegracaoNegocio from "@/components/negocio/IntegracaoNegocio";

// Chaves de API e webhook são sensíveis: só dono/gerente. Operador cai na home
// (gate no server, antes de renderizar — não basta esconder no menu).
export default async function Page() {
  const sb = await getServerSupabase();
  if (sb) {
    const { data: papel } = await sb.rpc("meu_papel_negocio");
    if (papel !== "dono" && papel !== "gerente") redirect("/negocio/novo-pedido");
  }
  return <IntegracaoNegocio />;
}
