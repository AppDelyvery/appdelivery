"use server";

import { getServerSupabase } from "@/lib/supabase/server";

// PIN do supervisor (Palace-style). Configure ADMIN_PIN no .env / Vercel. Vazio = sem checagem (dev).
const ADMIN_PIN = process.env.ADMIN_PIN ?? "";

export type AprovarResult = { ok: true } | { ok: false; motivo: string };

// Admin aprova o entregador (status -> 'aprovado'). Dupla trava:
// 1) PIN do supervisor; 2) RLS/guard 0003 reverte se o chamador não for admin (defesa em profundidade).
export async function aprovarEntregador(entregadorId: string, pin: string): Promise<AprovarResult> {
  const sb = await getServerSupabase();
  if (!sb) return { ok: false, motivo: "supabase-nao-configurado" };

  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { ok: false, motivo: "nao-autenticado" };

  if (ADMIN_PIN && pin !== ADMIN_PIN) return { ok: false, motivo: "pin-invalido" };

  const { error } = await sb.from("entregadores").update({ status: "aprovado" }).eq("id", entregadorId);
  if (error) return { ok: false, motivo: error.message };

  // read-after-write: se o guard reverteu (chamador não-admin), o status NÃO será 'aprovado'
  const { data: check } = await sb.from("entregadores").select("status").eq("id", entregadorId).single();
  if ((check as { status?: string } | null)?.status !== "aprovado") {
    return { ok: false, motivo: "nao-aprovado (RLS/guard bloqueou — voce e admin?)" };
  }
  return { ok: true };
}
