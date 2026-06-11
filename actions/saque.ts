"use server";

import { getServerSupabase } from "@/lib/supabase/server";
import { hasAsaas } from "@/lib/integracoes";
import { transferirPix } from "@/lib/asaas";

export type SaqueResult = { ok: true } | { naoConfigurado: true } | { erro: string };

const ERR: Record<string, string> = {
  "nao-e-entregador": "Conta de entregador não encontrada.",
  "minimo-20": "Saque mínimo de R$ 20.",
  "saldo-insuficiente": "Saldo insuficiente para esse saque.",
};

// Entregador saca o saldo pra própria chave Pix: reserva (debita) -> transfere (Asaas) -> finaliza.
// Se a transferência falha, o saldo é estornado. No-op sem a chave Asaas.
export async function solicitarSaque(valor: number, chavePix: string): Promise<SaqueResult> {
  if (!Number.isFinite(valor) || valor < 20) return { erro: "Saque mínimo de R$ 20." };
  const chave = (chavePix ?? "").trim();
  if (!chave) return { erro: "Informe sua chave Pix." };
  if (!hasAsaas()) return { naoConfigurado: true };

  const sb = await getServerSupabase();
  if (!sb) return { erro: "Sistema indisponível." };

  const { data: rid } = await sb.rpc("reservar_saque", { p_valor: valor, p_chave_pix: chave });
  const ridStr = String(rid ?? "");
  if (ERR[ridStr]) return { erro: ERR[ridStr] };
  if (!ridStr) return { erro: "Não consegui iniciar o saque." };

  const tr = await transferirPix({ chavePix: chave, valor, descricao: "Saque APPDELYVERY" });
  if (tr.id) {
    await sb.rpc("finalizar_saque", { p_saque_id: ridStr, p_status: "pago", p_transfer_id: tr.id });
    return { ok: true };
  }
  await sb.rpc("finalizar_saque", { p_saque_id: ridStr, p_status: "falhou", p_transfer_id: null });
  return { erro: tr.erro ?? "Falha na transferência. Saldo devolvido." };
}
