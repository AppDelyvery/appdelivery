"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import EntregadorShell from "./EntregadorShell";
import { Icon } from "../Icons";

// Preferências locais do entregador (navegação + notificações). Guardadas no aparelho;
// quando o push real ligar, a preferência de notificação já fica respeitada.
export default function ConfigEntregador() {
  const [nav, setNav] = useState<"waze" | "google">("google");
  const [somCorrida, setSomCorrida] = useState(true);

  useEffect(() => {
    const n = localStorage.getItem("nav_pref");
    if (n === "waze" || n === "google") setNav(n);
    setSomCorrida(localStorage.getItem("som_corrida") !== "0");
  }, []);

  function setNavPref(v: "waze" | "google") {
    setNav(v);
    localStorage.setItem("nav_pref", v);
  }
  function toggleSom() {
    const v = !somCorrida;
    setSomCorrida(v);
    localStorage.setItem("som_corrida", v ? "1" : "0");
  }

  const opt = (v: "waze" | "google", label: string) => (
    <button
      onClick={() => setNavPref(v)}
      className="btn"
      style={{ width: "auto", padding: "8px 16px", fontWeight: 700, border: nav === v ? "2px solid var(--brand)" : "1px solid var(--line)", background: nav === v ? "var(--brand-light,#eef0fe)" : "#fff", color: nav === v ? "var(--brand)" : "var(--ink-2)" }}
    >
      {nav === v && <Icon name="checkThin" />} {label}
    </button>
  );

  return (
    <EntregadorShell title="Configurações">
      <div className="card">
        <div className="card-h"><Icon name="pin" /><h3>Navegação</h3></div>
        <p className="hint" style={{ marginTop: 0 }}>Qual app abrir pra traçar a rota até a coleta/entrega.</p>
        <div style={{ display: "flex", gap: 10 }}>{opt("google", "Google Maps")}{opt("waze", "Waze")}</div>
      </div>

      <div className="card">
        <div className="card-h"><Icon name="bolt" /><h3>Notificações</h3></div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--navy,#1b2147)" }}>Som de nova corrida</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>Toca um alerta quando chega uma oferta.</div>
          </div>
          <button onClick={toggleSom} aria-label="Som de nova corrida" style={{ width: 46, height: 26, borderRadius: 999, border: "none", cursor: "pointer", background: somCorrida ? "var(--brand)" : "#cbd0e6", position: "relative", flexShrink: 0 }}>
            <span style={{ position: "absolute", top: 3, left: somCorrida ? 23 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left .15s" }} />
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-h"><Icon name="shield" /><h3>Privacidade e dados</h3></div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Link href="/privacidade" style={{ fontSize: 13, color: "var(--brand)", fontWeight: 600, padding: "8px 0", borderBottom: "1px solid var(--line)" }}>Política de privacidade</Link>
          <Link href="/termos" style={{ fontSize: 13, color: "var(--brand)", fontWeight: 600, padding: "8px 0", borderBottom: "1px solid var(--line)" }}>Termos de uso</Link>
          <Link href="/entregador/ajuda" style={{ fontSize: 13, color: "#be123c", fontWeight: 600, padding: "8px 0" }}>Solicitar exclusão da conta (LGPD)</Link>
        </div>
        <p className="hint">Seus dados de antecedentes são sigilosos — só a administração tem acesso, nunca o negócio nem o cliente.</p>
      </div>

      <div className="card">
        <div className="card-h"><Icon name="moto" /><h3>Sobre</h3></div>
        <div style={{ fontSize: 12.5, color: "var(--ink-2)" }}>APPDELYVERY · Entregador verificado · Palmas-TO</div>
      </div>
    </EntregadorShell>
  );
}
