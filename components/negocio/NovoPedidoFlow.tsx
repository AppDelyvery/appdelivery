"use client";

import { useEffect, useState } from "react";
import AppShell, { type ShellNavGroup } from "../AppShell";
import ChatBox from "../Chat";
import { Icon } from "../Icons";
import MapaAoVivo from "../MapaAoVivo";
import { useChatAuth } from "@/lib/chat";
import { usePosicaoAoVivo } from "@/lib/realtime";
import { criarPedido } from "@/actions/criarPedido";
import { hasSupabase } from "@/lib/integracoes";
import { money, PRICE, priceCalc } from "@/lib/precos";
import { DESTINO, ORIGEM, STEPS } from "@/lib/rota";
import { useEntrega, type NegocioView } from "./EntregaContext";

const MOTIVO: Record<string, string> = {
  "supabase-nao-configurado": "Backend não configurado.",
  "nao-autenticado": "Faça login para criar pedidos.",
  "estabelecimento-nao-encontrado": "Conta sem estabelecimento. Refaça o cadastro.",
  "nao-confirmado-na-fonte": "O pedido não confirmou no banco. Tente de novo.",
};
const traduzMotivo = (m: string) => MOTIVO[m] ?? `Falha ao criar o pedido (${m}).`;

const km1 = (n: number) => n.toFixed(1).replace(".", ",");

const TITLES: Record<NegocioView, string> = {
  form: "Nova entrega",
  matching: "Buscando entregador",
  tracking: "Entrega em andamento",
  done: "Entrega concluída",
};

export default function NovoPedidoFlow() {
  const { view, setView, frac, running, done, eta, setRouteMeta, pedido } = useEntrega();
  const posReal = usePosicaoAoVivo(pedido?.token ?? null);
  const emAndamento = (["matching", "tracking", "done"] as NegocioView[]).includes(view);

  const nav: ShellNavGroup[] = [
    {
      group: "Operação",
      items: [
        { ic: "send", label: "Nova entrega", active: view === "form", onClick: () => setView("form") },
        { ic: "moto", label: "Em andamento", active: emAndamento, onClick: () => setView("tracking"), disabled: !emAndamento },
        { ic: "list", label: "Histórico", badge: "em breve", disabled: true },
      ],
    },
    {
      group: "Conta",
      items: [
        { ic: "money", label: "Carteira", badge: "em breve", disabled: true },
        { ic: "building", label: "Meu negócio", badge: "em breve", disabled: true },
      ],
    },
  ];

  return (
    <AppShell title={TITLES[view]} nav={nav} demo="negocio">
      <div className="panel">
        {view === "form" && <FormScreen />}
        {view === "matching" && <MatchingScreen />}
        {view === "tracking" && <TrackingScreen />}
        {view === "done" && <DoneScreen />}
      </div>
      <MapaAoVivo frac={frac} running={running} done={done} eta={eta} onRouteMeta={setRouteMeta} posicaoReal={posReal} />
    </AppShell>
  );
}

function FormScreen() {
  const { veh, setVeh, distKm, durMin, setView, setPedido } = useEntrega();
  const pc = priceCalc(veh, distKm);
  const [conteudo, setConteudo] = useState("Documentos + 1 par de óculos");
  const [valor, setValor] = useState("R$ 350,00");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function solicitar() {
    setErro(null);
    // Sem backend configurado → mantém a simulação (demo).
    if (!hasSupabase()) {
      setView("matching");
      return;
    }
    setEnviando(true);
    try {
      const valorNum = Number(valor.replace(/[^\d,]/g, "").replace(",", ".")) || undefined;
      const r = await criarPedido({
        coletaEndereco: `${ORIGEM.nome} — ${ORIGEM.end}`,
        coletaLat: ORIGEM.lat,
        coletaLng: ORIGEM.lng,
        entregaEndereco: `${DESTINO.nome} — ${DESTINO.end}`,
        entregaLat: DESTINO.lat,
        entregaLng: DESTINO.lng,
        veiculo: veh,
        conteudo,
        valorDeclarado: valorNum,
        distanciaKm: distKm,
        duracaoMin: durMin,
      });
      if (!r.ok) {
        setErro(traduzMotivo(r.motivo));
        return;
      }
      setPedido({ id: r.pedidoId, token: r.trackingToken });
      setView("matching");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao criar o pedido.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <div className="card">
        <div className="card-h">
          <Icon name="send" />
          <h3>Solicitar entrega</h3>
        </div>
        <div className="field">
          <label>Local de coleta</label>
          <div className="with-icon">
            <Icon name="pin" />
            <input className="input" defaultValue="Ótica Visão Center — Q.104 Norte" />
          </div>
        </div>
        <div className="field">
          <label>Local de entrega</label>
          <div className="with-icon">
            <Icon name="pin" />
            <input className="input" defaultValue="Andrade Contabilidade — Q.304 Sul" />
          </div>
        </div>
        <div className="field">
          <label>Tipo de veículo</label>
          <div className="veh-toggle">
            <div className={`veh-opt${veh === "moto" ? " sel" : ""}`} onClick={() => setVeh("moto")}>
              <Icon name="moto" />
              <span className="vl">Moto</span>
            </div>
            <div className={`veh-opt${veh === "carro" ? " sel" : ""}`} onClick={() => setVeh("carro")}>
              <Icon name="car" />
              <span className="vl">Carro</span>
            </div>
            <div className={`veh-opt${veh === "van" ? " sel" : ""}`} onClick={() => setVeh("van")}>
              <Icon name="van" />
              <span className="vl">Van</span>
            </div>
          </div>
        </div>
        <div className="field">
          <label>O que será enviado</label>
          <input className="input" value={conteudo} onChange={(e) => setConteudo(e.target.value)} />
        </div>
        <div className="field">
          <label>Valor declarado da encomenda</label>
          <div className="with-icon">
            <Icon name="money" />
            <input className="input" value={valor} onChange={(e) => setValor(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-h">
          <Icon name="money" />
          <h3>Valor da entrega</h3>
          <span className="right">cálculo automático</span>
        </div>
        <div className="price-line">
          <span>Bandeirada + coleta ({veh})</span>
          <span>{money(pc.base)}</span>
        </div>
        <div className="price-line">
          <span>
            Distância · {km1(distKm)} km × {money(PRICE.perKm)}
          </span>
          <span>{money(pc.dist)}</span>
        </div>
        <div className="price-line">
          <span>Pontos adicionais</span>
          <span>R$ 0,00</span>
        </div>
        {pc.aplicouMin && (
          <div className="price-line">
            <span>Valor mínimo da corrida</span>
            <span>{money(PRICE.min)}</span>
          </div>
        )}
        <div className="price-line total">
          <span>Total</span>
          <span>{money(pc.total)}</span>
        </div>
        <div className="price-sub">
          ~{durMin} min · rota real Mapbox · entregador recebe {money(pc.driver)} ({PRICE.driverPct * 100}%)
        </div>
      </div>

      {erro && (
        <div className="trust-banner" style={{ background: "var(--warn-bg)", borderColor: "#f3d6a8", color: "var(--warn)", marginBottom: 12 }}>
          <Icon name="shield" />
          <div>{erro}</div>
        </div>
      )}
      <button className="btn btn-primary" onClick={solicitar} disabled={enviando}>
        <Icon name={enviando ? "spinner" : "send"} /> {enviando ? "Criando pedido…" : "Solicitar entrega"}
      </button>
      <p className="hint">
        O preço é calculado pela fórmula km + coleta + paradas,
        <br />
        igual aos grandes players — só que aqui com entregador verificado.
      </p>
    </>
  );
}

function MatchingScreen() {
  const { setView, start } = useEntrega();
  useEffect(() => {
    const t = setTimeout(() => {
      setView("tracking");
      start();
    }, 2300);
    return () => clearTimeout(t);
  }, [setView, start]);

  return (
    <>
      <div className="card" style={{ textAlign: "center" }}>
        <div className="radar-wrap">
          <div className="radar">
            <div className="rc">
              <Icon name="moto" />
            </div>
          </div>
        </div>
        <div style={{ fontSize: 16, fontWeight: 800, marginTop: 14, letterSpacing: "-.3px" }}>
          Procurando entregador
        </div>
        <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
          Buscando o verificado mais próximo da coleta…
        </div>
        <div className="vbadge" style={{ margin: "14px auto 0", width: "max-content" }}>
          <Icon name="shield" /> só entregadores com antecedentes OK
        </div>
      </div>
      <p className="hint">
        Matching por proximidade (PostGIS): o sistema acha quem
        <br />
        está mais perto e online, e oferta a corrida.
      </p>
    </>
  );
}

function TrackingScreen() {
  const { step, done, running, eta, start, reset, setView, pedido, setPedido } = useEntrega();
  const chat = useChatAuth(pedido?.id ?? null, "estabelecimento");
  return (
    <>
      <div className="card">
        <div className="card-h">
          <Icon name="moto" />
          <h3>Entrega {done ? "concluída" : "em andamento"}</h3>
          <span className="right">#{pedido ? pedido.id.slice(0, 8) : "4821"}</span>
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
          <span className="vbadge">
            <Icon name="checkThin" /> Identidade
          </span>
        </div>
        <div className="trust-banner">
          <Icon name="shield" />
          <div>
            Entregador <b>verificado pela APPDELYVERY</b> — antecedentes criminais e habilitação checados.
          </div>
        </div>
      </div>

      {pedido && (
        <div className="card">
          <div className="card-h">
            <Icon name="pin" />
            <h3>Link de rastreio do cliente</h3>
          </div>
          <a
            href={`/rastreio/${pedido.token}`}
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: 12.5, fontWeight: 600, color: "var(--brand)", wordBreak: "break-all" }}
          >
            /rastreio/{pedido.token}
          </a>
          <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 4 }}>
            Enviado ao cliente final por SMS/WhatsApp — ele acompanha sem instalar app.
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-h">
          <Icon name="clock" />
          <h3>Tempo estimado</h3>
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
          <h3>Status da entrega</h3>
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

      {pedido && <ChatBox msgs={chat.msgs} enviar={chat.enviar} meuPapel="estabelecimento" />}

      {running ? (
        <button
          className="btn btn-ghost"
          onClick={() => {
            reset();
            setPedido(null);
            setView("form");
          }}
        >
          <Icon name="stop" /> Encerrar simulação
        </button>
      ) : done ? (
        <button className="btn btn-go" onClick={() => setView("done")}>
          <Icon name="arrow" /> Ver comprovante
        </button>
      ) : (
        <button className="btn btn-primary" onClick={() => start()}>
          <Icon name="play" /> Simular entrega ao vivo
        </button>
      )}
    </>
  );
}

function DoneScreen() {
  const { veh, distKm, reset, setView, setPedido } = useEntrega();
  const pc = priceCalc(veh, distKm);
  return (
    <>
      <div className="card">
        <div className="done-hero">
          <div className="circle">
            <Icon name="check" />
          </div>
          <div className="t">Entrega concluída</div>
          <div className="s">#4821 · entregue por Lucas Mendes · 22 min</div>
        </div>
      </div>

      <div className="card">
        <div className="card-h">
          <Icon name="camera" />
          <h3>Comprovante de entrega</h3>
        </div>
        <div className="photo">
          <Icon name="pkg" className="pkg" />
          <div className="geo">
            <Icon name="pin" /> {DESTINO.end} · {DESTINO.lat}, {DESTINO.lng} · 23:58
          </div>
        </div>
        <div style={{ marginTop: 12, fontSize: 11.5, fontWeight: 700, color: "var(--ink-2)" }}>
          Assinatura do destinatário
        </div>
        <div style={{ border: "1px solid var(--line)", borderRadius: 10, marginTop: 6, background: "#fbfcfe", padding: 6 }}>
          <div style={{ height: 70, display: "grid", placeItems: "center", color: "var(--faint)", fontSize: 12 }}>
            assinado na entrega
          </div>
        </div>
      </div>

      <div className="card">
        <div className="price-line total" style={{ border: "none", margin: 0, padding: 0 }}>
          <span>Total pago</span>
          <span>{money(pc.total)}</span>
        </div>
      </div>

      <button
        className="btn btn-primary"
        onClick={() => {
          reset();
          setPedido(null);
          setView("form");
        }}
      >
        <Icon name="refresh" /> Nova entrega
      </button>
      <p className="hint">
        Foto geolocalizada + assinatura = trilha de auditoria.
        <br />É a prova jurídica que protege a plataforma e o cliente.
      </p>
    </>
  );
}
