"use server";

import { getServerSupabase } from "@/lib/supabase/server";
import { hasAsaas } from "@/lib/integracoes";
import { transferirPix, transferirParaWallet } from "@/lib/asaas";

export type SaqueResult =
  | { ok: true; taxa: number; liquido: number }
  | { naoConfigurado: true }
  | { erro: string };

// Entregador saca o saldo pra própria chave Pix. Política (config, decisão do Tulio):
//   * mínimo por saque = config.saque_minimo (default R$35, segura a franquia de 100 transf/mês)
//   * CPF (sem subconta Asaas) paga config.saque_taxa_cpf (default R$3,50) — descontada do valor
//   * MEI (com asaas_subconta_id) saca grátis se config.saque_mei_gratis → incentivo a formalizar
// Fluxo: reserva (debita saldo cheio) -> transfere o LÍQUIDO -> finaliza (estorna o cheio se falhar).
// Tudo no-op sem a chave Asaas.
export async function solicitarSaque(valor: number, chavePix: string): Promise<SaqueResult> {
  if (!Number.isFinite(valor) || valor <= 0) return { erro: "Valor de saque inválido." };
  const chave = (chavePix ?? "").trim();
  if (!chave) return { erro: "Informe sua chave Pix." };
  if (!hasAsaas()) return { naoConfigurado: true };

  const sb = await getServerSupabase();
  if (!sb) return { erro: "Sistema indisponível." };

  // política de saque (config) + se o entregador tem subconta (MEI) -> grátis
  const { data: cfg } = await sb
    .from("config")
    .select("saque_minimo, saque_taxa_cpf, saque_mei_gratis")
    .eq("id", 1)
    .single();
  const minimo = Number(cfg?.saque_minimo ?? 35);
  if (valor < minimo) return { erro: `Saque mínimo de R$ ${minimo.toFixed(2)}.` };

  const { data: ent } = await sb.from("entregadores").select("asaas_subconta_id").maybeSingle();
  const walletId = ent?.asaas_subconta_id ?? null;
  const temSubconta = !!walletId;
  const meiGratis = cfg?.saque_mei_gratis ?? true;
  const taxa = temSubconta && meiGratis ? 0 : Number(cfg?.saque_taxa_cpf ?? 0);
  const liquido = Math.round((valor - taxa) * 100) / 100;
  if (liquido <= 0) return { erro: "Valor abaixo da taxa de saque." };

  const { data: rid } = await sb.rpc("reservar_saque", { p_valor: valor, p_chave_pix: chave });
  const ridStr = String(rid ?? "");
  const ERR: Record<string, string> = {
    "nao-e-entregador": "Conta de entregador não encontrada.",
    "minimo": `Saque mínimo de R$ ${minimo.toFixed(2)}.`,
    "saldo-insuficiente": "Saldo insuficiente para esse saque.",
  };
  if (ERR[ridStr]) return { erro: ERR[ridStr] };
  if (!ridStr) return { erro: "Não consegui iniciar o saque." };

  // transfere o LÍQUIDO (valor - taxa). MEI (com subconta) → transferência interna grátis; CPF → Pix externo.
  const tr = walletId
    ? await transferirParaWallet({ walletId, valor: liquido, descricao: "Saque APPDELYVERY" })
    : await transferirPix({ chavePix: chave, valor: liquido, descricao: "Saque APPDELYVERY" });
  if (tr.id) {
    await sb.rpc("finalizar_saque", { p_saque_id: ridStr, p_status: "pago", p_transfer_id: tr.id });
    return { ok: true, taxa, liquido };
  }
  // falhou -> estorna o valor CHEIO de volta ao saldo
  await sb.rpc("finalizar_saque", { p_saque_id: ridStr, p_status: "falhou", p_transfer_id: null });
  return { erro: tr.erro ?? "Falha na transferência. Saldo devolvido." };
}
