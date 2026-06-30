"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "../Icons";
import MapaBase, { type TemaMapa } from "./MapaBase";
import { money } from "@/lib/precos";
import { registerPush } from "@/lib/push";
import { liberarAudio, tocarAlerta, pararAlerta } from "@/lib/alertaSom";
import { geoDist } from "@/lib/rota";
import { MAPBOX_TOKEN } from "@/lib/mapbox";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { useGeolocation } from "@/lib/useGeolocation";
import { useMinhaOferta } from "@/lib/oferta";
import { useDisponibilidade, useAtualizarPosicao } from "@/lib/disponibilidade";
import { useWakeLock } from "@/lib/useWakeLock";
import { useEntregador } from "./EntregadorContext";

type PerfilMenu = { nome: string; rating: number | null; total_entregas: number; taxa_aceitacao: number | null; taxa_finalizacao: number | null };
const iniciais = (nome: string) => nome.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
const km1 = (n: number) => n.toFixed(1).replace(".", ",");
const inicioDoDia = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
const VEIC: Record<string, string> = { moto: "Moto", carro: "Carro", van: "Van", bike: "Bike" };

// Home do entregador no padrão 99: MAPA tela-cheia + hambúrguer + ícones
// flutuantes + sheet inferior com Conectar/ofertas. Resto vai no menu.
export default function EntregadorHome() {
  const { setView, setPedidoId } = useEntregador();
  const { pos: gps } = useGeolocation(true);
  const { online, busy, erro, alternar } = useDisponibilidade();
  useAtualizarPosicao(online, gps);
  useWakeLock(true); // mapa tela-cheia: mantém a tela acesa enquanto o entregador está aqui
  const { oferta, aceitar, recusar } = useMinhaOferta(online);

  const [tema, setTema] = useState<TemaMapa>("auto");
  const [menu, setMenu] = useState(false);
  const [seletorTema, setSeletorTema] = useState(false);
  const [perfil, setPerfil] = useState<PerfilMenu | null>(null);
  const [ganhoHoje, setGanhoHoje] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const recenterRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    (async () => {
      const sb = getBrowserSupabase();
      if (!sb) return;
      const { data: e } = await sb.from("entregadores").select("nome").limit(1).maybeSingle();
      const { data: m } = await sb.rpc("metricas_entregador");
      const met = (m ?? {}) as { rating?: number | null; total_entregas?: number; taxa_aceitacao?: number | null; taxa_finalizacao?: number | null };
      setPerfil({
        nome: (e as { nome?: string } | null)?.nome ?? "Entregador",
        rating: met.rating ?? null,
        total_entregas: met.total_entregas ?? 0,
        taxa_aceitacao: met.taxa_aceitacao ?? null,
        taxa_finalizacao: met.taxa_finalizacao ?? null,
      });
      const { data: p } = await sb.from("pedidos").select("preco_entregador,status,entregue_at");
      if (p) {
        const hoje = (p as { preco_entregador: number | null; status: string; entregue_at: string | null }[])
          .filter((x) => x.status === "entregue" && x.entregue_at && new Date(x.entregue_at).getTime() >= inicioDoDia());
        setGanhoHoje(hoje.reduce((s, x) => s + (x.preco_entregador ?? 0), 0));
      }
    })();
  }, []);

  const ateColeta = (lat: number | null, lng: number | null) => {
    if (!gps || lat == null || lng == null) return null;
    return geoDist(gps, [lng, lat]) / 1000;
  };

  // contador regressivo cosmético (servidor é a fonte da verdade via expira_at)
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!oferta) return;
    const t = setInterval(() => setTick((x) => x + 1), 500);
    return () => clearInterval(t);
  }, [oferta]);
  const segRestantes = oferta ? Math.max(0, Math.round((new Date(oferta.expira_at).getTime() - Date.now()) / 1000)) : 0;
  void tick;

  // toque estilo 99: bipe repetido enquanto a oferta está na tela
  useEffect(() => {
    if (oferta) tocarAlerta();
    else pararAlerta();
    return () => pararAlerta();
  }, [oferta?.oferta_id]);

  // endereço atual do entregador (reverse geocode) pra abrir a lista: onde ele está → coleta → destino
  const [meuEndereco, setMeuEndereco] = useState<string | null>(null);
  useEffect(() => {
    if (!oferta || !gps) { setMeuEndereco(null); return; }
    let vivo = true;
    (async () => {
      try {
        const [lng, lat] = gps;
        const u = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&country=br&language=pt&types=address&limit=1`;
        const d = await (await fetch(u)).json();
        if (vivo) setMeuEndereco(d.features?.[0]?.place_name ?? null);
      } catch { /* ignora */ }
    })();
    return () => { vivo = false; };
  }, [oferta?.oferta_id]);

  const onAceitar = async () => {
    if (!oferta) return;
    setMsg(null);
    const r = await aceitar(oferta.oferta_id);
    if (r === "ok") {
      setPedidoId(oferta.pedido_id);
      setView("coleta");
    } else if (r === "expirada") setMsg("Essa oferta expirou.");
    else if (r === "indisponivel") setMsg("Outro entregador pegou primeiro.");
    else if (r === "nao-aprovado") setMsg("Seu cadastro ainda não foi aprovado.");
    else setMsg("Não foi possível aceitar agora.");
  };

  return (
    <div className="emap">
      <MapaBase
        pos={gps}
        tema={tema}
        recenterRef={recenterRef}
        oferta={oferta && oferta.coleta_lat != null && oferta.coleta_lng != null
          ? { coletaLat: oferta.coleta_lat, coletaLng: oferta.coleta_lng, entregaLat: oferta.entrega_lat, entregaLng: oferta.entrega_lng }
          : null}
      />

      {/* topo: hambúrguer + pílula de ganhos */}
      <button className="emap-fab emap-burger" onClick={() => setMenu(true)} aria-label="Menu">
        <Icon name="menu" />
      </button>
      <button className="emap-pill" onClick={() => (window.location.href = "/entregador/ganhos")}>
        {money(ganhoHoje)} <Icon name="arrow" />
      </button>

      {/* ícones flutuantes à direita: recentralizar + tema + reportar */}
      <div className="emap-side">
        <button className="emap-fab" onClick={() => recenterRef.current?.()} aria-label="Centralizar no meu local"><Icon name="target" /></button>
        <button className="emap-fab" onClick={() => setSeletorTema((s) => !s)} aria-label="Tema do mapa"><Icon name="layers" /></button>
        <button className="emap-fab" onClick={() => (window.location.href = "/entregador/comunicados")} aria-label="Reportar / central"><Icon name="report" /></button>
      </div>

      {/* escudo / verificação (canto inferior esquerdo) */}
      <button className="emap-shield" onClick={() => (window.location.href = "/entregador/perfil")} aria-label="Verificação e segurança"><Icon name="shield" /></button>

      {seletorTema && (
        <div className="emap-tema">
          {(["auto", "dia", "noite"] as TemaMapa[]).map((t) => (
            <button key={t} className={tema === t ? "on" : ""} onClick={() => { setTema(t); setSeletorTema(false); }}>
              {t === "auto" ? "Automático" : t === "dia" ? "Dia" : "Noite"}
            </button>
          ))}
        </div>
      )}

      {/* sheet inferior */}
      <div className="emap-sheet">
        <div className="emap-grab" />
        {!online ? (
          <>
            <div className="emap-status off"><span className="dot" /> Você está offline</div>
            <p className="emap-sub">Conecte pra receber entregas da sua região.</p>
            {erro && <div className="emap-erro">{erro}</div>}
            <button className="btn" style={{ background: "var(--go)", color: "#fff" }} disabled={busy} onClick={() => { liberarAudio(); registerPush(); alternar(true, gps); }}>
              {busy ? "…" : "Conectar"}
            </button>
          </>
        ) : oferta ? (
          (() => {
            const dc = ateColeta(oferta.coleta_lat, oferta.coleta_lng);
            const frac = Math.max(0, Math.min(1, segRestantes / 30));
            return (
              <>
                <div className="oferta-timer-row">
                  <div className="oferta-titulo">Nova entrega pra você</div>
                  <div className="oferta-seg">{segRestantes}s</div>
                </div>
                <div className="oferta-timer"><div className="oferta-timer-fill" style={{ width: `${frac * 100}%` }} /></div>
                {msg && <div className="emap-erro">{msg}</div>}
                <div className="offer-card" style={{ marginTop: 4 }}>
                  <div className="offer-top">
                    <div>
                      <div className="offer-amount-xl">{money(oferta.preco_entregador ?? 0)}</div>
                      <div className="offer-amount-sub">já é o seu líquido · taxa descontada</div>
                    </div>
                    <span className="veh-badge"><Icon name={oferta.vehicle_type === "carro" ? "car" : oferta.vehicle_type === "van" ? "van" : "moto"} /> {VEIC[oferta.vehicle_type] ?? oferta.vehicle_type}</span>
                  </div>
                  <div className="route-pts" style={{ margin: "10px 0" }}>
                    <div className="rpt"><div className="pin me" /><div className="txt"><div className="a">{meuEndereco ?? "Sua localização atual"}</div><div className="b">você está aqui</div></div></div>
                    <div className="rpt"><div className="pin o" /><div className="txt"><div className="a">{oferta.coleta_endereco}</div><div className="b">{dc != null ? `${km1(dc)} km até a coleta` : "coleta"}</div></div></div>
                    <div className="rpt"><div className="pin d" /><div className="txt"><div className="a">{oferta.entrega_endereco}</div><div className="b">{oferta.distancia_km ? `${km1(oferta.distancia_km)} km de entrega` : "entrega"}</div></div></div>
                  </div>
                  <button className="btn btn-go" onClick={onAceitar}><Icon name="checkThin" /> Aceitar entrega</button>
                  <button className="btn btn-ghost" style={{ marginTop: 8 }} onClick={() => { setMsg(null); recusar(oferta.oferta_id); }}>Recusar</button>
                </div>
              </>
            );
          })()
        ) : (
          <>
            <div className="emap-online-row">
              <div className="emap-status on"><span className="dot" /> Online · procurando entregas</div>
              <button className="btn btn-ghost" style={{ width: "auto", padding: "8px 14px", fontSize: 12.5 }} disabled={busy} onClick={() => alternar(false, gps)}>Desconectar</button>
            </div>
            {msg && <div className="emap-erro">{msg}</div>}
            <div className="emap-procurando">
              <span className="emap-radar-dot" />
              Esperando a próxima entrega da sua região aparecer. Fique por perto.
            </div>
          </>
        )}
      </div>

      {menu && <MenuDrawer perfil={perfil} onFechar={() => setMenu(false)} />}
    </div>
  );
}

function MenuDrawer({ perfil, onFechar }: { perfil: PerfilMenu | null; onFechar: () => void }) {
  const router = useRouter();
  const ir = (href: string) => { onFechar(); router.push(href); };
  const sair = async () => {
    const sb = getBrowserSupabase();
    if (sb) await sb.auth.signOut();
    router.push("/");
  };
  const item = (ic: Parameters<typeof Icon>[0]["name"], label: string, href: string) => (
    <button className="sb-item" onClick={() => ir(href)}><Icon name={ic} /><span>{label}</span></button>
  );
  const pct = (v: number | null) => (v == null ? "—" : `${v}%`);
  return (
    <>
      <div className="nav-scrim" style={{ display: "block", position: "fixed", inset: 0, zIndex: 330 }} onClick={onFechar} />
      <aside className="sidebar open" style={{ display: "flex", position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 331, transform: "translateX(0)", width: 280, maxWidth: "86vw" }}>
        <div className="menu-perfil">
          <div className="menu-avatar">{iniciais(perfil?.nome ?? "E")}</div>
          <div className="menu-nome">{perfil?.nome ?? "Entregador"}</div>
          <div className="menu-rating"><Icon name="star" /> {perfil?.rating != null ? perfil.rating : "—"} · {perfil?.total_entregas ?? 0} entregas</div>
        </div>
        <div className="menu-taxas">
          <div className="menu-taxa"><div className="v">{pct(perfil?.taxa_aceitacao ?? null)}</div><div className="l">Taxa de Aceitação</div></div>
          <div className="menu-taxa"><div className="v">{pct(perfil?.taxa_finalizacao ?? null)}</div><div className="l">Taxa de Finalização</div></div>
        </div>
        <div className="sb-group">
          <div className="gh">Corridas</div>
          {item("bolt", "Início", "/entregador")}
        </div>
        <div className="sb-group">
          <div className="gh">Financeiro</div>
          {item("money", "Ganhos", "/entregador/ganhos")}
          {item("card", "Carteira", "/entregador/carteira")}
        </div>
        <div className="sb-group">
          <div className="gh">Conta</div>
          {item("user", "Meu perfil", "/entregador/perfil")}
          {item("star", "Avaliações", "/entregador/avaliacoes")}
          {item("send", "Comunicados", "/entregador/comunicados")}
          {item("help", "Central de ajuda", "/entregador/ajuda")}
          {item("settings", "Configurações", "/entregador/configuracoes")}
        </div>
        <div className="sb-group">
          <div className="gh">Sobre</div>
          {item("report", "Termos de uso", "/termos")}
          {item("shield", "Privacidade", "/privacidade")}
        </div>
        <div className="sb-bottom">
          <button className="sb-item" onClick={sair}><Icon name="stop" /><span>Sair</span></button>
        </div>
      </aside>
    </>
  );
}
