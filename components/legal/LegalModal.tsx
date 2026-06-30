"use client";

import { useEffect } from "react";
import { Icon } from "../Icons";
import { TermosContent, PrivacidadeContent, VIGENCIA } from "./LegalContent";

export type LegalDoc = "termos" | "privacidade";

// Lê os documentos legais SEM sair do cadastro (modal sobre o formulário).
// Fechar volta ao ponto exato — campos, captcha e aceite preservados.
export default function LegalModal({ doc, onClose }: { doc: LegalDoc | null; onClose: () => void }) {
  useEffect(() => {
    if (!doc) return;
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onEsc);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onEsc); document.body.style.overflow = ""; };
  }, [doc, onClose]);

  if (!doc) return null;
  const titulo = doc === "termos" ? "Termos de Uso" : "Política de Privacidade";

  return (
    <div className="legal-modal-ov" onClick={onClose}>
      <div className="legal-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="legal-modal-h">
          <div>
            <div className="lm-titulo">{titulo}</div>
            <div className="lm-vig">{VIGENCIA}</div>
          </div>
          <button type="button" className="lm-fechar" onClick={onClose}>Fechar</button>
        </div>

        <div className="legal-modal-body legal">
          <div className="legal-aviso" style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <Icon name="shield" style={{ width: 18, height: 18, flexShrink: 0, marginTop: 1 }} />
            <span>
              RASCUNHO — texto base que <b>precisa de revisão de um advogado</b> antes de ir ao ar. Não substitui
              parecer jurídico.
            </span>
          </div>
          {doc === "termos" ? <TermosContent /> : <PrivacidadeContent />}
        </div>

        <div className="legal-modal-f">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            <Icon name="checkThin" /> Voltar ao cadastro
          </button>
        </div>
      </div>
    </div>
  );
}
