"use server";

import { hasSupabase } from "@/lib/integracoes";
import type { Veiculo } from "@/lib/precos";

export type NovoPedidoInput = {
  coleta: string;
  entrega: string;
  veiculo: Veiculo;
  conteudo: string;
  valorDeclarado: number;
};

export type CriarPedidoResult =
  | { ok: true; pedidoId: string }
  | { ok: false; motivo: "supabase-nao-configurado" | "nao-implementado" };

// Esqueleto. Quando o Supabase existir: INSERT + read-after-write (λ.prova-na-fonte) —
// ler a row de volta antes de retornar ok. UI verde não é prova.
export async function criarPedido(_input: NovoPedidoInput): Promise<CriarPedidoResult> {
  if (!hasSupabase()) return { ok: false, motivo: "supabase-nao-configurado" };
  return { ok: false, motivo: "nao-implementado" };
}
