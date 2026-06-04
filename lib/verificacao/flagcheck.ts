import "server-only";
import { FLAGCHECK_API_KEY, hasFlagCheck } from "@/lib/integracoes";
import { naoConfigurado, type VerifResultado } from "./tipos";

// ANTECEDENTES por CPF (FlagCheck ~R$3,33/consulta). SÓ server-side.
// TOMADA: quando a conta existir, basta a chave + confirmar endpoint/formato na doc do parceiro
// (flagcheck.com.br/api-parceiros) e ajustar o mapeamento do resultado abaixo.
const ENDPOINT = "https://api.flagcheck.com.br/v1/consultas"; // confirmar na doc do parceiro

export async function consultarAntecedentes(cpf: string): Promise<VerifResultado> {
  if (!hasFlagCheck()) return naoConfigurado("FlagCheck");
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${FLAGCHECK_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ cpf }),
    });
    const raw = await res.json();
    // mapear ao formato real do parceiro: "limpo"/sem restrições => aprovado
    const aprovado = res.ok && (raw?.status === "limpo" || raw?.restricoes === 0);
    return {
      configurado: true,
      aprovado,
      detalhe: aprovado ? "Sem restrições criminais relevantes" : "Restrições encontradas — revisar",
      raw,
    };
  } catch (e) {
    return { configurado: true, aprovado: null, detalhe: e instanceof Error ? e.message : "erro FlagCheck" };
  }
}
