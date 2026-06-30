"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import Link from "next/link";
import AppShell, { type ShellNavGroup } from "../AppShell";
import BotaoSuporte from "../BotaoSuporte";
import SlideConfirm from "../SlideConfirm";
import CancelarCorrida from "../CancelarCorrida";
import AvaliarEntrega from "../AvaliarEntrega";
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
import { registerPush } from "@/lib/push";
import { hasSupabase } from "@/lib/integracoes";
import { money, PRICE, priceCalc, faixaDoVeiculo, VEICULOS } from "@/lib/precos";
import { STEPS } from "@/lib/rota";
import { fetchDirections } from "@/lib/mapbox";
import { useEntrega, type NegocioView } from "./EntregaContext";

const MOTIVO: Record<string, string> = {
  "supabase-nao-configurado": "Backend não configurado.",
  "nao-autenticado": "Faça login para criar pedidos.",
  "estabelecimento-nao-encontrado": "Conta sem estabelecimento. Refaça o cadastro.",
  "nao-confirmado-na-fonte": "O pedido não confirmou no banco. Tente de novo.",
  "saldo-insuficiente": "Saldo insuficiente na carteira. Recarregue para criar a entrega.",
  "negocio-suspenso": "Sua conta está suspensa. Fale com o suporte.",
  "fora-da-area": "Endereço fora da área de cobertura (Palmas e região). Confira a coleta e a entrega.",
};
const traduzMotivo = (m: string) => MOTIVO[m] ?? `Falha ao criar o pedido (${m}).`;

const km1 = (n: number) => n.toFixed(1).replace(".", ",");
const MAX_PARADAS = 5;
const MAX_ESPERA_MIN = 60;

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
  // coleta/entrega vivem no pai p/ o mapa de prévia (rota negócio→destino) refletir as escolhas.
  const [coleta, setColeta] = useState<Lugar | null>(null);
  const [entrega, setEntrega] = useState<Lugar | null>(null);

  const nav: ShellNavGroup[] = [
    {
      group: "Operação",
      items: [
        { ic: "pkg", label: "Nova entrega", active: view === "form", onClick: () => setView("form") },
        { ic: "moto", label: "Em andamento", active: emAndamento, onClick: () => setView("tracking"), disabled: !emAndamento },
        { ic: "list", label: "Histórico", href: "/negocio/historico" },
        { ic: "chart", label: "Relatórios", href: "/negocio/relatorios" },
      ],
    },
    { group: "Financeiro", items: [{ ic: "money", label: "Carteira", href: "/negocio/carteira" }] },
    {
      group: "Gestão",
      items: [
        { ic: "star", label: "Avaliações", href: "/negocio/avaliacoes" },
        { ic: "bolt", label: "Integração / API", href: "/negocio/integracao" },
      ],
    },
    {
      group: "Conta",
      items: [
        { ic: "building", label: "Meu negócio", href: "/negocio/perfil" },
        { ic: "send", label: "Comunicados", href: "/negocio/comunicados" },
        { ic: "help", label: "Central de ajuda", href: "/negocio/ajuda" },
        { ic: "settings", label: "Configurações", href: "/negocio/configuracoes" },
      ],
    },
    {
      group: "Sobre",
      items: [
        { ic: "report", label: "Termos de uso", href: "/termos" },
        { ic: "shield", label: "Privacidade", href: "/privacidade" },
      ],
    },
  ];

  return (
    <AppShell title={TITLES[view]} nav={nav} demo="negocio">
      <div className="panel">
        {view === "form" && <FormScreen coleta={coleta} setColeta={setColeta} entrega={entrega} setEntrega={setEntrega} />}
        {view === "matching" && <MatchingScreen />}
        {view === "tracking" && <TrackingScreen />}
        {view === "done" && <DoneScreen />}
      </div>
      {view === "form" ? (
        <MapaAoVivo preview origem={coleta} destino={entrega} idleLabel="Escolha o destino — a rota sai do seu negócio" frac={0} running={false} done={false} eta={{ min: 0, km: "" }} />
      ) : (
        <MapaAoVivo frac={frac} running={running} done={done} eta={eta} onRouteMeta={setRouteMeta} posicaoReal={posReal} />
      )}
    </AppShell>
  );
}

function FormScreen({ coleta, setColeta, entrega, setEntrega }: {
  coleta: Lugar | null;
  setColeta: Dispatch<SetStateAction<Lugar | null>>;
  entrega: Lugar | null;
  setEntrega: Dispatch<SetStateAction<Lugar | null>>;
}) {
  const { veh, setVeh, distKm, durMin, setView, setPedido } = useEntrega();
  const teto = useTetoProtecao();
  const [rota, setRota] = useState<{ distKm: number; durMin: number } | null>(null);
  const [conteudo, setConteudo] = useState("");
  const [valor, setValor] = useState("");
  const [retornar, setRetornar] = useState(false);
  const [paradasExtras, setParadasExtras] = useState(0);
  const [minutosEspera, setMinutosEspera] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [negocioEndereco, setNegocioEndereco] = useState<Lugar | null>(null);
  const [saldo, setSaldo] = useState<number | null>(null); // só carregado pra dono/gerente
  const [pleno, setPleno] = useState(false);

  // coleta semi-automática + saldo: começa do endereço cadastrado do negócio (só semeia se ainda
  // não escolheu); carrega o saldo apenas pra dono/gerente (operador não vê financeiro).
  useEffect(() => {
    (async () => {
      const sb = getBrowserSupabase();
      if (!sb) return;
      const { data } = await sb.from("estabelecimentos").select("endereco,lat,lng").limit(1).maybeSingle();
      const d = data as { endereco: string | null; lat: number | null; lng: number | null } | null;
      if (d?.endereco && d.lat != null && d.lng != null) {
        const lugar = { endereco: d.endereco, lat: d.lat, lng: d.lng };
        setNegocioEndereco(lugar);
        setColeta((c) => c ?? lugar);
      }
      const { data: papel } = await sb.rpc("meu_papel_negocio");
      if (papel === "dono" || papel === "gerente") {
        setPleno(true);
        const { data: sd } = await sb.from("estabelecimentos").select("saldo_carteira").limit(1).maybeSingle();
        setSaldo((sd as { saldo_carteira?: number } | null)?.saldo_carteira ?? 0);
      }
    })();
  }, []);

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
  const pc = priceCalc(veh, distReal, PRICE, { paradasExtras, minutosEspera });
  const prontoBackend = hasSupabase();
  const podeEnviar = !prontoBackend || (!!coleta && !!entrega);
  const temDestino = !!coleta && !!entrega;
  const calculandoRota = temDestino && !rota;

  async function solicitar() {
    setErro(null);
    registerPush(); // gesto do usuário: autoriza push pra receber updates da entrega
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
        paradasExtras,
        minutosEspera,
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
        <AddressAutocomplete label="Local de coleta" valor={coleta} onSelecionar={setColeta} placeholder="Ex.: Ótica Visão Center, Q.104 Norte" complemento={false} />
        {coleta && negocioEndereco && coleta.endereco === negocioEndereco.endereco ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: -4, marginBottom: 10, flexWrap: "wrap" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--muted)", fontWeight: 600 }}>
              <Icon name="building" /> Saindo do endereço do seu negócio
            </span>
            <button type="button" onClick={() => setColeta(null)} style={{ background: "none", border: "none", color: "var(--brand)", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit", padding: 0 }}>
              Usar outro endereço
            </button>
          </div>
        ) : !coleta && !negocioEndereco ? (
          <div className="trust-banner" style={{ marginTop: -4, marginBottom: 10 }}>
            <Icon name="building" />
            <div>Defina o <Link href="/negocio/perfil" style={{ color: "var(--brand)", fontWeight: 700 }}>endereço do seu negócio</Link> pra toda entrega já sair de lá automaticamente.</div>
          </div>
        ) : null}
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

        <div className="field">
          <label>Paradas extras (além da entrega) · {money(PRICE.valorParadaExtra)} cada</label>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button type="button" className="btn" style={{ width: "auto", padding: "6px 14px", fontSize: 16 }} onClick={() => setParadasExtras((n) => Math.max(0, n - 1))} aria-label="Menos paradas">−</button>
            <span style={{ fontWeight: 700, minWidth: 24, textAlign: "center" }}>{paradasExtras}</span>
            <button type="button" className="btn" style={{ width: "auto", padding: "6px 14px", fontSize: 16 }} onClick={() => setParadasExtras((n) => Math.min(MAX_PARADAS, n + 1))} aria-label="Mais paradas">+</button>
          </div>
        </div>

        <div className="field">
          <label>Espera prevista na coleta · {money(PRICE.valorEsperaBloco)} a cada {PRICE.esperaBlocoMin} min</label>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button type="button" className="btn" style={{ width: "auto", padding: "6px 14px", fontSize: 16 }} onClick={() => setMinutosEspera((n) => Math.max(0, n - PRICE.esperaBlocoMin))} aria-label="Menos espera">−</button>
            <span style={{ fontWeight: 700, minWidth: 56, textAlign: "center" }}>{minutosEspera} min</span>
            <button type="button" className="btn" style={{ width: "auto", padding: "6px 14px", fontSize: 16 }} onClick={() => setMinutosEspera((n) => Math.min(MAX_ESPERA_MIN, n + PRICE.esperaBlocoMin))} aria-label="Mais espera">+</button>
          </div>
        </div>
      </div>

      {!temDestino ? (
        <div className="card" style={{ textAlign: "center", color: "var(--muted)", padding: "20px 14px" }}>
          <Icon name="pin" />
          <p style={{ margin: "8px 0 0", fontWeight: 600, fontSize: 13.5 }}>Escolha o <b>local de entrega</b> pra ver o veículo e o preço.</p>
        </div>
      ) : calculandoRota ? (
        <div className="card" style={{ textAlign: "center", color: "var(--muted)", padding: "20px 14px" }}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: 13.5 }}>Calculando a rota…</p>
        </div>
      ) : (
        <>
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
            {pc.extras > 0 && (
              <div className="price-line">
                <span>Espera + paradas extras</span>
                <span>{money(pc.extras)}</span>
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
        </>
      )}

      {pleno && saldo != null && (
        <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "12px 14px" }}>
          <span style={{ fontSize: 12.5, color: "var(--muted)", fontWeight: 600 }}>Saldo em carteira</span>
          <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <b style={{ fontVariantNumeric: "tabular-nums", color: temDestino && saldo < pc.total ? "var(--warn)" : "var(--ink)" }}>{money(saldo)}</b>
            {temDestino && saldo < pc.total && (
              <Link href="/negocio/carteira" className="btn btn-primary" style={{ width: "auto", padding: "6px 12px", fontSize: 12 }}>
                <Icon name="upload" /> Recarregar
              </Link>
            )}
          </span>
        </div>
      )}
      {pleno && saldo != null && temDestino && saldo < pc.total && (
        <div className="trust-banner" style={{ background: "var(--warn-bg)", borderColor: "#f3d6a8", color: "var(--warn)", marginBottom: 12 }}>
          <Icon name="alert" />
          <div>Saldo insuficiente pra esta entrega ({money(pc.total)}). Recarregue a carteira antes de solicitar.</div>
        </div>
      )}
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
      <SlideConfirm label="Solicitar entrega" icon="send" color="brand" busy={enviando} disabled={!podeEnviar || (pleno && saldo != null && temDestino && saldo < pc.total)} onConfirm={solicitar} />
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

  // acompanha o status REAL do pedido (entregador designado, via poll)
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
        {ent ? (
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
          // ainda sem entregador designado → procurando
          <div className="driver" style={{ alignItems: "center" }}>
            <div className="avatar" style={{ background: "var(--bg)", color: "var(--brand)" }}><Icon name="spinner" /></div>
            <div className="driver-info">
              <div className="name">Procurando entregador</div>
              <div className="meta">Ofertando pro entregador verificado mais próximo…</div>
            </div>
          </div>
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
  const { veh, distKm, reset, setView, setPedido, pedido } = useEntrega();
  const pc = priceCalc(veh, distKm);
  return (
    <>
      <div className="card">
        <div className="done-hero">
          <div className="circle">
            <Icon name="check" />
          </div>
          <div className="t">Entrega concluída</div>
          <div className="s">Comprovante registrado e enviado</div>
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
            <Icon name="pin" /> Entrega registrada com GPS e horário
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

      {pedido?.id && <AvaliarEntrega pedidoId={pedido.id} dePapel="estabelecimento" alvo="o entregador" />}
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
