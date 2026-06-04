"use server";

import { getServerSupabase } from "@/lib/supabase/server";
import { getConfig } from "@/lib/config";

export type OpResult = { ok: true } | { ok: false; motivo: string };

// Admin promove/rebaixa um usuário a operador (por e-mail, com PIN).
export async function promoverOperador(email: string, ativar: boolean, pin: string): Promise<OpResult> {
  const sb = await getServerSupabase();
  if (!sb) return { ok: false, motivo: "supabase-nao-configurado" };
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { ok: false, motivo: "nao-autenticado" };
  const cfg = await getConfig(sb);
  if (cfg.pin && pin !== cfg.pin) return { ok: false, motivo: "pin-invalido" };
  const { data, error } = await sb.rpc("definir_operador", { p_email: email, p_ativar: ativar });
  if (error) return { ok: false, motivo: error.message };
  if (data === "ok") return { ok: true };
  return { ok: false, motivo: data === "usuario-nao-encontrado" ? "Usuário não encontrado (ele precisa ter conta)." : data === "so-admin" ? "Só admin." : String(data) };
}
