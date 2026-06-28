"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AdminShell from "./AdminShell";
import MapaDespacho, { type CorridaMapa, type EntregadorMapa } from "./MapaDespacho";
import { Icon } from "../Icons";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { money } from "@/lib/precos";

const ST: Record<string, string> = {
  buscando: "Buscando entregador",
  aceito: "Aceito",
  a_caminho_coleta: "A caminho da coleta",
  coletado: "Coletado",
  a_caminho_entrega: "A caminho da entrega",
};
const PRE_COLETA = ["buscando", "aceito", "a_caminho_coleta"];

type Acao = { rpc: string; label: string; cor: string };
const acoesDe = (status: string): Acao[] => {
  const a: Acao[] = PRE_COLETA.includes(status)
    ? [{ rpc: "admin_reatribuir_pedido", label: "Reatribuir", cor: "var(--brand)" }]
    : [{ rpc: "admin_forcar_conclusao", label: "Forçar entrega", cor: "var(--go)" }];
  a.push({ rpc: "admin_cancelar_pedido", label: "Cancelar + estornar", cor: "var(--warn)" });
  return a;
};

export default function DespachoAdmin() {
  const [ents, setEnts] = useState<EntregadorMapa[]>([]);
  const [cors, setCors] = useState<CorridaMapa[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [updated, setUpdated] = useState<string>("—");
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState<{ id: string; rpc: string; label: string } | null>(null);
  const mounted = useRef(true);

  const carregar = useCallback(async () => {
    const sb = getBrowserSupabase();
    if (!sb) return;
    const { data, error } = await sb.rpc("mapa_despacho");
    if (!mounted.current) return;
    if (error) { setErro(error.message); return; }
    setErro(null);
    const d = (data ?? {}) as { entregadores?: EntregadorMapa[]; corridas?: CorridaMapa[] };
    setEnts(d.entregadores ?? []);
    setCors(d.corridas ?? []);
    setUpdated(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
  }, []);

  useEffect(() => {
    mounted.current = true;
    carregar();
    const t = setInterval(carregar, 8000);
    return () => { mounted.current = false; clearInterval(t); };
  }, [carregar]);

  const executar = async (rpc: string, id: string) => {
    const sb = getBrowserSupabase();
    if (!sb) return;
    setBusy(id);
    setConfirmar(null);
    const { data, error } = await sb.rpc(rpc, { p_pedido_id: id });
    setBusy(null);
    if (error) { setErro(error.message); return; }
    if (data && data !== "ok") { setErro(`Não foi possível: ${data}`); return; }
    setErro(null);
    await carregar();
  };

  const livres = ents.filter((e) => !e.em_corrida).length;
  const emRisco = cors.filter((c) => c.em_risco);

  return (
    <AdminShell title="Despacho">
      <div className="kpis" style={{ marginBottom: 14 }}>
        <div className="kpi"><div className="ic"><Icon name="moto" /></div><div className="v">{ents.length}</div><div className="l">Entregadores online</div></div>
        <div className="kpi"><div className="ic"><Icon name="checkThin" /></div><div className="v">{livres}</div><div className="l">Livres agora</div></div>
        <div className="kpi"><div className="ic"><Icon name="pkg" /></div><div className="v">{cors.length}</div><div className="l">Corridas em andamento</div></div>
      </div>

      {erro && <div style={{ color: "var(--warn)", fontSize: 12.5, marginBottom: 10, fontWeight: 600 }}>{erro}</div>}

      {/* Banner de risco — para de ser tela só de leitura */}
      {emRisco.length > 0 && (
        <div className="card" style={{ borderColor: "#f3c98b", background: "#fff8ef", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span style={{ width: 30, height: 30, borderRadius: 8, background: "var(--warn-bg)", display: "grid", placeItems: "center", flexShrink: 0 }}><Icon name="alert" /></span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#8a5a12" }}>{emRisco.length} pedido(s) em risco</div>
              <div style={{ fontSize: 12, color: "#a9762a" }}>Coleta atrasada ou carga parada — aja na lista abaixo (reatribuir, forçar entrega ou cancelar + estornar).</div>
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 8 }}>
        <MapaDespacho entregadores={ents} corridas={cors} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 14, marginTop: 14 }}>
        <div className="card">
          <div className="card-h"><Icon name="moto" /><h3>Entregadores online</h3><span className="right">{ents.length}</span></div>
          {ents.length === 0 ? (
            <div style={{ fontSize: 12.5, color: "var(--faint)" }}>Nenhum entregador online agora.</div>
          ) : (
            ents.map((e) => (
              <div key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid var(--line)" }}>
                <div>
                  <div className="td-name" style={{ fontSize: 13 }}>{e.nome}</div>
                  <div style={{ color: "var(--muted)", fontSize: 11.5 }}>{e.vehicle_type}</div>
                </div>
                <span className={`status-pill ${e.em_corrida ? "s-live" : "s-ok"}`}>{e.em_corrida ? "Em corrida" : "Livre"}</span>
              </div>
            ))
          )}
        </div>

        <div className="card">
          <div className="card-h"><Icon name="pkg" /><h3>Corridas em andamento</h3><span className="right">{cors.length}</span></div>
          {cors.length === 0 ? (
            <div style={{ fontSize: 12.5, color: "var(--faint)" }}>Nenhuma corrida em andamento.</div>
          ) : (
            cors.map((c) => (
              <div key={c.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--line)", background: c.em_risco ? "rgba(217,119,6,0.05)" : undefined, borderRadius: c.em_risco ? 8 : undefined, paddingLeft: c.em_risco ? 8 : 0, paddingRight: c.em_risco ? 8 : 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <div className="td-name" style={{ fontSize: 12.5, minWidth: 0 }}>{c.coleta_endereco} → {c.entrega_endereco}</div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>{money(c.preco_total ?? 0)}</div>
                </div>
                <div style={{ color: "var(--muted)", fontSize: 11.5, marginTop: 2 }}>
                  {ST[c.status] ?? c.status} · {c.entregador_nome ?? "sem entregador"}
                </div>
                {c.em_risco && (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 5, fontSize: 11, fontWeight: 700, color: "#8a5a12", background: "var(--warn-bg)", padding: "3px 8px", borderRadius: 20 }}>
                    <Icon name="alert" /> {c.risco_motivo}
                  </div>
                )}

                {/* ações de intervenção */}
                <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                  {confirmar?.id === c.id ? (
                    <>
                      <span style={{ fontSize: 12, fontWeight: 600, alignSelf: "center", color: "var(--ink-2)" }}>Confirmar “{confirmar.label}”?</span>
                      <button onClick={() => executar(confirmar.rpc, c.id)} disabled={busy === c.id}
                        style={{ border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 11.5, fontWeight: 700, padding: "5px 12px", borderRadius: 8, background: "var(--go)", color: "#fff" }}>
                        {busy === c.id ? "..." : "Sim"}
                      </button>
                      <button onClick={() => setConfirmar(null)} disabled={busy === c.id}
                        style={{ border: "1px solid var(--line-2)", cursor: "pointer", fontFamily: "inherit", fontSize: 11.5, fontWeight: 700, padding: "5px 12px", borderRadius: 8, background: "#fff", color: "var(--muted)" }}>
                        Não
                      </button>
                    </>
                  ) : (
                    acoesDe(c.status).map((a) => (
                      <button key={a.rpc} onClick={() => setConfirmar({ id: c.id, rpc: a.rpc, label: a.label })} disabled={busy !== null}
                        style={{ border: `1px solid ${a.cor}`, cursor: "pointer", fontFamily: "inherit", fontSize: 11.5, fontWeight: 700, padding: "5px 11px", borderRadius: 8, background: "#fff", color: a.cor }}>
                        {a.label}
                      </button>
                    ))
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <p className="hint">Atualiza a cada 8s · última {updated}. Risco e posição vêm de quem está com GPS ligado (is_online).</p>
    </AdminShell>
  );
}
