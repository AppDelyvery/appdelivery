"use client";

import { useEffect, useState } from "react";
import AdminShell from "./AdminShell";
import { Icon } from "../Icons";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { money } from "@/lib/precos";
import { baixarCSV } from "@/lib/csv";

type Ped = { status: string; preco_plataforma: number | null; preco_entregador: number | null; entregadores: { nome: string } | null };
type Carteira = { razao_social: string; saldo_carteira: number | null };

// composição completa vinda do RPC composicao_financeira() (server-side, admin)
type Comp = {
  passivo_lojistas: number; passivo_entregadores: number; caixa_liquido: number; total_em_conta: number;
  take_bruto: number; taxa_recargas: number; margem_pct: number;
  fretes_entregues: number; n_entregues: number;
  recargas_total: number; n_recargas: number; saques_total: number; n_saques: number; saques_processando: number;
  taxa_recarga_unit: number;
};

const pct = (v: number, total: number) => (total > 0 ? (v / total) * 100 : 0);

export default function FinanceiroAdmin() {
  const [peds, setPeds] = useState<Ped[]>([]);
  const [carteiras, setCarteiras] = useState<Carteira[]>([]);
  const [comp, setComp] = useState<Comp | null>(null);

  useEffect(() => {
    (async () => {
      const sb = getBrowserSupabase();
      if (!sb) return;
      const { data: cf } = await sb.rpc("composicao_financeira");
      if (cf) setComp(cf as Comp);
      const { data } = await sb.from("pedidos").select("status,preco_plataforma,preco_entregador,entregadores(nome)");
      if (data) setPeds(data as unknown as Ped[]);
      const { data: c } = await sb.from("estabelecimentos").select("razao_social,saldo_carteira").order("saldo_carteira", { ascending: false });
      if (c) setCarteiras(c as Carteira[]);
    })();
  }, []);

  const entregues = peds.filter((p) => p.status === "entregue");
  const porEntregador = new Map<string, number>();
  for (const p of entregues) {
    const k = p.entregadores?.nome ?? "—";
    porEntregador.set(k, (porEntregador.get(k) ?? 0) + (p.preco_entregador ?? 0));
  }
  const repasses = [...porEntregador.entries()].sort((a, b) => b[1] - a[1]);

  const total = comp?.total_em_conta ?? 0;

  return (
    <AdminShell title="Financeiro">
      {/* ───────── Composição do saldo: de quem é o dinheiro na conta (custódia) ───────── */}
      <div className="card">
        <div className="card-h"><Icon name="building" /><h3>Composição do saldo — de quem é o dinheiro</h3></div>
        <div style={{ padding: "4px 2px 2px" }}>
          <div style={{ fontSize: 12.5, color: "var(--faint)" }}>Total parado na conta Asaas</div>
          <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em", margin: "2px 0 14px" }}>{money(total)}</div>

          {/* barra de proporção — mostra o quanto é da plataforma vs de terceiros */}
          {comp && (
            <div style={{ display: "flex", height: 14, borderRadius: 7, overflow: "hidden", marginBottom: 16, background: "var(--line)" }}>
              <div title="Crédito das lojas" style={{ width: `${pct(comp.passivo_lojistas, total)}%`, background: "#64748b" }} />
              <div title="A sacar (entregadores)" style={{ width: `${pct(comp.passivo_entregadores, total)}%`, background: "#94a3b8" }} />
              <div title="Caixa da plataforma" style={{ width: `${Math.max(pct(comp.caixa_liquido, total), 0.6)}%`, background: "#059669" }} />
            </div>
          )}

          <div style={{ display: "grid", gap: 10 }}>
            <BucketRow color="#64748b" label="Crédito pré-pago dos lojistas" sub="passivo — você deve de volta às lojas" valor={comp?.passivo_lojistas ?? 0} share={pct(comp?.passivo_lojistas ?? 0, total)} />
            <BucketRow color="#94a3b8" label="Saldo a sacar dos entregadores" sub="passivo — ganho ainda não sacado" valor={comp?.passivo_entregadores ?? 0} share={pct(comp?.passivo_entregadores ?? 0, total)} />
            <BucketRow color="#059669" label="Caixa da plataforma (líquido)" sub="ISTO é do app — take 20% já menos as taxas" valor={comp?.caixa_liquido ?? 0} share={pct(comp?.caixa_liquido ?? 0, total)} destaque />
          </div>

          <p className="hint" style={{ marginTop: 14 }}>
            Esse total tem que <b>bater com o saldo real da conta Asaas</b> (reconciliação). Dos {money(total)},
            só <b style={{ color: "#059669" }}>{money(comp?.caixa_liquido ?? 0)}</b> são da plataforma — o resto é dinheiro de terceiros.
          </p>
        </div>
      </div>

      {/* ───────── Margem: de onde vem o caixa líquido ───────── */}
      <div className="card">
        <div className="card-h"><Icon name="money" /><h3>Margem real (take − taxas Asaas)</h3></div>
        <table>
          <tbody>
            <tr><td className="td-name">Take bruto (20% dos fretes)</td><td>{money(comp?.take_bruto ?? 0)}</td></tr>
            <tr><td className="td-name" style={{ color: "var(--faint)" }}>(−) Taxas Asaas — {comp?.n_recargas ?? 0} recargas × {money(comp?.taxa_recarga_unit ?? 1.99)}</td><td style={{ color: "#b45309" }}>− {money(comp?.taxa_recargas ?? 0)}</td></tr>
            <tr style={{ fontWeight: 700 }}><td className="td-name" style={{ color: "#059669" }}>= Caixa líquido</td><td style={{ color: "#059669" }}>{money(comp?.caixa_liquido ?? 0)}</td></tr>
            <tr><td className="td-name">Margem efetiva sobre o frete</td><td>{(comp?.margem_pct ?? 0).toFixed(1)}%</td></tr>
          </tbody>
        </table>
        <p className="hint">A taxa de R$ {(comp?.taxa_recarga_unit ?? 1.99).toFixed(2)} é fixa por recarga — recarga maior e menos frequente dilui melhor a margem.</p>
      </div>

      {/* ───────── Fluxo: entradas, saídas, movimentação ───────── */}
      <div className="kpis">
        <div className="kpi"><div className="ic"><Icon name="download" /></div><div className="v" style={{ fontSize: 18 }}>{money(comp?.recargas_total ?? 0)}</div><div className="l">Recargas — entrada ({comp?.n_recargas ?? 0})</div></div>
        <div className="kpi"><div className="ic"><Icon name="moto" /></div><div className="v" style={{ fontSize: 18 }}>{money(comp?.saques_total ?? 0)}</div><div className="l">Saques — saída ({comp?.n_saques ?? 0})</div></div>
        <div className="kpi"><div className="ic"><Icon name="money" /></div><div className="v" style={{ fontSize: 18 }}>{money(comp?.fretes_entregues ?? 0)}</div><div className="l">Fretes movimentados ({comp?.n_entregues ?? 0})</div></div>
        <div className="kpi"><div className="ic"><Icon name="checkThin" /></div><div className="v" style={{ fontSize: 18 }}>{money(comp?.saques_processando ?? 0)}</div><div className="l">Saques em processamento</div></div>
      </div>

      {/* ───────── Detalhe: repasses por entregador ───────── */}
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

      {/* ───────── Detalhe: carteiras dos lojistas ───────── */}
      <div className="card">
        <div className="card-h">
          <Icon name="building" /><h3>Carteiras dos lojistas (crédito pré-pago)</h3>
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

      <p className="hint">O movimento real do dinheiro (recarga Pix + repasse + saque) liga quando a conta Asaas existir. As taxas (R$ {(comp?.taxa_recarga_unit ?? 1.99).toFixed(2)}/recarga) já entram no cálculo da margem.</p>
    </AdminShell>
  );
}

function BucketRow({ color, label, sub, valor, share, destaque }: { color: string; label: string; sub: string; valor: number; share: number; destaque?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 10, background: destaque ? "rgba(5,150,105,0.07)" : "rgba(0,0,0,0.02)", border: destaque ? "1px solid rgba(5,150,105,0.25)" : "1px solid var(--line)" }}>
      <span style={{ width: 10, height: 10, borderRadius: 3, background: color, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: destaque ? 700 : 600, color: destaque ? "#059669" : "var(--ink)" }}>{label}</div>
        <div style={{ fontSize: 11.5, color: "var(--faint)" }}>{sub}</div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: destaque ? "#059669" : "var(--ink)" }}>{money(valor)}</div>
        <div style={{ fontSize: 11, color: "var(--faint)" }}>{share.toFixed(1)}%</div>
      </div>
    </div>
  );
}
