"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import NegocioShell from "./NegocioShell";
import Busca, { norm } from "../admin/Busca";
import { Icon } from "../Icons";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { money } from "@/lib/precos";
import CancelarCorrida from "../CancelarCorrida";

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
const CANCELAVEL = ["rascunho", "buscando", "aceito", "a_caminho_coleta"]; // lojista cancela até antes da coleta
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
  const [sel, setSel] = useState<Ped | null>(null);

  const carregar = useCallback(async () => {
    const sb = getBrowserSupabase();
    if (!sb) return;
    const { data } = await sb
      .from("pedidos")
      .select("id,status,coleta_endereco,entrega_endereco,preco_total,created_at,tracking_token")
      .order("created_at", { ascending: false });
    if (data) setPeds(data as Ped[]);
    setCarregando(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

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
                <tr key={p.id} style={{ cursor: "pointer" }} onClick={() => setSel(p)}>
                  <td className="td-name" style={{ fontSize: 12.5 }}>{p.coleta_endereco} → {p.entrega_endereco}</td>
                  <td style={{ fontVariantNumeric: "tabular-nums" }}>{money(p.preco_total ?? 0)}</td>
                  <td style={{ color: "var(--muted)", fontSize: 12 }}>{dt(p.created_at)}</td>
                  <td><span className={`status-pill ${ST[p.status]?.cls ?? "s-pend"}`}>{ST[p.status]?.txt ?? p.status}</span></td>
                  <td>
                    {p.tracking_token && (
                      <Link href={`/rastreio/${p.tracking_token}`} onClick={(e) => e.stopPropagation()} aria-label="Rastrear entrega" title="Rastrear" style={{ color: "var(--brand)", display: "inline-flex" }}>
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
      <p className="hint">Clique num pedido pra ver o detalhe, acompanhar ao vivo e — se ainda não coletou — cancelar.</p>

      {sel && <Detalhe ped={sel} onClose={() => setSel(null)} onMudou={async () => { await carregar(); setSel(null); }} />}
    </NegocioShell>
  );
}

type StatusNeg = { status: string; entregador: { nome: string; vehicle_type: string; placa: string | null; rating: number | null } | null };
const VEH_TXT: Record<string, string> = { moto: "Moto", carro: "Carro", van: "Van", bike: "Bike" };

function Detalhe({ ped, onClose, onMudou }: { ped: Ped; onClose: () => void; onMudou: () => void }) {
  const [real, setReal] = useState<StatusNeg | null>(null);
  const [cancelar, setCancelar] = useState(false);
  const ativo = ATIVOS.includes(ped.status);

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  // status ao vivo (entregador designado) — só faz sentido pra pedido ativo
  useEffect(() => {
    if (!ativo) return;
    let vivo = true;
    const puxar = async () => {
      const sb = getBrowserSupabase();
      if (!sb) return;
      const { data } = await sb.rpc("status_pedido_negocio", { p_pedido_id: ped.id });
      if (vivo && data) setReal(data as StatusNeg);
    };
    puxar();
    const t = setInterval(puxar, 5000);
    return () => { vivo = false; clearInterval(t); };
  }, [ped.id, ativo]);

  const cancelarPedido = async (motivo: string) => {
    const sb = getBrowserSupabase();
    if (sb) await sb.rpc("cancelar_pedido_estabelecimento", { p_pedido_id: ped.id, p_motivo: motivo });
    setCancelar(false);
    onMudou(); // read-after-write: relê a lista
  };

  const ent = real?.entregador ?? null;
  const statusTxt = (real ? ST[real.status]?.txt : ST[ped.status]?.txt) ?? ped.status;
  const statusCls = (real ? ST[real.status]?.cls : ST[ped.status]?.cls) ?? "s-pend";

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", zIndex: 200 }} />
      <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "min(440px,100vw)", background: "var(--bg)", borderLeft: "1px solid var(--line)", boxShadow: "var(--shadow-lg)", zIndex: 201, overflowY: "auto", padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>Pedido #{ped.id.slice(0, 8)}</div>
          <button className="btn btn-ghost" style={{ width: "auto", padding: "6px 12px" }} onClick={onClose}><Icon name="stop" /></button>
        </div>

        <div className="card">
          <div className="card-h"><Icon name="pkg" /><h3>Resumo</h3><span className={`right status-pill ${statusCls}`}>{statusTxt}</span></div>
          <div className="rpt" style={{ padding: 0 }}><div className="pin o" style={{ marginTop: 5 }} /><div className="txt"><div className="a">{ped.coleta_endereco}</div><div className="b">coleta</div></div></div>
          <div className="rpt" style={{ padding: "8px 0 0" }}><div className="pin d" style={{ marginTop: 5 }} /><div className="txt"><div className="a">{ped.entrega_endereco}</div><div className="b">entrega</div></div></div>
          <div className="price-line total" style={{ marginTop: 10 }}><span>Total</span><span style={{ fontVariantNumeric: "tabular-nums" }}>{money(ped.preco_total ?? 0)}</span></div>
        </div>

        {ativo && (
          <div className="card">
            <div className="card-h"><Icon name="moto" /><h3>Entregador</h3></div>
            {ent ? (
              <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.8 }}>
                {ent.nome}<br />
                {VEH_TXT[ent.vehicle_type] ?? ent.vehicle_type}{ent.placa ? ` · ${ent.placa}` : ""} · nota {ent.rating ?? "—"}
              </div>
            ) : (
              <div style={{ fontSize: 12.5, color: "var(--faint)" }}>Procurando entregador verificado mais próximo…</div>
            )}
          </div>
        )}

        {ped.tracking_token && (
          <Link href={`/rastreio/${ped.tracking_token}`} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ marginBottom: 10 }}>
            <Icon name="pin" /> Acompanhar ao vivo (link do cliente)
          </Link>
        )}

        {CANCELAVEL.includes(ped.status) && (
          <button className="btn btn-ghost" onClick={() => setCancelar(true)}><Icon name="stop" /> Cancelar pedido</button>
        )}
        {ped.status === "coletado" || ped.status === "a_caminho_entrega" ? (
          <p className="hint">Já coletado — não dá pra cancelar pelo app. Abra um chamado no suporte se precisar.</p>
        ) : null}
      </div>

      {cancelar && (
        <CancelarCorrida
          titulo="Cancelar pedido"
          motivos={["Não preciso mais da entrega", "Cliente cancelou a compra", "Vou levar eu mesmo", "Erro no pedido (endereço/itens)", "Demora pra achar entregador", "Outro"]}
          onConfirmar={cancelarPedido}
          onFechar={() => setCancelar(false)}
        />
      )}
    </>
  );
}
