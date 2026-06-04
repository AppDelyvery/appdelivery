"use client";

import { useEffect, useState } from "react";
import AdminShell from "./AdminShell";
import { Icon } from "../Icons";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { money } from "@/lib/precos";
import { baixarCSV } from "@/lib/csv";

type Ped = { status: string; preco_plataforma: number | null; preco_entregador: number | null; entregadores: { nome: string } | null };
type Carteira = { razao_social: string; saldo_carteira: number | null };

export default function FinanceiroAdmin() {
  const [peds, setPeds] = useState<Ped[]>([]);
  const [carteiras, setCarteiras] = useState<Carteira[]>([]);

  useEffect(() => {
    (async () => {
      const sb = getBrowserSupabase();
      if (!sb) return;
      const { data } = await sb.from("pedidos").select("status,preco_plataforma,preco_entregador,entregadores(nome)");
      if (data) setPeds(data as unknown as Ped[]);
      const { data: c } = await sb.from("estabelecimentos").select("razao_social,saldo_carteira").order("saldo_carteira", { ascending: false });
      if (c) setCarteiras(c as Carteira[]);
    })();
  }, []);

  const entregues = peds.filter((p) => p.status === "entregue");
  const faturamento = entregues.reduce((s, p) => s + (p.preco_plataforma ?? 0), 0);
  const repassado = entregues.reduce((s, p) => s + (p.preco_entregador ?? 0), 0);

  const porEntregador = new Map<string, number>();
  for (const p of entregues) {
    const k = p.entregadores?.nome ?? "—";
    porEntregador.set(k, (porEntregador.get(k) ?? 0) + (p.preco_entregador ?? 0));
  }
  const repasses = [...porEntregador.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <AdminShell title="Financeiro">
      <div className="kpis">
        <div className="kpi"><div className="ic"><Icon name="money" /></div><div className="v" style={{ fontSize: 18 }}>{money(faturamento)}</div><div className="l">Faturamento (take rate)</div></div>
        <div className="kpi"><div className="ic"><Icon name="moto" /></div><div className="v" style={{ fontSize: 18 }}>{money(repassado)}</div><div className="l">Repassado a entregadores</div></div>
        <div className="kpi"><div className="ic"><Icon name="checkThin" /></div><div className="v">{entregues.length}</div><div className="l">Entregas pagas</div></div>
      </div>

      <div className="card">
        <div className="card-h">
          <Icon name="moto" /><h3>Repasses por entregador</h3>
          <button className="btn btn-ghost right" style={{ width: "auto", padding: "6px 12px", fontSize: 12 }} disabled={repasses.length === 0}
            onClick={() => baixarCSV("repasses-entregadores.csv", [{ chave: "entregador", titulo: "Entregador" }, { chave: "recebido", titulo: "Recebido (R$)" }], repasses.map(([nome, v]) => ({ entregador: nome, recebido: v })))}>
            <Icon name="download" /> Exportar CSV
          </button>
        </div>
        <table>
          <tbody>
            <tr><th>Entregador</th><th>Recebido</th></tr>
            {repasses.map(([nome, v]) => (
              <tr key={nome}><td className="td-name">{nome}</td><td>{money(v)}</td></tr>
            ))}
            {repasses.length === 0 && <tr><td colSpan={2} style={{ color: "var(--faint)", fontSize: 12.5 }}>Sem entregas pagas ainda.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="card">
        <div className="card-h">
          <Icon name="building" /><h3>Carteiras dos lojistas</h3>
          <button className="btn btn-ghost right" style={{ width: "auto", padding: "6px 12px", fontSize: 12 }} disabled={carteiras.length === 0}
            onClick={() => baixarCSV("carteiras-lojistas.csv", [{ chave: "negocio", titulo: "Negócio" }, { chave: "saldo", titulo: "Saldo (R$)" }], carteiras.map((c) => ({ negocio: c.razao_social, saldo: c.saldo_carteira ?? 0 })))}>
            <Icon name="download" /> Exportar CSV
          </button>
        </div>
        <table>
          <tbody>
            <tr><th>Negócio</th><th>Saldo</th></tr>
            {carteiras.map((c) => (
              <tr key={c.razao_social}><td className="td-name">{c.razao_social}</td><td>{money(c.saldo_carteira ?? 0)}</td></tr>
            ))}
            {carteiras.length === 0 && <tr><td colSpan={2} style={{ color: "var(--faint)", fontSize: 12.5 }}>Nenhum negócio.</td></tr>}
          </tbody>
        </table>
      </div>

      <p className="hint">Os números saem dos pedidos entregues. O movimento real do dinheiro (cobrança + repasse automático) liga quando a conta Asaas existir — ver build-spec/06-FINANCEIRO.</p>
    </AdminShell>
  );
}
