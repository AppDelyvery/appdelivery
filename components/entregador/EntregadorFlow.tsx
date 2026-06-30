"use client";

import { useEffect, useState } from "react";
import AppShell, { type ShellNavGroup } from "../AppShell";
import AssinaturaCanvas from "../AssinaturaCanvas";
import BotaoSuporte from "../BotaoSuporte";
import SlideConfirm from "../SlideConfirm";
import AvisoForaDoLocal from "../AvisoForaDoLocal";
import CancelarCorrida from "../CancelarCorrida";
import NavExterna from "../NavExterna";
import AvaliarEntrega from "../AvaliarEntrega";
import { distanciaAte, estaLonge } from "@/lib/geofence";
import { Icon } from "../Icons";
import MapaAoVivo from "../MapaAoVivo";
import { useWakeLock } from "@/lib/useWakeLock";
import { hasSupabase } from "@/lib/integracoes";
import { usePedido } from "@/lib/pedido";
import { useTetoProtecao, cobertura } from "@/lib/protecao";
import EntregadorHome from "./EntregadorHome";
import { registrarColeta, registrarEntrega } from "@/lib/entrega";
import { abrirDisputa } from "@/actions/disputas";
import { useEnviarPosicao } from "@/lib/realtime";
import { useGeolocation } from "@/lib/useGeolocation";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { money, priceCalc } from "@/lib/precos";
import { DESTINO, ORIGEM } from "@/lib/rota";
import { useEntregador, type EntregadorView } from "./EntregadorContext";

const km1 = (n: number) => n.toFixed(1).replace(".", ",");

const TITLES: Record<EntregadorView, string> = {
  cadastro: "Cadastro e verificação",
  verificando: "Verificação",
  disponivel: "Corridas disponíveis",
  coleta: "Coleta",
  rota: "Minha corrida",
  finalizar: "Finalizar entrega",
  concluido: "Corrida concluída",
};

export default function EntregadorFlow() {
  const { view, setView, frac, running, done, eta, setRouteMeta, pedidoId } = useEntregador();

  // GPS real → Broadcast no canal do pedido (token), pra lojista e cliente verem ao vivo.
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      const sb = getBrowserSupabase();
      if (!sb || !pedidoId) {
        setToken(null);
        return;
      }
      const { data } = await sb.from("pedidos").select("tracking_token").eq("id", pedidoId).single();
      setToken((data as { tracking_token?: string } | null)?.tracking_token ?? null);
    })();
  }, [pedidoId]);
  const enviarPos = useEnviarPosicao(token);
  const { pos: gps } = useGeolocation(view === "coleta" || view === "rota");
  useEffect(() => {
    if (gps) enviarPos(gps);
  }, [gps, enviarPos]);
  const emCorrida = (["coleta", "rota", "finalizar", "concluido"] as EntregadorView[]).includes(view);
  const noMap = !(view === "coleta" || view === "rota");
  useWakeLock(!noMap); // tela do mapa (coleta/rota): mantém a tela acesa

  const nav: ShellNavGroup[] = [
    {
      group: "Corridas",
      items: [
        { ic: "bolt", label: "Disponíveis", active: view === "disponivel", onClick: () => setView("disponivel") },
        { ic: "moto", label: "Minha corrida", active: emCorrida, onClick: () => setView("rota"), disabled: !emCorrida },
      ],
    },
    {
      group: "Financeiro",
      items: [
        { ic: "money", label: "Ganhos", href: "/entregador/ganhos" },
        { ic: "card", label: "Carteira", href: "/entregador/carteira" },
      ],
    },
    {
      group: "Conta",
      items: [
        { ic: "user", label: "Meu perfil", href: "/entregador/perfil" },
        { ic: "star", label: "Avaliações", href: "/entregador/avaliacoes" },
        { ic: "send", label: "Comunicados", href: "/entregador/comunicados" },
        { ic: "help", label: "Central de ajuda", href: "/entregador/ajuda" },
        { ic: "settings", label: "Configurações", href: "/entregador/configuracoes" },
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

  // Home imersiva (padrão 99): a tela principal é o MAPA. Resto no menu.
  if (view === "disponivel" && hasSupabase()) return <EntregadorHome />;

  return (
    <AppShell title={TITLES[view]} nav={nav} demo="entregador" noMap={noMap}>
      <div className="panel">
        {view === "cadastro" && <Cadastro />}
        {view === "verificando" && <Verificando />}
        {view === "disponivel" && <Oferta />}
        {view === "coleta" && <Coleta />}
        {view === "rota" && <Rota />}
        {view === "finalizar" && <Finalizar />}
        {view === "concluido" && <Concluido />}
      </div>
      {!noMap && (
        <MapaAoVivo frac={frac} running={running} done={done} eta={eta} onRouteMeta={setRouteMeta} idleLabel="Sua localização · Palmas-TO" posicaoReal={gps} />
      )}
    </AppShell>
  );
}

function Cadastro() {
  const { cnhUp, crlvUp, selfieUp, setCnhUp, setCrlvUp, setSelfieUp, setView } = useEntregador();
  const ok = cnhUp && crlvUp && selfieUp;
  return (
    <>
      <div className="card">
        <div className="card-h">
          <Icon name="user" />
          <h3>Cadastro de entregador</h3>
        </div>
        <div className="field">
          <label>Nome completo</label>
          <input className="input" placeholder="Seu nome completo" />
        </div>
        <div className="field">
          <label>CPF</label>
          <input className="input" inputMode="numeric" placeholder="000.000.000-00" />
        </div>
        <div className="field">
          <label>Veículo</label>
          <div className="veh-toggle">
            <div className="veh-opt sel">
              <Icon name="moto" />
              <span className="vl">Moto</span>
            </div>
            <div className="veh-opt">
              <Icon name="car" />
              <span className="vl">Carro</span>
            </div>
            <div className="veh-opt">
              <Icon name="van" />
              <span className="vl">Van</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-h">
          <Icon name="card" />
          <h3>Documentos</h3>
          <span className="right">obrigatório</span>
        </div>
        <div className={`upload${cnhUp ? " done" : ""}`} onClick={() => setCnhUp(true)} style={{ marginBottom: 10 }}>
          <div className="ic">
            <Icon name={cnhUp ? "checkThin" : "upload"} />
          </div>
          <div>
            <div className="ut">CNH (categoria A)</div>
            <div className="us">{cnhUp ? "cnh-frente.jpg · enviado" : "toque para enviar a foto"}</div>
          </div>
        </div>
        <div className={`upload${crlvUp ? " done" : ""}`} onClick={() => setCrlvUp(true)} style={{ marginBottom: 10 }}>
          <div className="ic">
            <Icon name={crlvUp ? "checkThin" : "upload"} />
          </div>
          <div>
            <div className="ut">CRLV do veículo</div>
            <div className="us">{crlvUp ? "crlv-2026.pdf · enviado" : "toque para enviar"}</div>
          </div>
        </div>
        <div className={`upload${selfieUp ? " done" : ""}`} onClick={() => setSelfieUp(true)}>
          <div className="ic">
            <Icon name={selfieUp ? "checkThin" : "camera"} />
          </div>
          <div>
            <div className="ut">Selfie com documento</div>
            <div className="us">{selfieUp ? "selfie.jpg · enviado" : "prova de vida"}</div>
          </div>
        </div>
      </div>

      <button className="btn btn-primary" disabled={!ok} onClick={() => setView("verificando")}>
        <Icon name="shield" /> Enviar para verificação
      </button>
      <p className="hint">
        {ok ? "Tudo pronto. Vamos checar antecedentes e habilitação." : "Envie os 3 documentos para continuar."}
      </p>
    </>
  );
}

const CHECKS = [
  { ic: "card" as const, t: "Validando CNH no Senatran", s: "categoria, validade e situação" },
  { ic: "shield" as const, t: "Consultando antecedentes", s: "processos e restrições por CPF" },
  { ic: "user" as const, t: "Conferindo identidade", s: "prova de vida x documento" },
];

function Verificando() {
  const { setView } = useEntregador();
  const [status, setStatus] = useState<("idle" | "run" | "ok")[]>(["idle", "idle", "idle"]);
  const [aprovado, setAprovado] = useState(false);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    CHECKS.forEach((_, i) => {
      timers.push(setTimeout(() => setStatus((s) => s.map((v, j) => (j === i ? "run" : v))), i * 1100 + 200));
      timers.push(setTimeout(() => setStatus((s) => s.map((v, j) => (j === i ? "ok" : v))), i * 1100 + 1100));
    });
    timers.push(setTimeout(() => setAprovado(true), 3700));
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <>
      <div className="card">
        <div className="card-h">
          <Icon name="shield" />
          <h3>Verificação de segurança</h3>
        </div>
        {CHECKS.map((c, i) => (
          <div className={`vcheck${status[i] === "run" ? " run" : status[i] === "ok" ? " ok" : ""}`} key={c.t}>
            <div className="vc-ic">
              <Icon name={status[i] === "run" ? "spinner" : status[i] === "ok" ? "checkThin" : c.ic} />
            </div>
            <div>
              <div className="vc-t">{c.t}</div>
              <div className="vc-s">{c.s}</div>
            </div>
          </div>
        ))}
      </div>
      {aprovado && (
        <>
          <div className="card">
            <div className="done-hero">
              <div className="circle" style={{ background: "var(--brand-light)" }}>
                <Icon name="shield" style={{ color: "var(--brand)" }} />
              </div>
              <div className="t">Cadastro aprovado</div>
              <div className="s">Você é um entregador verificado APPDELYVERY</div>
            </div>
          </div>
          <button className="btn btn-go" onClick={() => setView("disponivel")}>
            <Icon name="moto" /> Começar a rodar
          </button>
        </>
      )}
    </>
  );
}

function Oferta() {
  const { distKm, durMin, setView } = useEntregador();
  const pc = priceCalc("moto", distKm);
  return (
    <>
      <div className="card">
        <div className="card-h">
          <Icon name="bolt" />
          <h3>Nova corrida</h3>
          <span className="right">você verificado</span>
        </div>
        <div className="offer-amount">+ {money(pc.driver)}</div>
        <div className="offer-sub">
          você recebe 80% · entrega de {km1(distKm)} km · ~{durMin} min
        </div>
        <div className="route-pts">
          <div className="rpt">
            <div className="pin o" />
            <div className="txt">
              <div className="a">{ORIGEM.nome}</div>
              <div className="b">{ORIGEM.end} · coleta</div>
            </div>
          </div>
          <div className="rpt">
            <div className="pin d" />
            <div className="txt">
              <div className="a">{DESTINO.nome}</div>
              <div className="b">{DESTINO.end} · entrega</div>
            </div>
          </div>
        </div>
      </div>
      <button className="btn btn-go" onClick={() => setView("coleta")}>
        <Icon name="checkThin" /> Aceitar corrida
      </button>
      <button className="btn btn-ghost" style={{ marginTop: 10 }} onClick={() => setView("disponivel")}>
        Recusar
      </button>
      <p className="countdown">
        Oferta passa para o próximo em <b>28s</b>
      </p>
      <p className="hint">
        No app real chega por push com som. O entregador
        <br />
        tem segundos para aceitar (matching por proximidade).
      </p>
    </>
  );
}

function Coleta() {
  const { coletaFoto, setColetaFoto, setView, start, pedidoId } = useEntregador();
  const [foto, setFoto] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const { pos: gps } = useGeolocation(true);
  const pedido = usePedido(pedidoId);
  const teto = useTetoProtecao();
  const [aviso, setAviso] = useState<number | null>(null); // distância em metros se longe

  const colLat = pedido?.coleta_lat ?? null;
  const colLng = pedido?.coleta_lng ?? null;
  const colEnd = pedido?.coleta_endereco ?? ORIGEM.end;

  // gate de geofence: se o GPS diz que está longe, pede confirmação consciente
  const registrar = async () => {
    if (estaLonge(gps, colLat, colLng)) {
      setAviso(distanciaAte(gps, colLat, colLng));
      return;
    }
    await executar();
  };

  const executar = async () => {
    setAviso(null);
    setErro(null);
    if (!hasSupabase() || !pedidoId) {
      setColetaFoto(true);
      return;
    }
    setEnviando(true);
    const r = await registrarColeta(pedidoId, foto);
    setEnviando(false);
    if (r === "ok") setColetaFoto(true);
    else
      setErro(
        r === "status-invalido"
          ? "Essa corrida não está na etapa de coleta."
          : r === "nao-e-sua-corrida"
            ? "Essa corrida não é sua."
            : "Falha ao registrar a coleta.",
      );
  };

  return (
    <>
      <div className="card">
        <div className="card-h">
          <Icon name="pin" />
          <h3>Vá até a coleta</h3>
        </div>
        <div className="rpt" style={{ padding: 0 }}>
          <div className="pin o" style={{ marginTop: 5 }} />
          <div className="txt">
            <div className="a">{colEnd}</div>
            <div className="b">ponto de coleta</div>
          </div>
        </div>
        <NavExterna lat={colLat} lng={colLng} label="Ir até a coleta" />
      </div>

      <div className="card">
        <div className="card-h"><Icon name="pkg" /><h3>O que você vai levar</h3></div>
        <div style={{ fontSize: 13.5, color: "var(--ink)", fontWeight: 600 }}>{pedido?.descricao || "Encomenda"}</div>
        {pedido?.valor_declarado ? <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>Valor declarado: {money(pedido.valor_declarado)}</div> : null}
        {pedido?.cliente_final_nome ? <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>Entrega para: {pedido.cliente_final_nome}</div> : null}
        {pedido?.retornar ? <div className="vbadge" style={{ marginTop: 8 }}><Icon name="refresh" /> Retorna à loja se o cliente não receber</div> : null}
        <div className="vbadge" style={{ marginTop: 8 }}><Icon name="shield" /> Carga protegida (até {money(cobertura(pedido?.valor_declarado, teto))})</div>
      </div>
      {coletaFoto ? (
        <>
          <div className="card">
            <div className="card-h">
              <Icon name="camera" />
              <h3>Coleta registrada</h3>
            </div>
            <div className="photo">
              <Icon name="pkg" className="pkg" />
              <div className="geo">
                <Icon name="pin" /> {colEnd}
              </div>
            </div>
          </div>
          <SlideConfirm
            label="Iniciar entrega"
            icon="arrow"
            color="brand"
            onConfirm={() => {
              setView("rota");
              start();
            }}
          />
        </>
      ) : (
        <>
          <label className="upload" style={{ marginBottom: 10 }}>
            <div className="ic">
              <Icon name={foto ? "checkThin" : "camera"} />
            </div>
            <div>
              <div className="ut">{foto ? foto.name : "Foto da encomenda na coleta"}</div>
              <div className="us">{foto ? "pronta pra enviar" : "toque para tirar/escolher a foto"}</div>
            </div>
            <input type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={(e) => setFoto(e.target.files?.[0] ?? null)} />
          </label>
          {erro && (
            <div className="trust-banner" style={{ background: "var(--warn-bg)", borderColor: "#f3d6a8", color: "var(--warn)", marginBottom: 10 }}>
              <Icon name="shield" />
              <div>{erro}</div>
            </div>
          )}
          <SlideConfirm label="Cheguei — registrar coleta" icon="camera" busy={enviando} onConfirm={registrar} />
        </>
      )}
      <p className="hint">A foto na coleta entra na trilha de auditoria da encomenda.</p>
      {aviso != null && <AvisoForaDoLocal distancia={aviso} acao="registrar a coleta" onConfirmar={() => void executar()} onCancelar={() => setAviso(null)} />}
    </>
  );
}

function Rota() {
  const { done, eta, distKm, setView, pedidoId, setPedidoId, setColetaFoto } = useEntregador();
  const pedido = usePedido(pedidoId);
  const pcSim = priceCalc("moto", distKm);
  const ganho = pedido?.preco_entregador ?? pcSim.driver;
  const entEnd = pedido?.entrega_endereco ?? DESTINO.end;
  const [cancelar, setCancelar] = useState(false);

  const confirmarCancelamento = async (motivo: string) => {
    const sb = getBrowserSupabase();
    if (sb && pedidoId) await sb.rpc("cancelar_corrida_entregador", { p_pedido_id: pedidoId, p_motivo: motivo });
    setCancelar(false);
    setColetaFoto(false);
    setPedidoId(null);
    setView("disponivel");
  };

  return (
    <>
      <div className="card">
        <div className="card-h">
          <Icon name="moto" />
          <h3>{done ? "Você chegou ao destino" : "A caminho da entrega"}</h3>
        </div>
        <div className="rpt" style={{ padding: "0 0 12px" }}>
          <div className="pin d" style={{ marginTop: 5 }} />
          <div className="txt">
            <div className="a">{entEnd}</div>
            <div className="b">{pedido?.cliente_final_nome ? `entregar para ${pedido.cliente_final_nome}` : "ponto de entrega"}</div>
          </div>
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
        <NavExterna lat={pedido?.entrega_lat ?? null} lng={pedido?.entrega_lng ?? null} label="Ir até a entrega" />
      </div>
      <div className="card">
        <div className="card-h">
          <Icon name="money" />
          <h3>Seu ganho</h3>
        </div>
        <div className="earn-big" style={{ fontSize: 30 }}>
          {money(ganho)}
        </div>
      </div>
      {done ? (
        <SlideConfirm label="Cheguei — finalizar entrega" icon="pen" onConfirm={() => setView("finalizar")} />
      ) : (
        <button className="btn btn-primary" disabled>
          <Icon name="moto" /> Em rota — GPS ativo
        </button>
      )}
      {pedidoId && <BotaoSuporte onEnviar={(t, d) => abrirDisputa(pedidoId, "entregador", t, d).then((r) => (r.ok ? "ok" : r.motivo))} />}
      <button className="btn btn-ghost" style={{ marginTop: 10 }} onClick={() => setCancelar(true)}>
        <Icon name="stop" /> Cancelar entrega
      </button>
      <p className="hint">O GPS do seu celular alimenta o mapa do cliente em tempo real.</p>
      {cancelar && <CancelarCorrida onConfirmar={confirmarCancelamento} onFechar={() => setCancelar(false)} />}
    </>
  );
}

function Finalizar() {
  const { setSigData, sigData, setView, pedidoId } = useEntregador();
  const [foto, setFoto] = useState<File | null>(null);
  const [codigo, setCodigo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const { pos: gps } = useGeolocation(true);
  const pedido = usePedido(pedidoId);
  const [aviso, setAviso] = useState<number | null>(null);

  const confirmar = async () => {
    if (estaLonge(gps, pedido?.entrega_lat ?? null, pedido?.entrega_lng ?? null)) {
      setAviso(distanciaAte(gps, pedido?.entrega_lat ?? null, pedido?.entrega_lng ?? null));
      return;
    }
    await executar();
  };

  const executar = async () => {
    setAviso(null);
    setErro(null);
    if (!hasSupabase() || !pedidoId) {
      setView("concluido");
      return;
    }
    setEnviando(true);
    const r = await registrarEntrega(pedidoId, foto, sigData, codigo);
    setEnviando(false);
    if (r === "ok") setView("concluido");
    else
      setErro(
        r === "codigo-invalido"
          ? "Código do cliente incorreto — confira com quem recebeu."
          : r === "bloqueado-tentativas"
            ? "Muitas tentativas de código. Peça o código certo a quem recebeu ou acione o suporte."
            : r === "status-invalido"
              ? "Essa corrida não está na etapa de entrega."
              : "Falha ao registrar a entrega.",
      );
  };

  return (
    <>
      <div className="card">
        <div className="card-h">
          <Icon name="pen" />
          <h3>Assinatura do destinatário</h3>
        </div>
        <p style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 10 }}>
          Peça para quem recebeu assinar abaixo confirmando a entrega.
        </p>
        <AssinaturaCanvas onChange={setSigData} />
      </div>
      <div className="card">
        <div className="card-h">
          <Icon name="shield" />
          <h3>Código do cliente</h3>
        </div>
        <p style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 8 }}>
          Peça o código de 4 dígitos que aparece no rastreio do cliente.
        </p>
        <input
          className="input"
          inputMode="numeric"
          maxLength={4}
          placeholder="0000"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 4))}
          style={{ fontSize: 22, textAlign: "center", letterSpacing: 8, fontWeight: 800 }}
        />
      </div>
      <label className="upload" style={{ marginBottom: 10 }}>
        <div className="ic">
          <Icon name={foto ? "checkThin" : "camera"} />
        </div>
        <div>
          <div className="ut">{foto ? foto.name : "Foto da entrega"}</div>
          <div className="us">{foto ? "pronta pra enviar" : "toque para tirar/escolher a foto"}</div>
        </div>
        <input type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={(e) => setFoto(e.target.files?.[0] ?? null)} />
      </label>
      {erro && (
        <div className="trust-banner" style={{ background: "var(--warn-bg)", borderColor: "#f3d6a8", color: "var(--warn)", marginBottom: 10 }}>
          <Icon name="shield" />
          <div>{erro}</div>
        </div>
      )}
      <SlideConfirm label="Confirmar entrega" icon="check" busy={enviando} onConfirm={confirmar} />
      <p className="hint">Foto + assinatura fecham o ciclo e geram o comprovante do cliente.</p>
      {aviso != null && <AvisoForaDoLocal distancia={aviso} acao="registrar a entrega" onConfirmar={executar} onCancelar={() => setAviso(null)} />}
    </>
  );
}

function Concluido() {
  const { distKm, setView, setColetaFoto, setSigData, reset, pedidoId } = useEntregador();
  const pc = priceCalc("moto", distKm);
  return (
    <>
      <div className="card">
        <div className="done-hero">
          <div className="circle">
            <Icon name="check" />
          </div>
          <div className="t">Entrega concluída</div>
          <div className="s">Comprovante enviado ao cliente</div>
        </div>
      </div>
      <div className="card">
        <div className="card-h">
          <Icon name="money" />
          <h3>Você ganhou</h3>
        </div>
        <div className="earn-big">+ {money(pc.driver)}</div>
        <div style={{ textAlign: "center", fontSize: 12, color: "var(--muted)" }}>
          creditado na sua conta · repasse automático
        </div>
      </div>
      {pedidoId && <AvaliarEntrega pedidoId={pedidoId} dePapel="entregador" alvo="o cliente" />}
      <button
        className="btn btn-go"
        onClick={() => {
          setColetaFoto(false);
          setSigData(null);
          reset();
          setView("disponivel");
        }}
      >
        <Icon name="bolt" /> Buscar nova corrida
      </button>
    </>
  );
}
