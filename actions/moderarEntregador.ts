"use server";

import { getServerSupabase } from "@/lib/supabase/server";
import { getConfig } from "@/lib/config";

export type StatusEntregador = "aprovado" | "recusado" | "suspenso" | "em_verificacao";
export type ModResult = { ok: true } | { ok: false; motivo: string };

// Admin muda o status do entregador (aprovar/recusar/suspender/reverificar) com PIN.
// Guard 0003 reverte se o chamador não for admin (defesa em profundidade).
export async function definirStatusEntregador(id: string, status: StatusEntregador, pin: string): Promise<ModResult> {
  const sb = await getServerSupabase();
  if (!sb) return { ok: false, motivo: "supabase-nao-configurado" };

  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { ok: false, motivo: "nao-autenticado" };

  const cfg = await getConfig(sb);
  if (cfg.pin && pin !== cfg.pin) return { ok: false, motivo: "pin-invalido" };

  const { error } = await sb.from("entregadores").update({ status }).eq("id", id);
  if (error) return { ok: false, motivo: error.message };

  const { data: check } = await sb.from("entregadores").select("status").eq("id", id).single();
  if ((check as { status?: string } | null)?.status !== status) {
    return { ok: false, motivo: "nao-aplicado (você é admin?)" };
  }
  return { ok: true };
}
