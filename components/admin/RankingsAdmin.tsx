"use client";

import { useEffect, useState } from "react";
import AdminShell from "./AdminShell";
import { Icon, type IconName } from "../Icons";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { money } from "@/lib/precos";

type Pedido = {
  status: string;
  preco_total: number | null;
  coleta_endereco: string;
  entregadores: { nome: string } | null;
  estabelecimentos: { razao_social: string } | null;
};
type Item = { nome: string; valor: number; sub?: string };

const zona = (e: string) => {
  const q = e.match(/Q\.?\s?\d+\s*(Norte|Sul|Leste|Oeste)?/i);
  if (q) return q[0].replace(/\s+/g, " ").trim();
  const r = e.match(/(Norte|Sul|Leste|Oeste|Centro)/i);
  return r ? r[1] : "Outros";
};

function agrupar(peds: Pedido[], chave: (p: Pedido) => string | null, val: (g: Pedido[]) => { valor: number; sub?: string }): Item[] {
  const map = new Map<string, Pedido[]>();
  for (const p of peds) {
    const k = chave(p);
    if (!k) continue;
    (map.get(k) ?? map.set(k, []).get(k)!).push(p);
  }
  return [...map.entries()]
    .map(([nome, g]) => ({ nome, ...val(g) }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 6);
}

function Ranking({ titulo, ic, itens, fmt }: { titulo: string; ic: IconName; itens: Item[]; fmt: (n: number) => string }) {
  const max = Math.max(1, ...itens.map((i) => i.valor));
  return (
    <div className="card">
      <div className="card-h"><Icon name={ic} /><h3>{titulo}</h3></div>
      {itens.length === 0 ? (
        <div style={{ fontSize: 12.5, color: "var(--faint)", padding: "8px 0" }}>Sem dados ainda.</div>
      ) : (
        itens.map((i, idx) => (
          <div key={i.nome} style={{ marginBottom: 11 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
              <span style={{ fontWeight: 700 }}>
                <span style={{ color: "var(--faint)", marginRight: 6 }}>{idx + 1}.</span>{i.nome}
                {i.sub && <span style={{ color: "var(--muted)", fontWeight: 500 }}> · {i.sub}</span>}
              </span>
              <span style={{ fontWeight: 800, color: "var(--brand)" }}>{fmt(i.valor)}</span>
            </div>
            <div style={{ height: 7, background: "var(--line)", borderRadius: 5, overflow: "hidden" }}>
              <div style={{ width: `${(i.valor / max) * 100}%`, height: "100%", background: "var(--brand)", borderRadius: 5 }} />
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default function RankingsAdmin() {
  const [peds, setPeds] = useState<Pedido[]>([]);

  useEffect(() => {
    (async () => {
      const sb = getBrowserSupabase();
      if (!sb) return;
      const { data } = await sb.from("pedidos").select("status,preco_total,coleta_endereco,entregadores(nome),estabelecimentos(razao_social)");
      if (data) setPeds(data as unknown as Pedido[]);
    })();
  }, []);

  const entregues = peds.filter((p) => p.status === "entregue");

  const topEntregadores = agrupar(entregues, (p) => p.entregadores?.nome ?? null, (g) => ({ valor: g.length, sub: `${g.length} entrega(s)` }));
  const topEmpresas = agrupar(peds, (p) => p.estabelecimentos?.razao_social ?? null, (g) => ({ valor: g.length, sub: money(g.reduce((s, p) => s + (p.preco_total ?? 0), 0)) }));
  const topAreas = agrupar(peds, (p) => zona(p.coleta_endereco), (g) => ({ valor: g.length }));

  return (
    <AdminShell title="Rankings">
      <Ranking titulo="Melhores entregadores" ic="moto" itens={topEntregadores} fmt={(n) => `${n}`} />
      <Ranking titulo="Melhores empresas" ic="building" itens={topEmpresas} fmt={(n) => `${n} pedido(s)`} />
      <Ranking titulo="Áreas com mais demanda" ic="pin" itens={topAreas} fmt={(n) => `${n}`} />
      <p className="hint">Entregadores rankeiam por entregas concluídas; empresas por nº de pedidos (+ gasto); áreas pela quadra de coleta. Fica mais rico conforme o app roda.</p>
    </AdminShell>
  );
}
