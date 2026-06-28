"use client";

import { useState } from "react";
import { Icon } from "./Icons";
import { registrarAvaliacao } from "@/actions/avaliar";

// Cartão de avaliação por estrela (1–5) + comentário. Reutilizado nos dois lados:
// entregador avalia o negócio, negócio avalia o entregador.
export default function AvaliarEntrega({ pedidoId, dePapel, alvo }: { pedidoId: string; dePapel: "entregador" | "estabelecimento"; alvo: string }) {
  const [nota, setNota] = useState(0);
  const [hover, setHover] = useState(0);
  const [com, setCom] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [feito, setFeito] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar() {
    if (nota < 1) return;
    setEnviando(true);
    setErro(null);
    const r = await registrarAvaliacao(pedidoId, nota, com, dePapel);
    setEnviando(false);
    if ("ok" in r) setFeito(true);
    else setErro(r.erro);
  }

  if (feito) {
    return (
      <div className="card" style={{ textAlign: "center" }}>
        <Icon name="checkThin" />
        <p style={{ fontWeight: 700, color: "var(--brand)", margin: "8px 0 0" }}>Obrigado pela avaliação!</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-h"><Icon name="star" /><h3>Avalie {alvo}</h3></div>
      <div style={{ display: "flex", gap: 6, justifyContent: "center", margin: "8px 0 12px" }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setNota(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            aria-label={`${n} estrela(s)`}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "grid", placeItems: "center" }}
          >
            <svg width={34} height={34} viewBox="0 0 24 24" fill={(hover || nota) >= n ? "#f59e0b" : "var(--line-2)"} aria-hidden>
              <polygon points="12 2 15 9 22 9.3 16.5 14 18.5 21 12 17 5.5 21 7.5 14 2 9.3 9 9" />
            </svg>
          </button>
        ))}
      </div>
      <textarea className="input" rows={2} value={com} onChange={(e) => setCom(e.target.value)} placeholder="Comentário (opcional)" />
      {erro && <div style={{ fontSize: 12.5, color: "var(--warn,#b45309)", marginTop: 6 }}>{erro}</div>}
      <button className="btn btn-primary" style={{ marginTop: 10 }} disabled={enviando || nota < 1} onClick={enviar}>
        <Icon name={enviando ? "spinner" : "star"} /> {enviando ? "Enviando…" : "Enviar avaliação"}
      </button>
    </div>
  );
}
