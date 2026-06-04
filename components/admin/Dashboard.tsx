"use client";

import { useEffect, useState } from "react";
import AdminShell from "./AdminShell";
import { Icon } from "../Icons";
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

export default function Dashboard() {
  const [peds, setPeds] = useState<Pedido[]>([]);
  const [aprovados, setAprovados] = useState(0);

  useEffect(() => {
    (async () => {
      const sb = getBrowserSupabase();
      if (!sb) return;
      const { data } = await sb
        .from("pedidos")
        .select("id,status,preco_total,preco_plataforma,coleta_endereco,entrega_endereco,created_at")
        .order("created_at", { ascending: false });
      if (data) setPeds(data as Pedido[]);
      const { count } = await sb.from("entregadores").select("id", { count: "exact", head: true }).eq("status", "aprovado");
      if (typeof count === "number") setAprovados(count);
    })();
  }, []);

  const emAndamento = peds.filter((p) => ATIVOS.includes(p.status));
  const faturamento = peds.filter((p) => p.status === "entregue").reduce((s, p) => s + (p.preco_plataforma ?? 0), 0);
  const recentes = peds.slice(0, 8);

  return (
    <AdminShell title="Dashboard">
      <div className="kpis">
        <div className="kpi">
          <div className="ic"><Icon name="moto" /></div>
          <div className="v">{emAndamento.length}</div>
          <div className="l">Em andamento</div>
        </div>
        <div className="kpi">
          <div className="ic"><Icon name="checkThin" /></div>
          <div className="v">{aprovados}</div>
          <div className="l">Entregadores aprovados</div>
        </div>
        <div className="kpi">
          <div className="ic"><Icon name="money" /></div>
          <div className="v" style={{ fontSize: 19 }}>{money(faturamento)}</div>
          <div className="l">Faturamento (take rate)</div>
        </div>
      </div>

      <div className="card">
        <div className="card-h">
          <Icon name="moto" />
          <h3>Corridas em andamento</h3>
          <span className="right">{emAndamento.length}</span>
        </div>
        {emAndamento.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--muted)", textAlign: "center", padding: "12px 0" }}>
            Nenhuma corrida ativa agora.
          </div>
        ) : (
          emAndamento.slice(0, 6).map((p) => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid var(--line)" }}>
              <div style={{ minWidth: 0 }}>
                <div className="td-name" style={{ fontSize: 13 }}>{p.coleta_endereco} → {p.entrega_endereco}</div>
                <div style={{ color: "var(--muted)", fontSize: 11.5 }}>{money(p.preco_total ?? 0)}</div>
              </div>
              <span className={`status-pill ${ST[p.status]?.cls ?? "s-pend"}`}>{ST[p.status]?.txt ?? p.status}</span>
            </div>
          ))
        )}
      </div>

      <div className="card">
        <div className="card-h">
          <Icon name="list" />
          <h3>Últimas corridas</h3>
        </div>
        <table>
          <tbody>
            <tr><th>Rota</th><th>Valor</th><th>Status</th></tr>
            {recentes.map((p) => (
              <tr key={p.id}>
                <td className="td-name" style={{ fontSize: 12.5 }}>{p.coleta_endereco} → {p.entrega_endereco}</td>
                <td>{money(p.preco_total ?? 0)}</td>
                <td><span className={`status-pill ${ST[p.status]?.cls ?? "s-pend"}`}>{ST[p.status]?.txt ?? p.status}</span></td>
              </tr>
            ))}
            {recentes.length === 0 && (
              <tr><td colSpan={3} style={{ color: "var(--faint)", fontSize: 12.5 }}>Nenhuma corrida ainda.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
