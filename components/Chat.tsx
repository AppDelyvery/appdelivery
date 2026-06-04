"use client";

import { useState } from "react";
import { Icon } from "./Icons";
import type { Msg, Papel } from "@/lib/chat";

const ROTULO: Record<string, string> = {
  estabelecimento: "Loja",
  entregador: "Entregador",
  cliente_final: "Cliente",
  suporte: "Suporte",
};

export default function ChatBox({
  msgs,
  enviar,
  meuPapel,
  titulo = "Conversa da entrega",
}: {
  msgs: Msg[];
  enviar: (texto: string) => void | Promise<void>;
  meuPapel: Papel;
  titulo?: string;
}) {
  const [texto, setTexto] = useState("");

  const submeter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!texto.trim()) return;
    void enviar(texto);
    setTexto("");
  };

  return (
    <div className="card">
      <div className="card-h">
        <Icon name="send" />
        <h3>{titulo}</h3>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 240, overflowY: "auto", marginBottom: 12 }}>
        {msgs.length === 0 && (
          <div style={{ fontSize: 12.5, color: "var(--faint)", textAlign: "center", padding: "10px 0" }}>
            Combine a coleta/entrega por aqui — loja, entregador e cliente na mesma conversa.
          </div>
        )}
        {msgs.map((m, i) => {
          const meu = m.autor_papel === meuPapel;
          return (
            <div key={i} style={{ display: "flex", justifyContent: meu ? "flex-end" : "flex-start" }}>
              <div
                style={{
                  maxWidth: "78%",
                  background: meu ? "var(--brand)" : "#fff",
                  color: meu ? "#fff" : "var(--ink)",
                  border: meu ? "none" : "1px solid var(--line)",
                  borderRadius: 12,
                  padding: "8px 11px",
                }}
              >
                {!meu && (
                  <div style={{ fontSize: 10, fontWeight: 800, color: "var(--brand)", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 2 }}>
                    {ROTULO[m.autor_papel] ?? m.autor_papel}
                  </div>
                )}
                <div style={{ fontSize: 13.5, lineHeight: 1.4 }}>{m.texto}</div>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={submeter} style={{ display: "flex", gap: 8 }}>
        <input
          className="input"
          placeholder="Escreva uma mensagem…"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
        <button className="btn btn-primary" type="submit" style={{ width: "auto", padding: "0 16px" }} aria-label="Enviar">
          <Icon name="send" />
        </button>
      </form>
    </div>
  );
}
