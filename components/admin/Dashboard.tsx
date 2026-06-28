"use client";

import { useEffect, useState } from "react";
import AdminShell from "./AdminShell";
import { Icon, type IconName } from "../Icons";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { money } from "@/lib/precos";

type Pedido = {
  id: string;
  status: string;
  preco_total: number | null;
  preco_plataforma: number | null;
  coleta_endereco: string;
  entrega_endereco: string;
  created_at: string;
  aceito_at: string | null;
  entregue_at: string | null;
};

const ATIVOS = ["buscando", "aceito", "a_caminho_coleta", "coletado", "a_caminho_entrega"];
const ST: Record<string, { txt: string; cls: string }> = {
  buscando: { txt: "Buscando", cls: "s-pend" },
  aceito: { txt: "Aceito", cls: "s-live" },
  a_caminho_coleta: { txt: "A caminho da coleta", cls: "s-live" },
  coletado: { txt: "Coletado", cls: "s-live" },
  a_caminho_entrega: { txt: "A caminho da entrega", cls: "s-live" },
  entregue: { txt: "Entregue", cls: "s-ok" },
  cancelado: { txt: "Cancelado", cls: "s-pend" },
};
// resumo de status ativos pro "ao vivo"
const FASES: { k: string; txt: string; cor: string }[] = [
  { k: "buscando", txt: "Buscando", cor: "#d97706" },
  { k: "aceito", txt: "Aceito", cor: "#6366f1" },
  { k: "a_caminho_coleta", txt: "Indo coletar", cor: "#4f46e5" },
  { k: "coletado", txt: "Coletado", cor: "#4338ca" },
  { k: "a_caminho_entrega", txt: "Em entrega", cor: "#7c3aed" },
];

const PERIODOS = [
  { k: "hoje", txt: "Hoje", dias: 1 },
  { k: "7d", txt: "7 dias", dias: 7 },
  { k: "30d", txt: "30 dias", dias: 30 },
  { k: "tudo", txt: "Tudo", dias: 0 },
];

const diaKey = (t: number) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };

export default function Dashboard() {
  const [peds, setPeds] = useState<Pedido[]>([]);
  const [online, setOnline] = useState(0);
  const [periodo, setPeriodo] = useState("tudo");

  useEffect(() => {
    (async () => {
      const sb = getBrowserSupabase();
      if (!sb) return;
      const { data } = await sb
        .from("pedidos")
        .select("id,status,preco_total,preco_plataforma,coleta_endereco,entrega_endereco,created_at,aceito_at,entregue_at")
        .order("created_at", { ascending: false });
      if (data) setPeds(data as Pedido[]);
      const { count } = await sb.from("entregadores").select("id", { count: "exact", head: true }).eq("is_online", true).eq("status", "aprovado");
      if (typeof count === "number") setOnline(count);
    })();
  }, []);

  const emAndamento = peds.filter((p) => ATIVOS.includes(p.status));
  const porFase = FASES.map((f) => ({ ...f, n: emAndamento.filter((p) => p.status === f.k).length }));

  const dias = PERIODOS.find((x) => x.k === periodo)?.dias ?? 0;
  const desde = dias ? Date.now() - dias * 86400000 : 0;
  const noPeriodo = desde ? peds.filter((p) => new Date(p.created_at).getTime() >= desde) : peds;

  const entregues = noPeriodo.filter((p) => p.status === "entregue");
  const cancelados = noPeriodo.filter((p) => p.status === "cancelado");
  const faturamento = entregues.reduce((s, p) => s + (p.preco_plataforma ?? 0), 0);
  const recentes = noPeriodo.slice(0, 8);

  const finalizados = entregues.length + cancelados.length;
  const taxaConclusao = finalizados ? Math.round((entregues.length / finalizados) * 100) : null;
  const tempos = entregues.filter((p) => p.aceito_at && p.entregue_at).map((p) => (new Date(p.entregue_at!).getTime() - new Date(p.aceito_at!).getTime()) / 60000);
  const tempoMedio = tempos.length ? Math.round(tempos.reduce((s, t) => s + t, 0) / tempos.length) : null;

  // tendência: entregas por dia nos últimos 14 dias (independe do filtro de período)
  const hojeK = diaKey(Date.now());
  const entreguesTodos = peds.filter((p) => p.status === "entregue" && p.entregue_at);
  const porDia = Array.from({ length: 14 }, (_, i) => {
    const k = hojeK - (13 - i) * 86400000;
    const n = entreguesTodos.filter((p) => diaKey(new Date(p.entregue_at!).getTime()) === k).length;
    return { k, n, lbl: new Date(k).getDate().toString() };
  });

  return (
    <AdminShell title="Operação">
      {/* período: controle segmentado */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 15 }}>
        <div style={{ display: "inline-flex", background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 12, padding: 3, gap: 2 }}>
          {PERIODOS.map((f) => {
            const on = periodo === f.k;
            return (
              <button key={f.k} onClick={() => setPeriodo(f.k)}
                style={{ border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, padding: "7px 15px", borderRadius: 9,
                  background: on ? "#fff" : "transparent", color: on ? "var(--brand)" : "var(--muted)", boxShadow: on ? "var(--shadow-sm)" : "none", transition: ".15s" }}>
                {f.txt}
              </button>
            );
          })}
        </div>
      </div>

      {/* KPIs — hierarquia por acento */}
      <div className="kpis">
        <Kpi ic="moto" cor="var(--brand)" valor={emAndamento.length} label="Em andamento" />
        <Kpi ic="moto" cor="var(--go)" valor={online} label="Entregadores online" />
        <Kpi ic="checkThin" valor={entregues.length} label="Entregas concluídas" />
        <Kpi ic="money" cor="var(--go)" valor={money(faturamento)} label="Take da plataforma" />
        <Kpi ic="chart" valor={taxaConclusao !== null ? `${taxaConclusao}%` : "—"} label="Taxa de conclusão" />
        <Kpi ic="clock" valor={tempoMedio !== null ? `${tempoMedio} min` : "—"} label="Tempo médio" />
      </div>

      {/* Operação ao vivo */}
      <div className="card">
        <div className="card-h"><Icon name="moto" /><h3>Operação ao vivo</h3><span className="right">{emAndamento.length} ativas</span></div>
        {emAndamento.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--muted)", textAlign: "center", padding: "16px 0" }}>Nenhuma corrida ativa agora.</div>
        ) : (
          <>
            {/* barra empilhada por fase */}
            <div style={{ display: "flex", height: 10, borderRadius: 6, overflow: "hidden", background: "var(--line)", marginBottom: 12 }}>
              {porFase.filter((f) => f.n > 0).map((f) => (
                <div key={f.k} title={`${f.txt}: ${f.n}`} style={{ width: `${(f.n / emAndamento.length) * 100}%`, background: f.cor }} />
              ))}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 14 }}>
              {porFase.map((f) => (
                <div key={f.k} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: f.n ? "var(--ink-2)" : "var(--faint)" }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: f.n ? f.cor : "var(--line-2)" }} />
                  {f.txt}<b style={{ fontVariantNumeric: "tabular-nums" }}>{f.n}</b>
                </div>
              ))}
            </div>
            {emAndamento.slice(0, 5).map((p) => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "9px 0", borderTop: "1px solid var(--line)" }}>
                <div style={{ minWidth: 0 }}>
                  <div className="td-name" style={{ fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.coleta_endereco} → {p.entrega_endereco}</div>
                  <div style={{ color: "var(--muted)", fontSize: 11.5, fontVariantNumeric: "tabular-nums" }}>{money(p.preco_total ?? 0)}</div>
                </div>
                <span className={`status-pill ${ST[p.status]?.cls ?? "s-pend"}`}>{ST[p.status]?.txt ?? p.status}</span>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Entregas por dia — mini gráfico */}
      <div className="card">
        <div className="card-h"><Icon name="chart" /><h3>Entregas por dia</h3><span className="right">últimos 14 dias</span></div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 132, padding: "10px 2px 0" }}>
          {porDia.map((d, i) => {
            const max = Math.max(...porDia.map((x) => x.n), 1);
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 0 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--ink-2)", fontVariantNumeric: "tabular-nums", height: 13 }}>{d.n || ""}</div>
                <div title={`${d.n} entregas`} style={{ width: "100%", maxWidth: 30, height: Math.max((d.n / max) * 90, d.n ? 6 : 2), background: d.n ? "var(--brand)" : "var(--line)", borderRadius: 5, transition: ".2s" }} />
                <div style={{ fontSize: 9.5, color: "var(--faint)", fontVariantNumeric: "tabular-nums" }}>{d.lbl}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Últimas corridas */}
      <div className="card">
        <div className="card-h"><Icon name="list" /><h3>Últimas corridas</h3></div>
        <table>
          <tbody>
            <tr><th>Rota</th><th>Valor</th><th>Status</th></tr>
            {recentes.map((p) => (
              <tr key={p.id}>
                <td className="td-name" style={{ fontSize: 12.5 }}>{p.coleta_endereco} → {p.entrega_endereco}</td>
                <td style={{ fontVariantNumeric: "tabular-nums" }}>{money(p.preco_total ?? 0)}</td>
                <td><span className={`status-pill ${ST[p.status]?.cls ?? "s-pend"}`}>{ST[p.status]?.txt ?? p.status}</span></td>
              </tr>
            ))}
            {recentes.length === 0 && <tr><td colSpan={3} style={{ color: "var(--faint)", fontSize: 12.5 }}>Nenhuma corrida ainda.</td></tr>}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}

function Kpi({ ic, valor, label, cor }: { ic: IconName; valor: string | number; label: string; cor?: string }) {
  return (
    <div className="kpi">
      <div className="ic"><Icon name={ic} /></div>
      <div className="v" style={cor ? { color: cor } : undefined}>{valor}</div>
      <div className="l">{label}</div>
    </div>
  );
}
