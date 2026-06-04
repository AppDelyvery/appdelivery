"use client";

import { useState } from "react";
import { Icon } from "./Icons";

// Cancelamento com motivo obrigatório (padrão 99 T29), adaptado ao B2B de encomenda.
const MOTIVOS_ENTREGADOR = [
  "Loja não tinha a encomenda pronta",
  "Endereço de coleta errado",
  "Endereço de entrega errado",
  "Cliente não atende / não localizado",
  "Área de risco",
  "Problema no veículo",
  "Outro",
];

export default function CancelarCorrida({
  onConfirmar,
  onFechar,
  motivos = MOTIVOS_ENTREGADOR,
  titulo = "Cancelar entrega",
}: {
  onConfirmar: (motivo: string) => void | Promise<void>;
  onFechar: () => void;
  motivos?: string[];
  titulo?: string;
}) {
  const MOTIVOS = motivos;
  const [sel, setSel] = useState<string | null>(null);
  const [outro, setOutro] = useState("");
  const [busy, setBusy] = useState(false);

  const motivoFinal = sel === "Outro" ? outro.trim() : sel;
  const pode = !!motivoFinal && !busy;

  const enviar = async () => {
    if (!motivoFinal) return;
    setBusy(true);
    await onConfirmar(motivoFinal);
    setBusy(false);
  };

  return (
    <>
      <div onClick={onFechar} style={{ position: "fixed", inset: 0, background: "rgba(13,20,36,.45)", zIndex: 300 }} />
      <div style={{ position: "fixed", left: 16, right: 16, bottom: 16, maxWidth: 460, margin: "0 auto", background: "var(--bg)", borderRadius: 18, boxShadow: "var(--shadow-lg)", zIndex: 301, padding: 20, maxHeight: "80vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>{titulo}</div>
          <button className="btn btn-ghost" style={{ width: "auto", padding: "6px 11px" }} onClick={onFechar}><Icon name="stop" /></button>
        </div>
        <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 12 }}>Conte o motivo — fica registrado pra operação.</div>

        {MOTIVOS.map((m) => (
          <button key={m} onClick={() => setSel(m)} className="sb-item" style={{ width: "100%", justifyContent: "space-between", border: "1px solid var(--line)", marginBottom: 7, background: sel === m ? "var(--brand-light)" : "#fff", color: sel === m ? "var(--brand)" : "var(--ink-2)" }}>
            <span>{m}</span>
            {sel === m && <Icon name="checkThin" />}
          </button>
        ))}

        {sel === "Outro" && (
          <input className="input" placeholder="Descreva o motivo" value={outro} onChange={(e) => setOutro(e.target.value)} style={{ margin: "4px 0 10px" }} />
        )}

        <button className="btn btn-go" disabled={!pode} onClick={enviar} style={{ marginTop: 8 }}>
          {busy ? "Cancelando…" : "Confirmar cancelamento"}
        </button>
      </div>
    </>
  );
}
