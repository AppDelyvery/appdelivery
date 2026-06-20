"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import NegocioShell from "./NegocioShell";
import Busca, { norm } from "../admin/Busca";
import { Icon } from "../Icons";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { money } from "@/lib/precos";

type Ped = {
  id: string;
  status: string;
  coleta_endereco: string;
  entrega_endereco: string;
  preco_total: number | null;
  created_at: string;
  tracking_token: string | null;
};

const ATIVOS = ["buscando", "aceito", "a_caminho_coleta", "coletado", "a_caminho_entrega"];
const ST: Record<string, { txt: string; cls: string }> = {
  rascunho: { txt: "Rascunho", cls: "s-pend" },
  buscando: { txt: "Buscando", cls: "s-pend" },
  aceito: { txt: "Aceito", cls: "s-live" },
  a_caminho_coleta: { txt: "A caminho da coleta", cls: "s-live" },
  coletado: { txt: "Coletado", cls: "s-live" },
  a_caminho_entrega: { txt: "A caminho da entrega", cls: "s-live" },
  entregue: { txt: "Entregue", cls: "s-ok" },
  cancelado: { txt: "Cancelado", cls: "s-pend" },
};
const dt = (s: string) => new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export default function HistoricoNegocio() {
  const [peds, setPeds] = useState<Ped[]>([]);
  const [q, setQ] = useState("");
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    (async () => {
      const sb = getBrowserSupabase();
      if (!sb) return;
      const { data } = await sb
        .from("pedidos")
        .select("id,status,coleta_endereco,entrega_endereco,preco_total,created_at,tracking_token")
        .order("created_at", { ascending: false });
      if (data) setPeds(data as Ped[]);
      setCarregando(false);
    })();
  }, []);

  const lista = peds.filter((p) => norm(`${p.coleta_endereco} ${p.entrega_endereco}`).includes(norm(q)));
  const ativos = peds.filter((p) => ATIVOS.includes(p.status)).length;

  return (
    <NegocioShell title="Histórico">
      <div className="kpis" style={{ marginBottom: 14 }}>
        <div className="kpi"><div className="ic"><Icon name="list" /></div><div className="v">{peds.length}</div><div className="l">Pedidos no total</div></div>
        <div className="kpi"><div className="ic"><Icon name="moto" /></div><div className="v">{ativos}</div><div className="l">Em andamento</div></div>
        <div className="kpi"><div className="ic"><Icon name="checkThin" /></div><div className="v">{peds.filter((p) => p.status === "entregue").length}</div><div className="l">Entregues</div></div>
      </div>

      <div className="card">
        <div className="card-h">
          <Icon name="list" /><h3>Meus pedidos</h3>
          <Link href="/negocio/novo-pedido" className="btn btn-primary right" style={{ width: "auto", padding: "6px 14px", fontSize: 12.5 }}>
            <Icon name="send" /> Nova entrega
          </Link>
        </div>
        <Busca value={q} onChange={setQ} placeholder="Buscar por endereço…" />
        {carregando ? (
          <div style={{ fontSize: 12.5, color: "var(--faint)" }}>Carregando…</div>
        ) : lista.length === 0 ? (
          <div style={{ fontSize: 12.5, color: "var(--faint)" }}>Nenhum pedido ainda. Crie sua primeira entrega.</div>
        ) : (
          <table>
            <tbody>
              <tr><th>Rota</th><th>Valor</th><th>Quando</th><th>Status</th><th></th></tr>
              {lista.map((p) => (
                <tr key={p.id}>
                  <td className="td-name" style={{ fontSize: 12.5 }}>{p.coleta_endereco} → {p.entrega_endereco}</td>
                  <td>{money(p.preco_total ?? 0)}</td>
                  <td style={{ color: "var(--muted)", fontSize: 12 }}>{dt(p.created_at)}</td>
                  <td><span className={`status-pill ${ST[p.status]?.cls ?? "s-pend"}`}>{ST[p.status]?.txt ?? p.status}</span></td>
                  <td>
                    {p.tracking_token && (
                      <Link href={`/rastreio/${p.tracking_token}`} aria-label="Rastrear entrega" title="Rastrear" style={{ color: "var(--brand)", display: "inline-flex" }}>
                        <Icon name="pin" />
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </NegocioShell>
  );
}
