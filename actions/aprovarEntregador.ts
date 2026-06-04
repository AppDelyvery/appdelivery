"use server";

import { getServerSupabase } from "@/lib/supabase/server";
import { getConfig } from "@/lib/config";

export type AprovarResult = { ok: true } | { ok: false; motivo: string };

// Admin aprova o entregador (status -> 'aprovado'). Dupla trava:
// 1) PIN do supervisor (editável na config); 2) RLS/guard 0003 reverte se o chamador não for admin.
export async function aprovarEntregador(entregadorId: string, pin: string): Promise<AprovarResult> {
  const sb = await getServerSupabase();
  if (!sb) return { ok: false, motivo: "supabase-nao-configurado" };

  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { ok: false, motivo: "nao-autenticado" };

  const cfg = await getConfig(sb);
  if (cfg.pin && pin !== cfg.pin) return { ok: false, motivo: "pin-invalido" };

  const { error } = await sb.from("entregadores").update({ status: "aprovado" }).eq("id", entregadorId);
  if (error) return { ok: false, motivo: error.message };

  // read-after-write: se o guard reverteu (chamador não-admin), o status NÃO será 'aprovado'
  const { data: check } = await sb.from("entregadores").select("status").eq("id", entregadorId).single();
  if ((check as { status?: string } | null)?.status !== "aprovado") {
    return { ok: false, motivo: "nao-aprovado (RLS/guard bloqueou — voce e admin?)" };
  }
  return { ok: true };
}
