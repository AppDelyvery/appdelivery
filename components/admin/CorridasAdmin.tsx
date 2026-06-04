"use client";

import { useCallback, useEffect, useState } from "react";
import AdminShell from "./AdminShell";
import Busca, { norm } from "./Busca";
import { Icon } from "../Icons";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { money } from "@/lib/precos";

type Corrida = {
  id: string;
  status: string;
  coleta_endereco: string;
  entrega_endereco: string;
  preco_total: number | null;
  preco_entregador: number | null;
  preco_plataforma: number | null;
  vehicle_type: string;
  distancia_km: number | null;
  valor_declarado: number | null;
  descricao: string | null;
  created_at: string;
  aceito_at: string | null;
  coletado_at: string | null;
  entregue_at: string | null;
  estabelecimentos: { razao_social: string } | null;
  entregadores: { nome: string } | null;
};
type Comprovante = { tipo: string; foto_url: string | null; assinatura_url: string | null; created_at: string };

const ST: Record<string, { txt: string; cls: string }> = {
  buscando: { txt: "Buscando", cls: "s-pend" },
  aceito: { txt: "Aceito", cls: "s-live" },
  a_caminho_coleta: { txt: "A caminho da coleta", cls: "s-live" },
  coletado: { txt: "Coletado", cls: "s-live" },
  a_caminho_entrega: { txt: "A caminho da entrega", cls: "s-live" },
  entregue: { txt: "Entregue", cls: "s-ok" },
  cancelado: { txt: "Cancelado", cls: "s-pend" },
};
const FILTROS = [
  { k: "todas", txt: "Todas" },
  { k: "ativas", txt: "Em andamento" },
  { k: "entregue", txt: "Entregues" },
  { k: "cancelado", txt: "Canceladas" },
];
const ATIVOS = ["buscando", "aceito", "a_caminho_coleta", "coletado", "a_caminho_entrega"];
const dt = (s: string | null) => (s ? new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : null);

export default function CorridasAdmin() {
  const [corridas, setCorridas] = useState<Corrida[]>([]);
  const [filtro, setFiltro] = useState("todas");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Corrida | null>(null);
  const [comp, setComp] = useState<Comprovante[]>([]);

  useEffect(() => {
    (async () => {
      const sb = getBrowserSupabase();
      if (!sb) return;
      const { data } = await sb
        .from("pedidos")
        .select("id,status,coleta_endereco,entrega_endereco,preco_total,preco_entregador,preco_plataforma,vehicle_type,distancia_km,valor_declarado,descricao,created_at,aceito_at,coletado_at,entregue_at,estabelecimentos(razao_social),entregadores(nome)")
        .order("created_at", { ascending: false });
      if (data) setCorridas(data as unknown as Corrida[]);
    })();
  }, []);

  const abrir = useCallback(async (c: Corrida) => {
    setSel(c);
    setComp([]);
    const sb = getBrowserSupabase();
    if (!sb) return;
    const { data } = await sb.from("comprovantes").select("tipo,foto_url,assinatura_url,created_at").eq("pedido_id", c.id);
    if (data) setComp(data as Comprovante[]);
  }, []);

  const lista = corridas
    .filter((c) => (filtro === "todas" ? true : filtro === "ativas" ? ATIVOS.includes(c.status) : c.status === filtro))
    .filter((c) => norm(`${c.coleta_endereco} ${c.entrega_endereco} ${c.entregadores?.nome ?? ""} ${c.estabelecimentos?.razao_social ?? ""}`).includes(norm(q)));

  return (
    <AdminShell title="Corridas">
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {FILTROS.map((f) => (
          <button
            key={f.k}
            onClick={() => setFiltro(f.k)}
            className="btn"
            style={{ width: "auto", padding: "7px 14px", fontSize: 12.5, background: filtro === f.k ? "var(--brand)" : "#fff", color: filtro === f.k ? "#fff" : "var(--ink-2)", border: "1px solid var(--line-2)" }}
          >
            {f.txt}
          </button>
        ))}
      </div>
      <Busca value={q} onChange={setQ} placeholder="Buscar por endereço, entregador ou negócio…" />

      <div className="card">
        <div className="card-h">
          <Icon name="pkg" />
          <h3>Corridas</h3>
          <span className="right">{lista.length}</span>
        </div>
        <table>
          <tbody>
            <tr><th>Rota</th><th>Entregador</th><th>Valor</th><th>Status</th></tr>
            {lista.map((c) => (
              <tr key={c.id} style={{ cursor: "pointer" }} onClick={() => abrir(c)}>
                <td className="td-name" style={{ fontSize: 12.5 }}>{c.coleta_endereco} → {c.entrega_endereco}</td>
                <td style={{ color: "var(--muted)" }}>{c.entregadores?.nome ?? "—"}</td>
                <td>{money(c.preco_total ?? 0)}</td>
                <td><span className={`status-pill ${ST[c.status]?.cls ?? "s-pend"}`}>{ST[c.status]?.txt ?? c.status}</span></td>
              </tr>
            ))}
            {lista.length === 0 && <tr><td colSpan={4} style={{ color: "var(--faint)", fontSize: 12.5 }}>Nenhuma corrida nesse filtro.</td></tr>}
          </tbody>
        </table>
      </div>

      {sel && <Drawer c={sel} comp={comp} onClose={() => setSel(null)} />}
    </AdminShell>
  );
}

function linha(label: string, ts: string | null, ativo: boolean) {
  return (
    <div className={`step ${ts ? "done" : ativo ? "active" : "pending"}`}>
      <div className="dot"><Icon name="checkThin" /></div>
      <div className="step-txt">
        <div className="t">{label}</div>
        <div className="s">{dt(ts) ?? "—"}</div>
      </div>
    </div>
  );
}

function Drawer({ c, comp, onClose }: { c: Corrida; comp: Comprovante[]; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", zIndex: 200 }} />
      <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "min(440px,100vw)", background: "var(--bg)", borderLeft: "1px solid var(--line)", boxShadow: "var(--shadow-lg)", zIndex: 201, overflowY: "auto", padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>Corrida #{c.id.slice(0, 8)}</div>
          <button className="btn btn-ghost" style={{ width: "auto", padding: "6px 12px" }} onClick={onClose}><Icon name="stop" /></button>
        </div>

        <div className="card">
          <div className="card-h"><Icon name="moto" /><h3>Resumo</h3><span className={`right status-pill ${ST[c.status]?.cls ?? "s-pend"}`}>{ST[c.status]?.txt ?? c.status}</span></div>
          <div className="rpt" style={{ padding: 0 }}><div className="pin o" style={{ marginTop: 5 }} /><div className="txt"><div className="a">{c.coleta_endereco}</div><div className="b">coleta · {c.estabelecimentos?.razao_social ?? "—"}</div></div></div>
          <div className="rpt" style={{ padding: "8px 0 0" }}><div className="pin d" style={{ marginTop: 5 }} /><div className="txt"><div className="a">{c.entrega_endereco}</div><div className="b">entrega{c.distancia_km ? ` · ${c.distancia_km} km` : ""}</div></div></div>
          {c.descricao && <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 10 }}>Conteúdo: {c.descricao}{c.valor_declarado ? ` · declarado ${money(c.valor_declarado)}` : ""}</div>}
          <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 6 }}>Entregador: {c.entregadores?.nome ?? "—"} · {c.vehicle_type}</div>
        </div>

        <div className="card">
          <div className="card-h"><Icon name="money" /><h3>Valores</h3></div>
          <div className="price-line"><span>Frete total</span><span>{money(c.preco_total ?? 0)}</span></div>
          <div className="price-line"><span>Entregador (80%)</span><span>{money(c.preco_entregador ?? 0)}</span></div>
          <div className="price-line"><span>Plataforma (take rate)</span><span>{money(c.preco_plataforma ?? 0)}</span></div>
        </div>

        <div className="card">
          <div className="card-h"><Icon name="list" /><h3>Linha do tempo</h3></div>
          <div className="timeline">
            {linha("Pedido criado", c.created_at, false)}
            {linha("Aceito pelo entregador", c.aceito_at, c.status === "buscando")}
            {linha("Coletado", c.coletado_at, c.status === "aceito" || c.status === "a_caminho_coleta")}
            {linha("Entregue", c.entregue_at, c.status === "coletado" || c.status === "a_caminho_entrega")}
          </div>
        </div>

        <div className="card">
          <div className="card-h"><Icon name="camera" /><h3>Comprovantes</h3></div>
          {comp.length === 0 ? (
            <div style={{ fontSize: 12.5, color: "var(--faint)" }}>Sem comprovante registrado (foto/assinatura entram com a máquina de estados + Storage).</div>
          ) : (
            comp.map((m, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ink-2)", marginBottom: 4 }}>{m.tipo === "coleta" ? "Coleta" : "Entrega"} · {dt(m.created_at)}</div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {m.foto_url && <img src={m.foto_url} alt="comprovante" style={{ width: "100%", borderRadius: 10, marginBottom: 6 }} />}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {m.assinatura_url && <img src={m.assinatura_url} alt="assinatura" style={{ width: "100%", borderRadius: 10, background: "#fff" }} />}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
