"use client";

import { useEffect } from "react";
import { Icon } from "../Icons";
import MapaAoVivo from "../MapaAoVivo";
import { STEPS } from "@/lib/rota";
import { useSim } from "../useSim";

// Cliente final acompanha a entrega pelo link — sem login, só leitura.
// Hoje a posição roda em simulação; no real virá do Supabase Realtime via getRastreioPublico(token).
export default function RastreioPublico({ token }: { token: string }) {
  const { frac, step, running, done, eta, start, setRouteMeta } = useSim();

  useEffect(() => {
    const t = setTimeout(() => start(), 900);
    return () => clearTimeout(t);
  }, [start]);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <header className="topbar">
        <div className="sb-logo" style={{ border: "none", margin: 0, padding: 0 }}>
          <div className="mark">
            <Icon name="moto" />
          </div>
          <div>
            <div className="name">
              <b>APP</b>
              <span>DELYVERY</span>
            </div>
            <div className="sub">Acompanhe sua entrega</div>
          </div>
        </div>
        <div className="right">
          <span className="demo-tag" style={{ color: "var(--go)", background: "var(--go-bg)" }}>
            <Icon name="pin" /> #{token.slice(0, 6)}
          </span>
        </div>
      </header>

      <div className="content">
        <div className="panel">
          <div className="card">
            <div className="card-h">
              <Icon name="moto" />
              <h3>{done ? "Sua encomenda foi entregue" : "Sua encomenda está a caminho"}</h3>
            </div>
            <div className="driver">
              <div className="avatar">LM</div>
              <div className="driver-info">
                <div className="name">Lucas Mendes</div>
                <div className="meta">
                  Honda CG 160 · ABC-1D23{" "}
                  <span className="rating">
                    <Icon name="star" /> 4,9
                  </span>
                </div>
              </div>
            </div>
            <div className="verified-badges">
              <span className="vbadge">
                <Icon name="shield" /> Antecedentes OK
              </span>
              <span className="vbadge">
                <Icon name="checkThin" /> CNH válida (A)
              </span>
            </div>
            <div className="trust-banner">
              <Icon name="shield" />
              <div>
                Entregador <b>verificado pela APPDELYVERY</b> — antecedentes e habilitação checados. Você acompanha em
                tempo real.
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-h">
              <Icon name="clock" />
              <h3>Chega em</h3>
            </div>
            <div className="eta-row">
              <div className="eta-box">
                <div className="big">{done ? 0 : eta.min}</div>
                <div className="lbl">minutos</div>
              </div>
              <div className="eta-box">
                <div className="big">{done ? "0,0" : eta.km.replace(".", ",")}</div>
                <div className="lbl">km restantes</div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-h">
              <Icon name="list" />
              <h3>Status</h3>
            </div>
            <div className="timeline">
              {STEPS.map((st, i) => {
                const cls = i < step ? "done" : i === step ? (done ? "done" : "active") : "pending";
                return (
                  <div className={`step ${cls}`} key={st.t}>
                    <div className="dot">
                      <Icon name="checkThin" />
                    </div>
                    <div className="step-txt">
                      <div className="t">{st.t}</div>
                      <div className="s">{st.s}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <p className="hint">
            Você está acompanhando como cliente final. Link seguro, sem login —
            <br />
            válido só para esta entrega.
          </p>
        </div>

        <MapaAoVivo frac={frac} running={running} done={done} eta={eta} onRouteMeta={setRouteMeta} idleLabel="Localizando entregador…" />
      </div>
    </div>
  );
}
