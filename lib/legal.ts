import type { SupabaseClient } from "@supabase/supabase-js";

// Versão vigente dos documentos legais. Faça bump ao publicar mudança MATERIAL
// (Termos/Privacidade) — é o que dispara o re-aceite (LGPD: aviso prévio 30 dias).
export const DOC_VERSAO = "2026-06-30";

export type ConsentTipo =
  | "termos_negocio"
  | "termos_entregador"
  | "privacidade"
  | "verificacao_sensivel"
  | "marketing";

// Grava cada consentimento via RPC SECURITY DEFINER (o IP é capturado no server,
// não no client) e CONFIRMA a persistência relendo as linhas (λ.prova-na-fonte).
// Lança em qualquer falha — o cadastro não conclui sem a prova do aceite.
export async function registrarConsentimentos(
  sb: SupabaseClient,
  profileId: string,
  itens: { tipo: ConsentTipo; aceito: boolean }[],
): Promise<void> {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : null;

  for (const it of itens) {
    const { error } = await sb.rpc("registrar_consentimento", {
      p_tipo: it.tipo,
      p_documento_versao: DOC_VERSAO,
      p_aceito: it.aceito,
      p_user_agent: ua,
    });
    if (error) throw error;
  }

  // read-after-write — única prova de que gravou (UI verde não é prova)
  const { data, error } = await sb
    .from("consentimentos")
    .select("tipo")
    .eq("profile_id", profileId)
    .eq("documento_versao", DOC_VERSAO);
  if (error) throw error;

  const gravados = new Set((data ?? []).map((r: { tipo: string }) => r.tipo));
  for (const it of itens) {
    if (!gravados.has(it.tipo)) throw new Error(`Consentimento '${it.tipo}' não persistiu.`);
  }
}
