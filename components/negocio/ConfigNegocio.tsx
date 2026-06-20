"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import NegocioShell from "./NegocioShell";
import { Icon } from "../Icons";

// Preferências locais do negócio (notificações). Guardadas no aparelho.
export default function ConfigNegocio() {
  const [statusEntrega, setStatusEntrega] = useState(true);
  const [novoComunicado, setNovoComunicado] = useState(true);

  useEffect(() => {
    setStatusEntrega(localStorage.getItem("notif_status") !== "0");
    setNovoComunicado(localStorage.getItem("notif_comunicado") !== "0");
  }, []);

  const toggle = (key: string, val: boolean, set: (v: boolean) => void) => {
    const v = !val;
    set(v);
    localStorage.setItem(key, v ? "1" : "0");
  };

  const Switch = ({ on, onClick }: { on: boolean; onClick: () => void }) => (
    <button onClick={onClick} aria-label="Alternar" style={{ width: 46, height: 26, borderRadius: 999, border: "none", cursor: "pointer", background: on ? "var(--brand)" : "#cbd0e6", position: "relative", flexShrink: 0 }}>
      <span style={{ position: "absolute", top: 3, left: on ? 23 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left .15s" }} />
    </button>
  );

  const linha = (titulo: string, sub: string, on: boolean, onClick: () => void) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "8px 0" }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--navy,#1b2147)" }}>{titulo}</div>
        <div style={{ fontSize: 12, color: "var(--muted)" }}>{sub}</div>
      </div>
      <Switch on={on} onClick={onClick} />
    </div>
  );

  return (
    <NegocioShell title="Configurações">
      <div className="card">
        <div className="card-h"><Icon name="bolt" /><h3>Notificações</h3></div>
        {linha("Status das entregas", "Avisa quando a entrega muda de status.", statusEntrega, () => toggle("notif_status", statusEntrega, setStatusEntrega))}
        {linha("Comunicados da plataforma", "Avisos e novidades da administração.", novoComunicado, () => toggle("notif_comunicado", novoComunicado, setNovoComunicado))}
      </div>

      <div className="card">
        <div className="card-h"><Icon name="shield" /><h3>Privacidade e dados</h3></div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Link href="/privacidade" style={{ fontSize: 13, color: "var(--brand)", fontWeight: 600, padding: "8px 0", borderBottom: "1px solid var(--line)" }}>Política de privacidade</Link>
          <Link href="/termos" style={{ fontSize: 13, color: "var(--brand)", fontWeight: 600, padding: "8px 0", borderBottom: "1px solid var(--line)" }}>Termos de uso</Link>
          <Link href="/negocio/ajuda" style={{ fontSize: 13, color: "#be123c", fontWeight: 600, padding: "8px 0" }}>Solicitar exclusão da conta (LGPD)</Link>
        </div>
      </div>

      <div className="card">
        <div className="card-h"><Icon name="moto" /><h3>Sobre</h3></div>
        <div style={{ fontSize: 12.5, color: "var(--ink-2)" }}>APPDELYVERY · Entrega B2B verificada · Palmas-TO</div>
      </div>
    </NegocioShell>
  );
}
