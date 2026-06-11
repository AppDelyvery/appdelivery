"use server";

import { getServerSupabase } from "@/lib/supabase/server";

export type AvaliarResult = { ok: true } | { erro: string };

const ERR: Record<string, string> = {
  "nao-autorizado": "Você não pode avaliar esta entrega.",
  "nota-invalida": "Escolha de 1 a 5 estrelas.",
  "papel-invalido": "Avaliação inválida.",
};

// Registra a avaliação (entregador->negócio ou negócio->entregador). Recalcula o rating no banco.
export async function registrarAvaliacao(
  pedidoId: string,
  nota: number,
  comentario: string,
  dePapel: "entregador" | "estabelecimento",
): Promise<AvaliarResult> {
  if (nota < 1 || nota > 5) return { erro: "Escolha de 1 a 5 estrelas." };
  const sb = await getServerSupabase();
  if (!sb) return { erro: "Sistema indisponível." };
  const { data } = await sb.rpc("registrar_avaliacao", { p_pedido_id: pedidoId, p_nota: nota, p_comentario: comentario, p_de_papel: dePapel });
  const r = String(data ?? "");
  return r === "ok" ? { ok: true } : { erro: ERR[r] ?? "Não consegui registrar a avaliação." };
}
