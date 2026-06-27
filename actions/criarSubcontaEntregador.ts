"use server";

import { getServerSupabase } from "@/lib/supabase/server";
import { hasAsaas } from "@/lib/integracoes";
import { criarSubconta } from "@/lib/asaas";

export type SubcontaActionResult = { ok: true; walletId: string } | { naoConfigurado: true } | { erro: string };

// Cria a subconta Asaas do entregador logado (precisa ser MEI — só CNPJ pode ter subconta) e guarda o
// walletId via RPC (definir_subconta_entregador, que libera a carve-out do guard). A partir daí o repasse
// dele vira transferência interna grátis. No-op sem a ASAAS_API_KEY.
export async function criarSubcontaEntregador(dados: {
  cnpj: string;
  email: string;
  telefone?: string;
  endereco?: string;
}): Promise<SubcontaActionResult> {
  const cnpj = (dados.cnpj ?? "").replace(/\D/g, "");
  if (cnpj.length !== 14) return { erro: "Subconta exige CNPJ de MEI (14 dígitos)." };
  if (!hasAsaas()) return { naoConfigurado: true };

  const sb = await getServerSupabase();
  if (!sb) return { erro: "Sistema indisponível." };

  // entregador logado
  const { data: ent } = await sb.from("entregadores").select("id, nome, asaas_subconta_id").maybeSingle();
  if (!ent) return { erro: "Conta de entregador não encontrada." };
  if (ent.asaas_subconta_id) return { ok: true, walletId: ent.asaas_subconta_id }; // já tem

  // cria no Asaas
  const sub = await criarSubconta({
    name: ent.nome,
    email: dados.email,
    cpfCnpj: cnpj,
    mobilePhone: dados.telefone?.replace(/\D/g, ""),
    address: dados.endereco,
  });
  if (!sub.configurado) return { naoConfigurado: true };
  if (!sub.walletId) return { erro: sub.erro ?? "Falha ao criar subconta no Asaas." };

  // grava o walletId (RPC libera a carve-out do guard 0050; checa dono internamente)
  const { data: setRes } = await sb.rpc("definir_subconta_entregador", { p_entregador: ent.id, p_wallet: sub.walletId });
  if (setRes !== "ok") return { erro: `Subconta criada, mas não salvou o vínculo (${setRes ?? "erro"}).` };

  // read-after-write (λ.prova-na-fonte)
  const { data: check } = await sb.from("entregadores").select("asaas_subconta_id").eq("id", ent.id).maybeSingle();
  if (check?.asaas_subconta_id !== sub.walletId) return { erro: "Não consegui confirmar a gravação do walletId." };
  return { ok: true, walletId: sub.walletId };
}
