"use server";

import { getServerSupabase } from "@/lib/supabase/server";

export type DispResult = { ok: true } | { ok: false; motivo: string };

// Negócio/entregador (autenticado) abre um chamado de suporte no pedido.
export async function abrirDisputa(pedidoId: string, papel: string, tipo: string, descricao: string): Promise<DispResult> {
  const sb = await getServerSupabase();
  if (!sb) return { ok: false, motivo: "supabase-nao-configurado" };
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { ok: false, motivo: "nao-autenticado" };
  const { error } = await sb.from("disputas").insert({ pedido_id: pedidoId, aberta_por: user.id, papel, tipo, descricao });
  if (error) return { ok: false, motivo: error.message };
  return { ok: true };
}

// Admin resolve o chamado — opcionalmente com reembolso (total/parcial) pra carteira do lojista.
// Via RPC resolver_disputa (SECURITY DEFINER, is_admin): credita a carteira + registra a transação.
export async function resolverDisputa(id: string, resolucao: string, reembolso = 0): Promise<DispResult> {
  const sb = await getServerSupabase();
  if (!sb) return { ok: false, motivo: "supabase-nao-configurado" };
  const { data, error } = await sb.rpc("resolver_disputa", { p_disputa_id: id, p_resolucao: resolucao, p_reembolso: reembolso });
  if (error) return { ok: false, motivo: error.message };
  if (data && data !== "ok") return { ok: false, motivo: data as string };
  return { ok: true };
}
