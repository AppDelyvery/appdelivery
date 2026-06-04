import "server-only";
import { INFOSIMPLES_TOKEN, hasInfosimples } from "@/lib/integracoes";
import { naoConfigurado, type VerifResultado } from "./tipos";

// CNH (Senatran/RENACH) e CRLV (veículo) via Infosimples. SÓ server-side.
// TOMADA: chave + confirmar endpoints/parâmetros na doc (infosimples.com/consultas).
const BASE = "https://api.infosimples.com/api/v2/consultas";

async function chamar(path: string, args: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(`${BASE}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: INFOSIMPLES_TOKEN, ...args }),
  });
  return res.json();
}

// CNH: existe, válida, categoria certa (A p/ moto), não suspensa/cassada.
export async function validarCNH(cpf: string, categoriaEsperada?: string): Promise<VerifResultado> {
  if (!hasInfosimples()) return naoConfigurado("Infosimples (CNH)");
  try {
    const raw = (await chamar("senatran/validar-cnh", { cpf })) as { data?: Array<Record<string, unknown>>; code?: number };
    const d = raw?.data?.[0];
    const situacao = String(d?.situacao ?? "").toUpperCase();
    const categoria = String(d?.categoria ?? "");
    const okSituacao = situacao.includes("REGULAR") || situacao.includes("VÁLID");
    const okCategoria = !categoriaEsperada || categoria.includes(categoriaEsperada);
    const aprovado = raw?.code === 200 && okSituacao && okCategoria;
    return {
      configurado: true,
      aprovado,
      detalhe: aprovado ? `CNH ${categoria} ${situacao}` : `CNH reprovada (${situacao || "sem dados"})`,
      raw,
    };
  } catch (e) {
    return { configurado: true, aprovado: null, detalhe: e instanceof Error ? e.message : "erro Infosimples CNH" };
  }
}

// CRLV: veículo regular, licenciado, não roubado/furtado.
export async function validarCRLV(placa: string): Promise<VerifResultado> {
  if (!hasInfosimples()) return naoConfigurado("Infosimples (CRLV)");
  try {
    const raw = (await chamar("detran/crlv", { placa })) as { data?: Array<Record<string, unknown>>; code?: number };
    const d = raw?.data?.[0];
    const restricao = String(d?.restricao ?? d?.situacao ?? "").toUpperCase();
    const aprovado = raw?.code === 200 && !restricao.includes("ROUBO") && !restricao.includes("FURTO");
    return {
      configurado: true,
      aprovado,
      detalhe: aprovado ? "Veículo regular" : `Veículo com restrição (${restricao})`,
      raw,
    };
  } catch (e) {
    return { configurado: true, aprovado: null, detalhe: e instanceof Error ? e.message : "erro Infosimples CRLV" };
  }
}
