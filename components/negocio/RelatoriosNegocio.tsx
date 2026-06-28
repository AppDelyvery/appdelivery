"use client";

import { useEffect, useState } from "react";
import NegocioShell from "./NegocioShell";
import { Icon } from "../Icons";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { money } from "@/lib/precos";
import { baixarCSV } from "@/lib/csv";

type Ped = {
  id: string;
  status: string;
  coleta_endereco: string;
  entrega_endereco: string;
  vehicle_type: string;
  preco_total: number | null;
  created_at: string;
};

const PERIODOS = [
  { k: "hoje", txt: "Hoje", dias: 1 },
  { k: "7d", txt: "7 dias", dias: 7 },
  { k: "30d", txt: "30 dias", dias: 30 },
  { k: "tudo", txt: "Tudo", dias: 0 },
];
const ATIVOS = ["buscando", "aceito", "a_caminho_coleta", "coletado", "a_caminho_entrega"];
const VEH: Record<string, string> = { moto: "Moto", carro: "Carro", van: "Van", bike: "Bike" };
const dt = (s: string) => new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export default function RelatoriosNegocio() {
  const [peds, setPeds] = useState<Ped[]>([]);
  const [periodo, setPeriodo] = useState("30d");
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    (async () => {
      const sb = getBrowserSupabase();
      if (!sb) return;
      const { data } = await sb
        .from("pedidos")
        .select("id,status,coleta_endereco,entrega_endereco,vehicle_type,preco_total,created_at")
        .order("created_at", { ascending: false });
      if (data) setPeds(data as Ped[]);
      setCarregando(false);
    })();
  }, []);

  const dias = PERIODOS.find((x) => x.k === periodo)?.dias ?? 0;
  const desde = dias ? Date.now() - dias * 86400000 : 0;
  const lista = desde ? peds.filter((p) => new Date(p.created_at).getTime() >= desde) : peds;

  const entregues = lista.filter((p) => p.status === "entregue");
  const ativos = lista.filter((p) => ATIVOS.includes(p.status));
  const cancelados = lista.filter((p) => p.status === "cancelado");
  const gasto = entregues.reduce((s, p) => s + (p.preco_total ?? 0), 0);
  const finalizados = entregues.length + cancelados.length;
  const taxa = finalizados ? Math.round((entregues.length / finalizados) * 100) : null;

  const porVeiculo = (["moto", "carro", "van"] as const).map((v) => ({ v, n: lista.filter((p) => p.vehicle_type === v).length }));

  const exportar = () =>
    baixarCSV(
      "relatorio-entregas.csv",
      [
        { chave: "criado", titulo: "Criado" },
        { chave: "coleta", titulo: "Coleta" },
        { chave: "entrega", titulo: "Entrega" },
        { chave: "veiculo", titulo: "Veículo" },
        { chave: "valor", titulo: "Valor" },
        { chave: "status", titulo: "Status" },
      ],
      lista.map((p) => ({
        criado: dt(p.created_at),
        coleta: p.coleta_endereco,
        entrega: p.entrega_endereco,
        veiculo: VEH[p.vehicle_type] ?? p.vehicle_type,
        valor: p.preco_total ?? 0,
        status: p.status,
      })),
    );

  return (
    <NegocioShell title="Relatórios">
      <div style={{ display: "inline-flex", background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 12, padding: 3, gap: 2, marginBottom: 14, flexWrap: "wrap" }}>
        {PERIODOS.map((f) => {
          const on = periodo === f.k;
          return (
            <button key={f.k} onClick={() => setPeriodo(f.k)}
              style={{ border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, padding: "7px 15px", borderRadius: 9, background: on ? "#fff" : "transparent", color: on ? "var(--brand)" : "var(--muted)", boxShadow: on ? "var(--shadow-sm)" : "none", transition: ".15s" }}>
              {f.txt}
            </button>
          );
        })}
      </div>

      <div className="kpis" style={{ marginBottom: 14 }}>
        <div className="kpi"><div className="ic"><Icon name="pkg" /></div><div className="v">{lista.length}</div><div className="l">Pedidos</div></div>
        <div className="kpi"><div className="ic"><Icon name="checkThin" /></div><div className="v">{entregues.length}</div><div className="l">Entregues</div></div>
        <div className="kpi"><div className="ic"><Icon name="money" /></div><div className="v" style={{ fontSize: 18 }}>{money(gasto)}</div><div className="l">Gasto com frete</div></div>
        <div className="kpi"><div className="ic"><Icon name="moto" /></div><div className="v">{ativos.length}</div><div className="l">Em andamento</div></div>
        <div className="kpi"><div className="ic"><Icon name="chart" /></div><div className="v">{taxa !== null ? `${taxa}%` : "—"}</div><div className="l">Taxa de conclusão</div></div>
        <div className="kpi"><div className="ic"><Icon name="stop" /></div><div className="v">{cancelados.length}</div><div className="l">Cancelados</div></div>
      </div>

      <div className="card">
        <div className="card-h"><Icon name="moto" /><h3>Por veículo</h3></div>
        {(() => {
          const max = Math.max(1, ...porVeiculo.map((x) => x.n));
          return porVeiculo.map((x) => (
            <div key={x.v} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
              <span style={{ width: 70, fontSize: 12.5, color: "var(--ink-2)", display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name={x.v === "carro" ? "car" : x.v === "van" ? "van" : "moto"} />{VEH[x.v]}</span>
              <div style={{ flex: 1, height: 8, background: "var(--line)", borderRadius: 6, overflow: "hidden" }}>
                <div style={{ width: `${(x.n / max) * 100}%`, height: "100%", background: "var(--brand)", transition: "width .3s" }} />
              </div>
              <span style={{ width: 28, textAlign: "right", fontSize: 12.5, fontVariantNumeric: "tabular-nums" }}>{x.n}</span>
            </div>
          ));
        })()}
      </div>

      <div className="card">
        <div className="card-h">
          <Icon name="list" /><h3>Entregas</h3>
          <button className="btn btn-ghost right" style={{ width: "auto", padding: "6px 12px", fontSize: 12 }} disabled={lista.length === 0} onClick={exportar}>
            <Icon name="download" /> Exportar CSV
          </button>
        </div>
        {carregando ? (
          <div style={{ fontSize: 12.5, color: "var(--faint)" }}>Carregando…</div>
        ) : lista.length === 0 ? (
          <div style={{ fontSize: 12.5, color: "var(--faint)" }}>Nenhum pedido no período.</div>
        ) : (
          <table>
            <tbody>
              <tr><th>Rota</th><th>Veículo</th><th>Valor</th><th>Quando</th></tr>
              {lista.slice(0, 50).map((p) => (
                <tr key={p.id}>
                  <td className="td-name" style={{ fontSize: 12.5 }}>{p.coleta_endereco} → {p.entrega_endereco}</td>
                  <td style={{ color: "var(--muted)", fontSize: 12 }}>{VEH[p.vehicle_type] ?? p.vehicle_type}</td>
                  <td style={{ fontVariantNumeric: "tabular-nums" }}>{money(p.preco_total ?? 0)}</td>
                  <td style={{ color: "var(--muted)", fontSize: 12 }}>{dt(p.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {lista.length > 50 && <p className="hint">Mostrando 50 de {lista.length}. Exporte o CSV pra ver tudo.</p>}
      </div>
    </NegocioShell>
  );
}
