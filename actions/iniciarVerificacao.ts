"use server";

import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { consultarAntecedentes } from "@/lib/verificacao/flagcheck";
import { validarCNH, validarCRLV } from "@/lib/verificacao/infosimples";
import { verificarBiometria } from "@/lib/verificacao/idwall";
import type { VerifResultado } from "@/lib/verificacao/tipos";

type Entregador = { id: string; cpf: string; placa: string | null; vehicle_type: string };
const mapRes = (r: VerifResultado) => (r.aprovado === true ? "aprovado" : r.aprovado === false ? "reprovado" : "pendente");

export type IniciarVerifResult =
  | { ok: true; gravou: boolean; resultados: Record<string, string> }
  | { ok: false; motivo: string };

// O entregador pede verificação. Marca status 'em_verificacao' (0003 permite cadastro->em_verificacao),
// roda os provedores (server-side) e grava em `verificacoes` via service role (RLS admin-only).
// Sem chaves/serviço configurado: marca em_verificacao p/ revisão MANUAL no admin (não trava).
export async function iniciarVerificacao(selfieUrl?: string, docUrl?: string): Promise<IniciarVerifResult> {
  const sb = await getServerSupabase();
  if (!sb) return { ok: false, motivo: "supabase-nao-configurado" };
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { ok: false, motivo: "nao-autenticado" };

  const { data, error } = await sb
    .from("entregadores")
    .select("id, cpf, placa, vehicle_type")
    .eq("profile_id", user.id)
    .single();
  if (error || !data) return { ok: false, motivo: "entregador-nao-encontrado" };
  const ent = data as Entregador;

  // 1) marca em verificação
  await sb.from("entregadores").update({ status: "em_verificacao" }).eq("id", ent.id);

  // 2) roda os provedores (tomadas — no-op se sem chave)
  const categoriaCnh = ent.vehicle_type === "moto" ? "A" : "B";
  const antecedentes = await consultarAntecedentes(ent.cpf);
  const cnh = await validarCNH(ent.cpf, categoriaCnh);
  const crlv = ent.placa ? await validarCRLV(ent.placa) : null;
  const identidade = await verificarBiometria(selfieUrl, docUrl);

  const resultados: Record<string, string> = {
    antecedentes: mapRes(antecedentes),
    cnh: mapRes(cnh),
    crlv: crlv ? mapRes(crlv) : "pendente",
    identidade: mapRes(identidade),
  };

  // 3) grava as verificações (precisa service role — verificacoes é admin-only por RLS)
  const admin = getAdminSupabase();
  let gravou = false;
  if (admin) {
    const linhas = [
      { tipo: "antecedentes", provedor: "flagcheck", r: antecedentes },
      { tipo: "cnh", provedor: "infosimples", r: cnh },
      ...(crlv ? [{ tipo: "crlv", provedor: "infosimples", r: crlv }] : []),
      { tipo: "identidade", provedor: "idwall", r: identidade },
    ].map((x) => ({
      entregador_id: ent.id,
      tipo: x.tipo,
      provedor: x.provedor,
      resultado: mapRes(x.r),
      payload: x.r.raw ?? null,
    }));
    const { error: eIns } = await admin.from("verificacoes").insert(linhas);
    gravou = !eIns;
  }

  // A APROVAÇÃO FINAL continua manual no admin (com PIN). Isto só roda os checks e registra.
  return { ok: true, gravou, resultados };
}
