"use client";

import { useEffect, useState } from "react";
import AppShell, { type ShellNavGroup } from "../AppShell";
import AssinaturaCanvas from "../AssinaturaCanvas";
import BotaoSuporte from "../BotaoSuporte";
import { Icon } from "../Icons";
import MapaAoVivo from "../MapaAoVivo";
import { hasSupabase } from "@/lib/integracoes";
import { useCorridasDisponiveis } from "@/lib/corridas";
import { registrarColeta, registrarEntrega } from "@/lib/entrega";
import { abrirDisputa } from "@/actions/disputas";
import { useEnviarPosicao } from "@/lib/realtime";
import { useGeolocation } from "@/lib/useGeolocation";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { money, priceCalc } from "@/lib/precos";
import { DESTINO, ORIGEM, geoDist } from "@/lib/rota";
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

  const nav: ShellNavGroup[] = [
    {
      group: "Corridas",
      items: [
        { ic: "bolt", label: "Disponíveis", active: view === "disponivel", onClick: () => setView("disponivel") },
        { ic: "moto", label: "Minha corrida", active: emCorrida, onClick: () => setView("rota"), disabled: !emCorrida },
        { ic: "money", label: "Ganhos", href: "/entregador/ganhos" },
      ],
    },
    { group: "Avisos", items: [{ ic: "send", label: "Comunicados", href: "/entregador/comunicados" }] },
    {
      group: "Conta",
      items: [
        { ic: "shield", label: "Verificação", href: "/entregador/perfil" },
        { ic: "user", label: "Cadastro", onClick: () => setView("cadastro") },
      ],
    },
  ];

  return (
    <AppShell title={TITLES[view]} nav={nav} demo="entregador" noMap={noMap}>
      <div className="panel">
        {view === "cadastro" && <Cadastro />}
        {view === "verificando" && <Verificando />}
        {view === "disponivel" && (hasSupabase() ? <Disponiveis /> : <Oferta />)}
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
          <input className="input" defaultValue="Diego Alves de Souza" />
        </div>
        <div className="field">
          <label>CPF</label>
          <input className="input" defaultValue="047.***.***-12" />
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

const VEIC: Record<string, string> = { moto: "Moto", carro: "Carro", van: "Van", bike: "Bike" };

function Disponiveis() {
  const { setView, setPedidoId } = useEntregador();
  const { corridas, aceitar } = useCorridasDisponiveis();
  const { pos: gps } = useGeolocation(true);
  const [msg, setMsg] = useState<string | null>(null);

  // distância em km do entregador até a coleta (precisa do GPS + coords da coleta)
  const ateColeta = (c: { coleta_lat: number | null; coleta_lng: number | null }) => {
    if (!gps || c.coleta_lat == null || c.coleta_lng == null) return null;
    return geoDist(gps, [c.coleta_lng, c.coleta_lat]) / 1000;
  };

  const onAceitar = async (id: string) => {
    setMsg(null);
    const r = await aceitar(id);
    if (r === "ok") {
      setPedidoId(id);
      setView("coleta");
    } else if (r === "nao-aprovado") {
      setMsg("Seu cadastro ainda não foi aprovado pela operação.");
    } else if (r === "indisponivel") {
      setMsg("Outro entregador pegou essa corrida primeiro.");
    } else {
      setMsg("Não foi possível aceitar agora.");
    }
  };

  return (
    <>
      <div className="card">
        <div className="card-h">
          <Icon name="bolt" />
          <h3>Corridas disponíveis</h3>
          <span className="right">{corridas.length}</span>
        </div>
        {corridas.length === 0 && (
          <div style={{ fontSize: 13, color: "var(--muted)", textAlign: "center", padding: "14px 0" }}>
            Nenhuma corrida no momento. Fique online — as novas aparecem aqui.
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {corridas.map((c) => {
            const dc = ateColeta(c);
            return (
              <div key={c.id} className="offer-card">
                <div className="offer-top">
                  <div>
                    <div className="offer-amount-xl">{money(c.preco_entregador ?? 0)}</div>
                    <div className="offer-amount-sub">você recebe 80% do frete</div>
                  </div>
                  <span className="verif-chip"><Icon name="shield" /> Parceiro verificado</span>
                </div>

                <div className="offer-meta">
                  <span className="veh-badge"><Icon name={c.vehicle_type === "carro" ? "car" : c.vehicle_type === "van" ? "van" : "moto"} /> {VEIC[c.vehicle_type] ?? c.vehicle_type}</span>
                </div>

                <div className="route-pts" style={{ margin: "12px 0" }}>
                  <div className="rpt">
                    <div className="pin o" />
                    <div className="txt">
                      <div className="a">{c.coleta_endereco}</div>
                      <div className="b">{dc != null ? `${km1(dc)} km até a coleta` : "ponto de coleta"}</div>
                    </div>
                  </div>
                  <div className="rpt">
                    <div className="pin d" />
                    <div className="txt">
                      <div className="a">{c.entrega_endereco}</div>
                      <div className="b">{c.distancia_km ? `${km1(c.distancia_km)} km de entrega` : "destino"}{c.duracao_min ? ` · ${c.duracao_min} min` : ""}</div>
                    </div>
                  </div>
                </div>

                <button className="btn btn-go" onClick={() => onAceitar(c.id)}>
                  <Icon name="checkThin" /> Aceitar entrega
                </button>
                <div className="offer-foot">Recusar não afeta sua pontuação · o conteúdo aparece ao aceitar</div>
              </div>
            );
          })}
        </div>
      </div>
      {msg && (
        <div className="trust-banner" style={{ background: "var(--warn-bg)", borderColor: "#f3d6a8", color: "var(--warn)" }}>
          <Icon name="shield" />
          <div>{msg}</div>
        </div>
      )}
      <p className="hint">Aceite atômico: se outro pegar primeiro, o sistema avisa e a corrida some da lista.</p>
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

  const registrar = async () => {
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
            <div className="a">{ORIGEM.nome}</div>
            <div className="b">{ORIGEM.end}</div>
          </div>
        </div>
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
                <Icon name="pin" /> {ORIGEM.end} · 23:51
              </div>
            </div>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => {
              setView("rota");
              start();
            }}
          >
            <Icon name="arrow" /> Iniciar entrega
          </button>
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
          <button className="btn btn-primary" disabled={enviando} onClick={registrar}>
            <Icon name={enviando ? "spinner" : "camera"} /> {enviando ? "Registrando…" : "Cheguei — registrar coleta"}
          </button>
        </>
      )}
      <p className="hint">A foto na coleta entra na trilha de auditoria da encomenda.</p>
    </>
  );
}

function Rota() {
  const { done, eta, distKm, setView, pedidoId } = useEntregador();
  const pc = priceCalc("moto", distKm);
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
            <div className="a">{DESTINO.nome}</div>
            <div className="b">{DESTINO.end}</div>
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
      </div>
      <div className="card">
        <div className="card-h">
          <Icon name="money" />
          <h3>Seu ganho</h3>
        </div>
        <div className="earn-big" style={{ fontSize: 30 }}>
          {money(pc.driver)}
        </div>
      </div>
      {done ? (
        <button className="btn btn-go" onClick={() => setView("finalizar")}>
          <Icon name="pen" /> Finalizar entrega
        </button>
      ) : (
        <button className="btn btn-primary" disabled>
          <Icon name="moto" /> Em rota — GPS ativo
        </button>
      )}
      {pedidoId && <BotaoSuporte onEnviar={(t, d) => abrirDisputa(pedidoId, "entregador", t, d).then((r) => (r.ok ? "ok" : r.motivo))} />}
      <p className="hint">O GPS do seu celular alimenta o mapa do cliente em tempo real.</p>
    </>
  );
}

function Finalizar() {
  const { setSigData, sigData, setView, pedidoId } = useEntregador();
  const [foto, setFoto] = useState<File | null>(null);
  const [codigo, setCodigo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const confirmar = async () => {
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
      <button className="btn btn-go" disabled={enviando} onClick={confirmar}>
        <Icon name={enviando ? "spinner" : "check"} /> {enviando ? "Confirmando…" : "Confirmar entrega"}
      </button>
      <p className="hint">Foto + assinatura fecham o ciclo e geram o comprovante do cliente.</p>
    </>
  );
}

function Concluido() {
  const { distKm, setView, setColetaFoto, setSigData, reset } = useEntregador();
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
