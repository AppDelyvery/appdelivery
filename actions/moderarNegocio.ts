"use server";

import { getServerSupabase } from "@/lib/supabase/server";
import { getConfig } from "@/lib/config";

export type ModResult = { ok: true } | { ok: false; motivo: string };

// Admin suspende / reativa um negócio (com PIN). Negócio inativo não cria pedido.
export async function definirAtivoNegocio(id: string, ativo: boolean, pin: string): Promise<ModResult> {
  const sb = await getServerSupabase();
  if (!sb) return { ok: false, motivo: "supabase-nao-configurado" };
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { ok: false, motivo: "nao-autenticado" };
  const cfg = await getConfig(sb);
  if (cfg.pin && pin !== cfg.pin) return { ok: false, motivo: "pin-invalido" };
  const { error } = await sb.from("estabelecimentos").update({ ativo }).eq("id", id);
  if (error) return { ok: false, motivo: error.message };
  return { ok: true };
}
