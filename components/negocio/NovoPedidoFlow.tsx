"use client";

import { useEffect, useState } from "react";
import AppShell, { type ShellNavGroup } from "../AppShell";
import BotaoSuporte from "../BotaoSuporte";
import SlideConfirm from "../SlideConfirm";
import CancelarCorrida from "../CancelarCorrida";
import AddressAutocomplete, { type Lugar } from "../AddressAutocomplete";
import ChatBox from "../Chat";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { useTetoProtecao } from "@/lib/protecao";
import { Icon } from "../Icons";
import MapaAoVivo from "../MapaAoVivo";
import { useChatAuth } from "@/lib/chat";
import { usePosicaoAoVivo } from "@/lib/realtime";
import { criarPedido } from "@/actions/criarPedido";
import { abrirDisputa } from "@/actions/disputas";
import { hasSupabase } from "@/lib/integracoes";
import { money, PRICE, priceCalc, faixaDoVeiculo, VEICULOS } from "@/lib/precos";
import { DESTINO, ORIGEM, STEPS } from "@/lib/rota";
import { fetchDirections } from "@/lib/mapbox";
import { useEntrega, type NegocioView } from "./EntregaContext";

const MOTIVO: Record<string, string> = {
  "supabase-nao-configurado": "Backend não configurado.",
  "nao-autenticado": "Faça login para criar pedidos.",
  "estabelecimento-nao-encontrado": "Conta sem estabelecimento. Refaça o cadastro.",
  "nao-confirmado-na-fonte": "O pedido não confirmou no banco. Tente de novo.",
  "saldo-insuficiente": "Saldo insuficiente na carteira. Recarregue para criar a entrega.",
  "negocio-suspenso": "Sua conta está suspensa. Fale com o suporte.",
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
        { ic: "list", label: "Histórico", href: "/negocio/historico" },
      ],
    },
    { group: "Avisos", items: [{ ic: "send", label: "Comunicados", href: "/negocio/comunicados" }] },
    {
      group: "Conta",
      items: [
        { ic: "money", label: "Carteira", href: "/negocio/carteira" },
        { ic: "building", label: "Meu negócio", href: "/negocio/perfil" },
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
  const teto = useTetoProtecao();
  const [coleta, setColeta] = useState<Lugar | null>(null);
  const [entrega, setEntrega] = useState<Lugar | null>(null);
  const [rota, setRota] = useState<{ distKm: number; durMin: number } | null>(null);
  const [conteudo, setConteudo] = useState("");
  const [valor, setValor] = useState("");
  const [retornar, setRetornar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // distância/preço a partir dos endereços REAIS escolhidos (fallback = simulação demo)
  useEffect(() => {
    if (!coleta || !entrega) { setRota(null); return; }
    let vivo = true;
    (async () => {
      const r = await fetchDirections([coleta.lng, coleta.lat], [entrega.lng, entrega.lat]);
      if (vivo && r) setRota({ distKm: r.distKm, durMin: r.durMin });
    })();
    return () => { vivo = false; };
  }, [coleta, entrega]);

  const distReal = rota?.distKm ?? distKm;
  const durReal = rota?.durMin ?? durMin;
  const pc = priceCalc(veh, distReal);
  const prontoBackend = hasSupabase();
  const podeEnviar = !prontoBackend || (!!coleta && !!entrega);

  async function solicitar() {
    setErro(null);
    // Sem backend configurado → mantém a simulação (demo).
    if (!prontoBackend) {
      setView("matching");
      return;
    }
    if (!coleta || !entrega) {
      setErro("Escolha o endereço de coleta e de entrega na lista de sugestões.");
      return;
    }
    setEnviando(true);
    try {
      const valorNum = Number(valor.replace(/[^\d,]/g, "").replace(",", ".")) || undefined;
      const r = await criarPedido({
        coletaEndereco: coleta.endereco,
        coletaLat: coleta.lat,
        coletaLng: coleta.lng,
        entregaEndereco: entrega.endereco,
        entregaLat: entrega.lat,
        entregaLng: entrega.lng,
        veiculo: veh,
        conteudo: conteudo || undefined,
        valorDeclarado: valorNum,
        distanciaKm: distReal,
        duracaoMin: durReal,
        retornar,
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
        <AddressAutocomplete label="Local de coleta" valor={coleta} onSelecionar={setColeta} placeholder="Ex.: Ótica Visão Center, Q.104 Norte" />
        <AddressAutocomplete label="Local de entrega" valor={entrega} onSelecionar={setEntrega} placeholder="Ex.: Arse 122, Plano Diretor Sul" />
        <div className="field">
          <label>O que será enviado</label>
          <input className="input" value={conteudo} placeholder="Ex.: Documentos, 1 par de óculos" onChange={(e) => setConteudo(e.target.value)} />
        </div>
        <div className="field">
          <label>Valor declarado da encomenda</label>
          <div className="with-icon">
            <Icon name="money" />
            <input className="input" value={valor} placeholder="R$ 0,00" onChange={(e) => setValor(e.target.value)} />
          </div>
        </div>
        <button type="button" className="opt-row" onClick={() => setRetornar((r) => !r)}>
          <div className="opt-txt">
            <div className="opt-t">Entregador retorna à loja</div>
            <div className="opt-s">Se o cliente não receber, a encomenda volta pra você</div>
          </div>
          <span className={`opt-switch${retornar ? " on" : ""}`}><span className="opt-knob" /></span>
        </button>
      </div>

      <div className="card">
        <div className="card-h">
          <Icon name="moto" />
          <h3>Escolha o veículo</h3>
          <span className="right">{km1(distReal)} km</span>
        </div>
        {VEICULOS.map((v) => {
          const p = priceCalc(v.id, distReal);
          return (
            <button key={v.id} type="button" className={`veh-card${veh === v.id ? " sel" : ""}`} onClick={() => setVeh(v.id)}>
              <span className="veh-ic"><Icon name={v.id === "carro" ? "car" : v.id === "van" ? "van" : "moto"} /></span>
              <span className="veh-meta">
                <span className="veh-n">{v.nome}</span>
                <span className="veh-d">{v.desc}</span>
              </span>
              <span className="veh-p">{money(p.total)}</span>
            </button>
          );
        })}
      </div>

      <div className="card">
        <div className="card-h">
          <Icon name="money" />
          <h3>Detalhe do {VEICULOS.find((v) => v.id === veh)?.nome}</h3>
        </div>
        <div className="price-line">
          <span>Bandeirada</span>
          <span>{money(faixaDoVeiculo(veh).base)}</span>
        </div>
        <div className="price-line">
          <span>Distância · {km1(distReal)} km × {money(faixaDoVeiculo(veh).perKm)}</span>
          <span>{money(pc.dist)}</span>
        </div>
        {pc.aplicouMin && (
          <div className="price-line">
            <span>Valor mínimo ({VEICULOS.find((v) => v.id === veh)?.nome})</span>
            <span>{money(faixaDoVeiculo(veh).min)}</span>
          </div>
        )}
        <div className="price-line total">
          <span>Total</span>
          <span>{money(pc.total)}</span>
        </div>
        <div className="price-sub">
          ~{durReal} min · rota real Mapbox · entregador recebe {money(pc.driver)} ({PRICE.driverPct * 100}%)
        </div>
      </div>

      {erro && (
        <div className="trust-banner" style={{ background: "var(--warn-bg)", borderColor: "#f3d6a8", color: "var(--warn)", marginBottom: 12 }}>
          <Icon name="shield" />
          <div>{erro}</div>
        </div>
      )}
      <div className="trust-banner" style={{ marginBottom: 12 }}>
        <Icon name="shield" />
        <div>Esta entrega tem <b>proteção de carga inclusa</b> (até {money(teto)}) e entregador com <b>antecedentes verificados</b>.</div>
      </div>
      <SlideConfirm label="Solicitar entrega" icon="send" color="brand" busy={enviando} disabled={!podeEnviar} onConfirm={solicitar} />
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

type StatusNeg = {
  status: string;
  entregador: { nome: string; vehicle_type: string; placa: string | null; rating: number | null } | null;
};
const STATUS_TXT: Record<string, string> = {
  buscando: "Procurando entregador verificado",
  aceito: "Entregador a caminho da coleta",
  a_caminho_coleta: "Entregador a caminho da coleta",
  coletado: "Encomenda coletada",
  a_caminho_entrega: "A caminho da entrega",
  entregue: "Entrega concluída",
  cancelado: "Pedido cancelado",
};
const inic = (n: string) => n.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
const VEH_TXT: Record<string, string> = { moto: "Moto", carro: "Carro", van: "Van", bike: "Bike" };

function TrackingScreen() {
  const { step, done, running, eta, start, reset, setView, pedido, setPedido } = useEntrega();
  const chat = useChatAuth(pedido?.id ?? null, "estabelecimento");
  const [cancelar, setCancelar] = useState(false);
  const [real, setReal] = useState<StatusNeg | null>(null);

  // acompanha o status REAL do pedido (sai da simulação Lucas Mendes)
  useEffect(() => {
    if (!pedido?.id) return;
    let vivo = true;
    const puxar = async () => {
      const sb = getBrowserSupabase();
      if (!sb) return;
      const { data } = await sb.rpc("status_pedido_negocio", { p_pedido_id: pedido.id });
      if (vivo && data) setReal(data as StatusNeg);
    };
    puxar();
    const t = setInterval(puxar, 4000);
    return () => { vivo = false; clearInterval(t); };
  }, [pedido?.id]);

  const ent = real?.entregador ?? null;

  const cancelarPedido = async (motivo: string) => {
    const sb = getBrowserSupabase();
    if (sb && pedido) await sb.rpc("cancelar_pedido_estabelecimento", { p_pedido_id: pedido.id, p_motivo: motivo });
    setCancelar(false);
    reset();
    setPedido(null);
    setView("form");
  };

  return (
    <>
      <div className="card">
        <div className="card-h">
          <Icon name="moto" />
          <h3>{real ? STATUS_TXT[real.status] ?? "Em andamento" : done ? "Entrega concluída" : "Entrega em andamento"}</h3>
          <span className="right">#{pedido ? pedido.id.slice(0, 8) : "4821"}</span>
        </div>
        {pedido && !ent ? (
          // pedido real ainda SEM entregador designado → procurando
          <div className="driver" style={{ alignItems: "center" }}>
            <div className="avatar" style={{ background: "var(--bg)", color: "var(--brand)" }}><Icon name="spinner" /></div>
            <div className="driver-info">
              <div className="name">Procurando entregador</div>
              <div className="meta">Ofertando pro entregador verificado mais próximo…</div>
            </div>
          </div>
        ) : ent ? (
          // entregador REAL designado
          <>
            <div className="driver">
              <div className="avatar">{inic(ent.nome)}</div>
              <div className="driver-info">
                <div className="name">{ent.nome}</div>
                <div className="meta">
                  {VEH_TXT[ent.vehicle_type] ?? ent.vehicle_type}{ent.placa ? ` · ${ent.placa}` : ""}{" "}
                  <span className="rating"><Icon name="star" /> {ent.rating ?? "—"}</span>
                </div>
              </div>
            </div>
            <div className="verified-badges">
              <span className="vbadge"><Icon name="shield" /> Antecedentes OK</span>
              <span className="vbadge"><Icon name="checkThin" /> CNH válida</span>
              <span className="vbadge"><Icon name="checkThin" /> Identidade</span>
            </div>
          </>
        ) : (
          // sem backend (demo/simulação) → mantém o exemplo
          <>
            <div className="driver">
              <div className="avatar">LM</div>
              <div className="driver-info">
                <div className="name">Lucas Mendes</div>
                <div className="meta">Honda CG 160 · ABC-1D23 <span className="rating"><Icon name="star" /> 4,9</span></div>
              </div>
            </div>
            <div className="verified-badges">
              <span className="vbadge"><Icon name="shield" /> Antecedentes OK</span>
              <span className="vbadge"><Icon name="checkThin" /> CNH válida (A)</span>
              <span className="vbadge"><Icon name="checkThin" /> Identidade</span>
            </div>
          </>
        )}
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
      {pedido && <BotaoSuporte onEnviar={(t, d) => abrirDisputa(pedido.id, "estabelecimento", t, d).then((r) => (r.ok ? "ok" : r.motivo))} />}

      {pedido && !done && (
        <button className="btn btn-ghost" style={{ marginTop: 10 }} onClick={() => setCancelar(true)}>
          <Icon name="stop" /> Cancelar pedido
        </button>
      )}
      {cancelar && (
        <CancelarCorrida
          titulo="Cancelar pedido"
          motivos={["Não preciso mais da entrega", "Cliente cancelou a compra", "Vou levar eu mesmo", "Erro no pedido (endereço/itens)", "Demora pra achar entregador", "Outro"]}
          onConfirmar={cancelarPedido}
          onFechar={() => setCancelar(false)}
        />
      )}

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
