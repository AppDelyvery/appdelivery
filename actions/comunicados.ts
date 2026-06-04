"use server";

import { getServerSupabase } from "@/lib/supabase/server";

export type EnvioResult = { ok: true; id: string } | { ok: false; motivo: string };

// Admin dispara um comunicado (mural in-app) pra todos / entregadores / negócios.
// A guarda de admin está na RPC (SECURITY DEFINER, migration 0014).
export async function enviarComunicado(titulo: string, corpo: string, alvo: string): Promise<EnvioResult> {
  const sb = await getServerSupabase();
  if (!sb) return { ok: false, motivo: "supabase-nao-configurado" };
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { ok: false, motivo: "nao-autenticado" };
  const { data, error } = await sb.rpc("enviar_comunicado", { p_titulo: titulo, p_corpo: corpo, p_alvo: alvo });
  if (error) return { ok: false, motivo: error.message };
  return { ok: true, id: data as string };
}
