// Mensalidade SaaS do estabelecimento — leitura + GATE. Porte do modelo AgendaPRO.
// O gate olha o STATUS, nunca `pago_ate` direto (lição cravada: status é a fonte da verdade).
// FUNDAÇÃO: o enforcement real (paywall no painel) + checkout + cron entram em fatias seguintes.
import { getBrowserSupabase } from "./supabase/browser";

export type StatusAssinatura = "trial" | "active" | "past_due" | "cancelled" | "pending_payment";

export type Assinatura = {
  estabelecimento_id: string;
  status: StatusAssinatura;
  plano: string;
  plan_modalidade: string | null;
  valor_mensal: number | null;
  provider: string;
  pago_ate: string | null;
  trial_ends_at: string | null;
  grace_ends_at: string | null;
  permanent_courtesy: boolean;
};

// Bloqueia o acesso do lojista? Cortesia nunca bloqueia; carência (past_due) respeita grace_ends_at.
export function assinaturaBloqueada(s: Assinatura | null): boolean {
  if (!s) return false; // sem assinatura ainda → não bloqueia (fail-open na fundação)
  if (s.permanent_courtesy) return false;
  if (s.status === "cancelled" || s.status === "pending_payment") return true;
  if (s.status === "past_due") return s.grace_ends_at ? new Date(s.grace_ends_at) < new Date() : true;
  return false; // trial | active
}

// Dias restantes do trial (pro aviso "seu teste acaba em N dias"). null se não está em trial.
export function diasDeTrial(s: Assinatura | null): number | null {
  if (!s || s.status !== "trial" || !s.trial_ends_at) return null;
  const ms = new Date(s.trial_ends_at).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86400000));
}

// Lê a assinatura do lojista logado (RPC minha_assinatura, SECURITY DEFINER).
export async function buscarMinhaAssinatura(): Promise<Assinatura | null> {
  const sb = getBrowserSupabase();
  if (!sb) return null;
  const { data, error } = await sb.rpc("minha_assinatura");
  if (error || !data) return null;
  return (Array.isArray(data) ? data[0] : data) as Assinatura;
}
