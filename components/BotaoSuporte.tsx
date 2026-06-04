"use client";

import { useState } from "react";
import { Icon } from "./Icons";

const TIPOS = ["Atraso", "Extravio / não chegou", "Avaria", "Cobrança", "Outro"];

// Botão genérico de suporte. onEnviar devolve "ok" ou um motivo. Serve pras 3 pontas.
export default function BotaoSuporte({ onEnviar }: { onEnviar: (tipo: string, descricao: string) => Promise<string> }) {
  const [aberto, setAberto] = useState(false);
  const [tipo, setTipo] = useState(TIPOS[0]);
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const enviar = async () => {
    setMsg(null);
    if (!desc.trim()) {
      setMsg("Descreva o problema.");
      return;
    }
    setBusy(true);
    const r = await onEnviar(tipo, desc.trim());
    setBusy(false);
    if (r === "ok") {
      setMsg("Chamado aberto. A operação vai te responder.");
      setDesc("");
      setTimeout(() => setAberto(false), 1600);
    } else {
      setMsg("Não foi possível abrir o chamado.");
    }
  };

  if (!aberto)
    return (
      <button className="btn btn-ghost" onClick={() => setAberto(true)}>
        <Icon name="shield" /> Suporte / reportar problema
      </button>
    );

  return (
    <div className="card">
      <div className="card-h">
        <Icon name="shield" />
        <h3>Reportar problema</h3>
      </div>
      <div className="field">
        <label>Tipo</label>
        <select className="input" value={tipo} onChange={(e) => setTipo(e.target.value)}>
          {TIPOS.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>O que aconteceu?</label>
        <input className="input" value={desc} onChange={(e) => setDesc(e.target.value)} />
      </div>
      {msg && <div style={{ fontSize: 12.5, color: msg.includes("aberto") ? "var(--go-dark)" : "var(--warn)", marginBottom: 8, fontWeight: 600 }}>{msg}</div>}
      <div className="btn-row">
        <button className="btn btn-ghost" onClick={() => setAberto(false)}>Cancelar</button>
        <button className="btn btn-primary" disabled={busy} onClick={enviar}>
          <Icon name={busy ? "spinner" : "send"} /> Enviar
        </button>
      </div>
    </div>
  );
}
