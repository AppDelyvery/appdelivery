"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AdminShell from "./AdminShell";
import MapaDespacho, { type CorridaMapa, type EntregadorMapa } from "./MapaDespacho";
import { Icon } from "../Icons";
import { getBrowserSupabase } from "@/lib/supabase/browser";

const ST: Record<string, string> = {
  buscando: "Buscando entregador",
  aceito: "Aceito",
  a_caminho_coleta: "A caminho da coleta",
  coletado: "Coletado",
  a_caminho_entrega: "A caminho da entrega",
};

export default function DespachoAdmin() {
  const [ents, setEnts] = useState<EntregadorMapa[]>([]);
  const [cors, setCors] = useState<CorridaMapa[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [updated, setUpdated] = useState<string>("—");
  const mounted = useRef(true);

  const carregar = useCallback(async () => {
    const sb = getBrowserSupabase();
    if (!sb) return;
    const { data, error } = await sb.rpc("mapa_despacho");
    if (!mounted.current) return;
    if (error) {
      setErro(error.message);
      return;
    }
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
    return () => {
      mounted.current = false;
      clearInterval(t);
    };
  }, [carregar]);

  const livres = ents.filter((e) => !e.em_corrida).length;

  return (
    <AdminShell title="Despacho">
      <div className="kpis" style={{ marginBottom: 14 }}>
        <div className="kpi"><div className="ic"><Icon name="moto" /></div><div className="v">{ents.length}</div><div className="l">Entregadores online</div></div>
        <div className="kpi"><div className="ic"><Icon name="checkThin" /></div><div className="v">{livres}</div><div className="l">Livres agora</div></div>
        <div className="kpi"><div className="ic"><Icon name="pkg" /></div><div className="v">{cors.length}</div><div className="l">Corridas em andamento</div></div>
      </div>

      {erro && <div style={{ color: "var(--warn)", fontSize: 12.5, marginBottom: 10, fontWeight: 600 }}>Falha ao carregar: {erro}</div>}

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
              <div key={c.id} style={{ padding: "9px 0", borderBottom: "1px solid var(--line)" }}>
                <div className="td-name" style={{ fontSize: 12.5 }}>{c.coleta_endereco} → {c.entrega_endereco}</div>
                <div style={{ color: "var(--muted)", fontSize: 11.5, marginTop: 2 }}>
                  {ST[c.status] ?? c.status} · {c.entregador_nome ?? "sem entregador"}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <p className="hint">Atualiza a cada 8s · última {updated}. A posição vem de quem está com GPS ligado (is_online).</p>
    </AdminShell>
  );
}
