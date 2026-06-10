"use client";

import { useEffect, useState } from "react";
import BotaoSuporte from "../BotaoSuporte";
import ChatBox from "../Chat";
import { Icon } from "../Icons";
import MapaAoVivo from "../MapaAoVivo";
import { useChatPublico } from "@/lib/chat";
import { usePosicaoAoVivo } from "@/lib/realtime";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { STEPS, STATUS_STEP } from "@/lib/rota";
import { useSim } from "../useSim";

type Info = {
  status: string;
  entregador_nome: string | null;
  entregador_veiculo: string | null;
  entregador_placa: string | null;
  entregador_rating: number | null;
  codigo_entrega: string | null;
};

const VEIC: Record<string, string> = { moto: "Moto", carro: "Carro", van: "Van" };
function iniciais(nome: string) {
  const p = nome.trim().split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] ?? "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase() || "?";
}

// Cliente final acompanha a entrega pelo link — sem login, só leitura.
// Status e entregador vêm do banco real (get_rastreio_publico, poll 6s); a posição
// no mapa vem do GPS ao vivo (Realtime) com fallback de simulação visual.
export default function RastreioPublico({ token }: { token: string }) {
  const { frac, running, eta, start, setRouteMeta } = useSim();
  const chat = useChatPublico(token);
  const posReal = usePosicaoAoVivo(token);
  const [info, setInfo] = useState<Info | null>(null);

  useEffect(() => {
    const t = setTimeout(() => start(), 900);
    return () => clearTimeout(t);
  }, [start]);

  useEffect(() => {
    let ativo = true;
    const sb = getBrowserSupabase();
    if (!sb) return;
    const buscar = async () => {
      const { data } = await sb.rpc("get_rastreio_publico", { p_token: token });
      const row = (data as Info[] | null)?.[0];
      if (ativo && row) setInfo(row);
    };
    buscar();
    const id = setInterval(buscar, 6000);
    return () => {
      ativo = false;
      clearInterval(id);
    };
  }, [token]);

  const temEntregador = !!info?.entregador_nome;
  const done = info?.status === "entregue";
  const cancelado = info?.status === "cancelado";
  const stepIdx = done ? 4 : info ? STATUS_STEP[info.status] ?? -1 : -1;
  const codigo = info?.codigo_entrega ?? null;
  const titulo = cancelado
    ? "Entrega cancelada"
    : done
    ? "Sua encomenda foi entregue"
    : temEntregador
    ? "Sua encomenda está a caminho"
    : "Procurando um entregador";

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
              <h3>{titulo}</h3>
            </div>

            {temEntregador ? (
              <>
                <div className="driver">
                  <div className="avatar">{iniciais(info!.entregador_nome!)}</div>
                  <div className="driver-info">
                    <div className="name">{info!.entregador_nome}</div>
                    <div className="meta">
                      {VEIC[info!.entregador_veiculo ?? ""] ?? "Veículo"}
                      {info!.entregador_placa ? ` · ${info!.entregador_placa}` : ""}
                      {info!.entregador_rating != null && (
                        <span className="rating">
                          <Icon name="star" /> {Number(info!.entregador_rating).toFixed(1).replace(".", ",")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="verified-badges">
                  <span className="vbadge">
                    <Icon name="shield" /> Antecedentes OK
                  </span>
                  <span className="vbadge">
                    <Icon name="checkThin" /> CNH válida
                  </span>
                </div>
                <div className="trust-banner">
                  <Icon name="shield" />
                  <div>
                    Entregador <b>verificado pela APPDELYVERY</b> — antecedentes e habilitação checados. Você acompanha em
                    tempo real.
                  </div>
                </div>
              </>
            ) : (
              <div className="driver">
                <div className="avatar">
                  <Icon name={cancelado ? "stop" : "refresh"} />
                </div>
                <div className="driver-info">
                  <div className="name">{cancelado ? "Entrega cancelada" : "Procurando entregador…"}</div>
                  <div className="meta">
                    {cancelado ? "Este pedido foi cancelado." : "Assim que um entregador verificado aceitar, ele aparece aqui."}
                  </div>
                </div>
              </div>
            )}
          </div>

          {codigo && temEntregador && !done && (
            <div className="card" style={{ textAlign: "center", background: "linear-gradient(160deg,#fff,var(--brand-light))", border: "1px solid #dfe3ff" }}>
              <div style={{ fontSize: 11.5, fontWeight: 800, color: "var(--brand)", textTransform: "uppercase", letterSpacing: ".6px" }}>
                Código de entrega
              </div>
              <div style={{ fontSize: 38, fontWeight: 900, letterSpacing: 10, color: "var(--ink)", margin: "6px 0 2px" }}>{codigo}</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>Informe ao entregador na hora de receber — sem o código, ele não fecha a entrega.</div>
            </div>
          )}

          {temEntregador && !done && (
            <div className="card">
              <div className="card-h">
                <Icon name="clock" />
                <h3>Chega em</h3>
              </div>
              <div className="eta-row">
                <div className="eta-box">
                  <div className="big">{eta.min}</div>
                  <div className="lbl">minutos</div>
                </div>
                <div className="eta-box">
                  <div className="big">{eta.km.replace(".", ",")}</div>
                  <div className="lbl">km restantes</div>
                </div>
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>Estimativa pela rota.</div>
            </div>
          )}

          <div className="card">
            <div className="card-h">
              <Icon name="list" />
              <h3>Status</h3>
            </div>
            <div className="timeline">
              {STEPS.map((st, i) => {
                const cls = i < stepIdx ? "done" : i === stepIdx ? (done ? "done" : "active") : "pending";
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
          <ChatBox msgs={chat.msgs} enviar={chat.enviar} meuPapel="cliente_final" titulo="Fale com o entregador" />

          <BotaoSuporte
            onEnviar={async (t, d) => {
              const sb = getBrowserSupabase();
              if (!sb) return "sem-backend";
              const { data } = await sb.rpc("abrir_disputa_rastreio", { p_token: token, p_tipo: t, p_descricao: d });
              return data === "ok" ? "ok" : String(data);
            }}
          />

          <p className="hint">
            Você está acompanhando como cliente final. Link seguro, sem login —
            <br />
            válido só para esta entrega.
          </p>
        </div>

        <MapaAoVivo
          frac={frac}
          running={running && temEntregador}
          done={done}
          eta={eta}
          onRouteMeta={setRouteMeta}
          idleLabel={temEntregador ? "Localizando entregador…" : "Aguardando um entregador aceitar…"}
          posicaoReal={posReal}
        />
      </div>
    </div>
  );
}
