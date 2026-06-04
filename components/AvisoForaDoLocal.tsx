"use client";

import { Icon } from "./Icons";

// Modal anti-fraude (padrão 99, T26): o GPS indica que o entregador NÃO está no
// ponto. Pede confirmação consciente antes de registrar chegada/coleta/entrega.
export default function AvisoForaDoLocal({
  distancia,
  acao = "registrar a chegada",
  onConfirmar,
  onCancelar,
}: {
  distancia: number; // metros
  acao?: string;
  onConfirmar: () => void;
  onCancelar: () => void;
}) {
  const dist = distancia >= 1000 ? `${(distancia / 1000).toFixed(1)} km` : `${Math.round(distancia)} m`;
  return (
    <>
      <div onClick={onCancelar} style={{ position: "fixed", inset: 0, background: "rgba(13,20,36,.45)", zIndex: 300 }} />
      <div style={{ position: "fixed", left: 16, right: 16, bottom: 16, maxWidth: 460, margin: "0 auto", background: "var(--bg)", borderRadius: 18, boxShadow: "var(--shadow-lg)", zIndex: 301, padding: 20 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
          <span style={{ width: 34, height: 34, borderRadius: 10, background: "var(--warn-bg)", display: "grid", placeItems: "center", color: "var(--warn)" }}><Icon name="pin" /></span>
          <div style={{ fontSize: 16, fontWeight: 800 }}>Você está no local?</div>
        </div>
        <div style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.55, marginBottom: 16 }}>
          O GPS indica que você está a <b>{dist}</b> do ponto. Se {acao} agora e a entrega for contestada, isso fica registrado. Chegue mais perto ou confirme se tem certeza.
        </div>
        <button className="btn btn-go" onClick={onConfirmar} style={{ marginBottom: 9 }}>Estou no local, confirmar</button>
        <button className="btn btn-ghost" onClick={onCancelar}>Voltar</button>
      </div>
    </>
  );
}
