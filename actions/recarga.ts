"use server";

import { getServerSupabase } from "@/lib/supabase/server";
import { criarCobrancaPix } from "@/lib/asaas";

export type RecargaResult =
  | { ok: true; pixCopiaCola?: string; qrBase64?: string }
  | { naoConfigurado: true }
  | { erro: string };

// Lojista gera uma cobrança Pix pra recarregar a carteira. O crédito só acontece
// quando o Asaas confirmar o pagamento (webhook -> confirmar_recarga). Mínimo R$ 50.
export async function criarRecarga(valor: number): Promise<RecargaResult> {
  if (!Number.isFinite(valor) || valor < 50) return { erro: "Recarga mínima de R$ 50." };
  const sb = await getServerSupabase();
  if (!sb) return { erro: "Sistema indisponível." };

  const { data: auth } = await sb.auth.getUser();
  const user = auth?.user;
  if (!user) return { erro: "Faça login para recarregar." };

  const { data: est } = await sb.from("estabelecimentos").select("id").eq("profile_id", user.id).maybeSingle();
  const estId = (est as { id: string } | null)?.id;
  if (!estId) return { erro: "Estabelecimento não encontrado." };

  const cob = await criarCobrancaPix({ valor, descricao: "Recarga de carteira APPDELYVERY", externalRef: estId });
  if (!cob.configurado) return { naoConfigurado: true };
  if (cob.erro || !cob.id) return { erro: cob.erro ?? "Falha ao gerar o Pix." };

  const { error } = await sb.from("recargas").insert({ estabelecimento_id: estId, valor, asaas_payment_id: cob.id });
  if (error) return { erro: "Não consegui registrar a recarga." };

  return { ok: true, pixCopiaCola: cob.pixCopiaCola, qrBase64: cob.qrBase64 };
}
