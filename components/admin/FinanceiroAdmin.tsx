"use client";

import { useEffect, useState, type ComponentProps } from "react";
import AdminShell from "./AdminShell";
import { Icon } from "../Icons";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { money } from "@/lib/precos";
import { baixarCSV } from "@/lib/csv";

type Ped = { status: string; preco_plataforma: number | null; preco_entregador: number | null; entregadores: { nome: string } | null };
type Carteira = { razao_social: string; saldo_carteira: number | null };

type Comp = {
  passivo_lojistas: number; passivo_entregadores: number; caixa_liquido: number; total_em_conta: number;
  take_bruto: number; taxa_recargas: number; margem_pct: number;
  fretes_entregues: number; n_entregues: number;
  recargas_total: number; n_recargas: number; saques_total: number; n_saques: number; saques_processando: number;
  taxa_recarga_unit: number;
};

const COR = { loja: "#64748b", ent: "#94a3b8", plat: "#059669", indigo: "#4f46e5", amber: "#b45309" };
const pct = (v: number, total: number) => (total > 0 ? (v / total) * 100 : 0);
const abbr = (v: number) => (v >= 1000 ? "R$ " + (v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " mil" : money(v));

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
    const nome = p.entregadores?.nome;
    if (!nome || (p.preco_entregador ?? 0) <= 0) continue; // ignora entregue sem entregador/preço (dado órfão)
    porEntregador.set(nome, (porEntregador.get(nome) ?? 0) + (p.preco_entregador ?? 0));
  }
  const repasses = [...porEntregador.entries()].sort((a, b) => b[1] - a[1]);
  const topRep = repasses.slice(0, 8);
  const maxRep = topRep.length ? topRep[0][1] : 1;

  const total = comp?.total_em_conta ?? 0;
  const seg = comp
    ? [
        { label: "Crédito dos lojistas", sub: "passivo — devido às lojas", value: comp.passivo_lojistas, color: COR.loja },
        { label: "A sacar — entregadores", sub: "passivo — ganho não sacado", value: comp.passivo_entregadores, color: COR.ent },
        { label: "Caixa da plataforma", sub: "líquido — isto é do app", value: comp.caixa_liquido, color: COR.plat },
      ]
    : [];

  return (
    <AdminShell title="Financeiro">
      {/* ───────── Hero: pizza de custódia (de quem é o dinheiro) ───────── */}
      <div className="card">
        <div className="card-h"><Icon name="building" /><h3>Composição do saldo — de quem é o dinheiro</h3></div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "center", padding: "6px 2px" }}>
          <div style={{ flex: "0 0 auto", margin: "0 auto" }}>
            <Donut segments={seg} total={total} centro={abbr(total)} legenda="na conta" />
          </div>
          <div style={{ flex: "1 1 280px", minWidth: 260, display: "grid", gap: 9 }}>
            {seg.map((s) => (
              <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", borderRadius: 11,
                background: s.color === COR.plat ? "rgba(5,150,105,0.07)" : "rgba(100,116,139,0.06)",
                border: s.color === COR.plat ? "1px solid rgba(5,150,105,0.25)" : "1px solid var(--line)" }}>
                <span style={{ width: 11, height: 11, borderRadius: 3, background: s.color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: s.color === COR.plat ? 700 : 600, color: s.color === COR.plat ? COR.plat : "var(--ink)" }}>{s.label}</div>
                  <div style={{ fontSize: 11.5, color: "var(--faint)" }}>{s.sub}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: s.color === COR.plat ? COR.plat : "var(--ink)" }}>{money(s.value)}</div>
                  <div style={{ fontSize: 11, color: "var(--faint)", fontVariantNumeric: "tabular-nums" }}>{pct(s.value, total).toFixed(1)}%</div>
                </div>
              </div>
            ))}
            <p className="hint" style={{ margin: "4px 2px 0" }}>
              Dos <b style={{ fontVariantNumeric: "tabular-nums" }}>{money(total)}</b> na conta, só <b style={{ color: COR.plat, fontVariantNumeric: "tabular-nums" }}>{money(comp?.caixa_liquido ?? 0)}</b> são da plataforma. O resto é dinheiro de terceiros — tem que bater com o saldo real do Asaas.
            </p>
          </div>
        </div>
      </div>

      {/* ───────── KPIs principais ───────── */}
      <div className="kpis">
        <Kpi cor={COR.plat} valor={money(comp?.caixa_liquido ?? 0)} label="Caixa líquido (da plataforma)" forte />
        <Kpi valor={money(comp?.take_bruto ?? 0)} label="Take bruto (20%)" />
        <Kpi cor={COR.amber} valor={"− " + money(comp?.taxa_recargas ?? 0)} label={`Taxas Asaas (${comp?.n_recargas ?? 0} recargas)`} />
        <Kpi valor={(comp?.margem_pct ?? 0).toFixed(1) + "%"} label="Margem efetiva no frete" />
      </div>

      {/* ───────── Margem: take − taxas = líquido ───────── */}
      <div className="card">
        <div className="card-h"><Icon name="money" /><h3>Margem real (take − taxas Asaas)</h3></div>
        <table className="tbl-num">
          <tbody>
            <tr><td className="td-name">Take bruto (20% dos fretes)</td><td>{money(comp?.take_bruto ?? 0)}</td></tr>
            <tr><td className="td-name" style={{ color: "var(--faint)" }}>(−) Taxas Asaas — {comp?.n_recargas ?? 0} × {money(comp?.taxa_recarga_unit ?? 1.99)}</td><td style={{ color: COR.amber }}>− {money(comp?.taxa_recargas ?? 0)}</td></tr>
            <tr style={{ fontWeight: 700 }}><td className="td-name" style={{ color: COR.plat }}>= Caixa líquido</td><td style={{ color: COR.plat }}>{money(comp?.caixa_liquido ?? 0)}</td></tr>
          </tbody>
        </table>
        <p className="hint">A taxa de {money(comp?.taxa_recarga_unit ?? 1.99)} é fixa por recarga — recarga maior e menos frequente dilui melhor a margem.</p>
      </div>

      {/* ───────── Fluxo ───────── */}
      <div className="kpis">
        <Kpi icon="download" valor={money(comp?.recargas_total ?? 0)} label={`Recargas — entrada (${comp?.n_recargas ?? 0})`} />
        <Kpi icon="moto" valor={money(comp?.saques_total ?? 0)} label={`Saques — saída (${comp?.n_saques ?? 0})`} />
        <Kpi icon="money" valor={money(comp?.fretes_entregues ?? 0)} label={`Fretes movimentados (${comp?.n_entregues ?? 0})`} />
        <Kpi icon="checkThin" valor={money(comp?.saques_processando ?? 0)} label="Saques em processamento" />
      </div>

      {/* ───────── Barras: top entregadores por repasse ───────── */}
      <div className="card">
        <div className="card-h">
          <Icon name="moto" /><h3>Top entregadores por repasse</h3>
          <button className="btn btn-ghost right" style={{ width: "auto", padding: "6px 12px", fontSize: 12 }} disabled={repasses.length === 0}
            onClick={() => baixarCSV("repasses-entregadores.csv", [{ chave: "entregador", titulo: "Entregador" }, { chave: "recebido", titulo: "Recebido (R$)" }], repasses.map(([nome, v]) => ({ entregador: nome, recebido: v })))}>
            <Icon name="download" /> Exportar CSV
          </button>
        </div>
        <div style={{ display: "grid", gap: 11, padding: "4px 2px" }}>
          {topRep.map(([nome, v]) => (
            <div key={nome} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 130, flexShrink: 0, fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nome}</div>
              <div style={{ flex: 1, height: 22, borderRadius: 6, background: "var(--line)", overflow: "hidden" }}>
                <div style={{ width: `${Math.max(pct(v, maxRep), 2)}%`, height: "100%", background: COR.indigo, borderRadius: 6 }} />
              </div>
              <div style={{ width: 92, flexShrink: 0, textAlign: "right", fontSize: 12.5, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{money(v)}</div>
            </div>
          ))}
          {topRep.length === 0 && <p className="hint">Sem entregas pagas ainda.</p>}
        </div>
      </div>

      {/* ───────── Carteiras dos lojistas ───────── */}
      <div className="card">
        <div className="card-h">
          <Icon name="building" /><h3>Carteiras dos lojistas (crédito pré-pago)</h3>
          <button className="btn btn-ghost right" style={{ width: "auto", padding: "6px 12px", fontSize: 12 }} disabled={carteiras.length === 0}
            onClick={() => baixarCSV("carteiras-lojistas.csv", [{ chave: "negocio", titulo: "Negócio" }, { chave: "saldo", titulo: "Saldo (R$)" }], carteiras.map((c) => ({ negocio: c.razao_social, saldo: c.saldo_carteira ?? 0 })))}>
            <Icon name="download" /> Exportar CSV
          </button>
        </div>
        <table className="tbl-num">
          <tbody>
            <tr><th>Negócio</th><th>Saldo</th></tr>
            {carteiras.map((c) => (
              <tr key={c.razao_social}><td className="td-name">{c.razao_social}</td><td>{money(c.saldo_carteira ?? 0)}</td></tr>
            ))}
            {carteiras.length === 0 && <tr><td colSpan={2} style={{ color: "var(--faint)", fontSize: 12.5 }}>Nenhum negócio.</td></tr>}
          </tbody>
        </table>
      </div>

      <p className="hint">O movimento real do dinheiro (recarga Pix + repasse + saque) liga quando a conta Asaas existir. A taxa ({money(comp?.taxa_recarga_unit ?? 1.99)}/recarga) já entra no cálculo da margem.</p>

      <style>{`.tbl-num td:last-child, .tbl-num th:last-child { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }`}</style>
    </AdminShell>
  );
}

// Card KPI moderno
function Kpi({ valor, label, icon, cor, forte }: { valor: string; label: string; icon?: ComponentProps<typeof Icon>["name"]; cor?: string; forte?: boolean }) {
  return (
    <div className="kpi" style={forte ? { borderColor: "rgba(5,150,105,0.3)", background: "rgba(5,150,105,0.05)" } : undefined}>
      {icon && <div className="ic"><Icon name={icon} /></div>}
      <div className="v" style={{ fontSize: 19, fontVariantNumeric: "tabular-nums", color: cor }}>{valor}</div>
      <div className="l">{label}</div>
    </div>
  );
}

// Gráfico de rosca (pizza) em SVG puro — segmentos por stroke-dasharray
function Donut({ segments, total, centro, legenda }: { segments: { value: number; color: string }[]; total: number; centro: string; legenda: string }) {
  const size = 196, thickness = 30, r = (size - thickness) / 2, C = 2 * Math.PI * r, cx = size / 2;
  const soma = segments.reduce((s, x) => s + Math.max(x.value, 0), 0) || 1;
  let acc = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Composição do saldo">
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--line)" strokeWidth={thickness} />
      <g transform={`rotate(-90 ${cx} ${cx})`}>
        {segments.map((s, i) => {
          const frac = Math.max(s.value, 0) / soma;
          const len = Math.max(frac * C, frac > 0 ? 1.5 : 0); // garante sliver visível p/ fatia minúscula
          const offset = -acc * C;
          acc += frac;
          return <circle key={i} cx={cx} cy={cx} r={r} fill="none" stroke={s.color} strokeWidth={thickness} strokeDasharray={`${len} ${C - len}`} strokeDashoffset={offset} strokeLinecap="butt" />;
        })}
      </g>
      <text x={cx} y={cx - 6} textAnchor="middle" style={{ fontSize: 19, fontWeight: 800, fill: "var(--ink)" }}>{centro}</text>
      <text x={cx} y={cx + 13} textAnchor="middle" style={{ fontSize: 10.5, fill: "var(--faint)" }}>{legenda}</text>
    </svg>
  );
}
