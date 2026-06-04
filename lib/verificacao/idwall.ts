import "server-only";
import { IDWALL_API_KEY, hasIdwall } from "@/lib/integracoes";
import { naoConfigurado, type VerifResultado } from "./tipos";

// BIOMETRIA / FACE ID: OCR do documento + face match (selfie x documento) + liveness (prova de vida).
// SÓ server-side. Dado sensível (LGPD). TOMADA p/ idwall — trocável por Unico/CAF/Serpro Datavalid.
// Exige e-mail corporativo + CNPJ no cadastro do provedor (não aceita Gmail).
const ENDPOINT = "https://api-v2.idwall.co/relatorios"; // confirmar fluxo/endpoint na doc enterprise

export async function verificarBiometria(selfieUrl?: string, docUrl?: string): Promise<VerifResultado> {
  if (!hasIdwall()) return naoConfigurado("idwall (biometria)");
  if (!selfieUrl || !docUrl) {
    return { configurado: true, aprovado: null, detalhe: "Aguardando selfie + documento (upload no Storage)" };
  }
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { Authorization: IDWALL_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ selfie: selfieUrl, documento: docUrl, faceMatch: true, liveness: true }),
    });
    const raw = await res.json();
    // mapear ao formato real: match + liveness aprovados => aprovado
    const aprovado = res.ok && raw?.face_match === true && raw?.liveness === true;
    return {
      configurado: true,
      aprovado,
      detalhe: aprovado ? "Identidade confirmada (face match + prova de vida)" : "Biometria não confirmada — revisar",
      raw,
    };
  } catch (e) {
    return { configurado: true, aprovado: null, detalhe: e instanceof Error ? e.message : "erro idwall" };
  }
}
