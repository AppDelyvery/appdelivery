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

// Admin resolve o chamado.
export async function resolverDisputa(id: string, resolucao: string): Promise<DispResult> {
  const sb = await getServerSupabase();
  if (!sb) return { ok: false, motivo: "supabase-nao-configurado" };
  const { error } = await sb.from("disputas").update({ status: "resolvida", resolucao, resolvida_at: new Date().toISOString() }).eq("id", id);
  if (error) return { ok: false, motivo: error.message };
  return { ok: true };
}
