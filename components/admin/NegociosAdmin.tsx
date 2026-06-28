"use client";

import { useCallback, useEffect, useState } from "react";
import AdminShell from "./AdminShell";
import Busca, { norm } from "./Busca";
import { Icon } from "../Icons";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { money } from "@/lib/precos";
import { definirAtivoNegocio } from "@/actions/moderarNegocio";

type Negocio = { id: string; razao_social: string; cnpj: string | null; endereco: string | null; telefone: string | null; saldo_carteira: number | null; ativo: boolean };

export default function NegociosAdmin() {
  const [negocios, setNegocios] = useState<Negocio[]>([]);
  const [sel, setSel] = useState<Negocio | null>(null);
  const [q, setQ] = useState("");
  const [mostrar, setMostrar] = useState(30);
  const filtrados = negocios.filter((n) => norm(`${n.razao_social} ${n.cnpj ?? ""}`).includes(norm(q)));
  const visiveis = filtrados.slice(0, mostrar);
  const ativos = negocios.filter((n) => n.ativo).length;
  const saldoTotal = negocios.reduce((s, n) => s + (n.saldo_carteira ?? 0), 0);

  const carregar = useCallback(async () => {
    const sb = getBrowserSupabase();
    if (!sb) return;
    const { data } = await sb.from("estabelecimentos").select("id,razao_social,cnpj,endereco,telefone,saldo_carteira,ativo").order("created_at", { ascending: false });
    if (data) setNegocios(data as Negocio[]);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregar();
  }, [carregar]);

  return (
    <AdminShell title="Negócios">
      <div className="kpis" style={{ marginBottom: 14 }}>
        <div className="kpi"><div className="ic"><Icon name="building" /></div><div className="v">{negocios.length}</div><div className="l">Negócios</div></div>
        <div className="kpi"><div className="ic"><Icon name="checkThin" /></div><div className="v" style={{ color: "var(--go)" }}>{ativos}</div><div className="l">Ativos</div></div>
        <div className="kpi"><div className="ic"><Icon name="shield" /></div><div className="v" style={{ color: negocios.length - ativos ? "var(--warn)" : undefined }}>{negocios.length - ativos}</div><div className="l">Suspensos</div></div>
        <div className="kpi"><div className="ic"><Icon name="money" /></div><div className="v" style={{ fontSize: 19 }}>{money(saldoTotal)}</div><div className="l">Saldo em carteira</div></div>
      </div>
      <div className="card">
        <div className="card-h"><Icon name="building" /><h3>Negócios cadastrados</h3><span className="right">{negocios.length}</span></div>
        <Busca value={q} onChange={(v) => { setQ(v); setMostrar(30); }} placeholder="Buscar por nome ou CNPJ…" />
        <table>
          <tbody>
            <tr><th>Negócio</th><th>CNPJ/CPF</th><th>Saldo</th></tr>
            {visiveis.map((n) => (
              <tr key={n.id} style={{ cursor: "pointer" }} onClick={() => setSel(n)}>
                <td className="td-name">{n.razao_social}{!n.ativo && <span style={{ color: "var(--warn)", fontWeight: 600 }}> · suspenso</span>}</td>
                <td>{n.cnpj ?? "—"}</td>
                <td>{money(n.saldo_carteira ?? 0)}</td>
              </tr>
            ))}
            {filtrados.length === 0 && <tr><td colSpan={3} style={{ color: "var(--faint)", fontSize: 12.5 }}>Nenhum negócio encontrado.</td></tr>}
          </tbody>
        </table>
        {filtrados.length > mostrar && (
          <button className="btn btn-ghost" style={{ marginTop: 12 }} onClick={() => setMostrar((m) => m + 30)}>
            Ver mais ({filtrados.length - mostrar} restantes)
          </button>
        )}
      </div>
      <p className="hint">Clique num negócio pra ver o perfil (pedidos, gasto, carteira) e suspender/reativar.</p>

      {sel && <Drawer neg={sel} onClose={() => setSel(null)} onMudou={async () => { await carregar(); setSel(null); }} />}
    </AdminShell>
  );
}

function Drawer({ neg, onClose, onMudou }: { neg: Negocio; onClose: () => void; onMudou: () => void }) {
  const [tot, setTot] = useState<{ n: number; gasto: number } | null>(null);
  const [pin, setPin] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const alternar = async () => {
    setMsg(null);
    setBusy(true);
    const r = await definirAtivoNegocio(neg.id, !neg.ativo, pin);
    setBusy(false);
    if (r.ok) onMudou();
    else setMsg(r.motivo === "pin-invalido" ? "PIN incorreto." : r.motivo);
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  useEffect(() => {
    (async () => {
      const sb = getBrowserSupabase();
      if (!sb) return;
      const { data } = await sb.from("pedidos").select("preco_total").eq("estabelecimento_id", neg.id);
      const rows = (data as { preco_total: number | null }[] | null) ?? [];
      setTot({ n: rows.length, gasto: rows.reduce((s, r) => s + (r.preco_total ?? 0), 0) });
    })();
  }, [neg.id]);

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", zIndex: 200 }} />
      <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "min(420px,100vw)", background: "var(--bg)", borderLeft: "1px solid var(--line)", boxShadow: "var(--shadow-lg)", zIndex: 201, overflowY: "auto", padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>{neg.razao_social}</div>
          <button className="btn btn-ghost" style={{ width: "auto", padding: "6px 12px" }} onClick={onClose}><Icon name="stop" /></button>
        </div>

        <div className="card">
          <div className="card-h"><Icon name="building" /><h3>Cadastro</h3></div>
          <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.9 }}>
            CNPJ/CPF: {neg.cnpj ?? "—"}
            <br />
            Endereço: {neg.endereco ?? "—"}
            <br />
            Telefone: {neg.telefone ?? "—"}
          </div>
        </div>

        <div className="card">
          <div className="card-h"><Icon name="money" /><h3>Conta</h3></div>
          <div className="price-line"><span>Saldo da carteira</span><span>{money(neg.saldo_carteira ?? 0)}</span></div>
          <div className="price-line"><span>Pedidos feitos</span><span>{tot?.n ?? "…"}</span></div>
          <div className="price-line total" style={{ border: "none", margin: 0, padding: "6px 0 0" }}><span>Gasto total</span><span>{tot ? money(tot.gasto) : "…"}</span></div>
        </div>

        <div className="card">
          <div className="card-h"><Icon name="bolt" /><h3>Ações</h3><span className={`right status-pill ${neg.ativo ? "s-ok" : "s-pend"}`}>{neg.ativo ? "Ativo" : "Suspenso"}</span></div>
          <input className="input" type="password" placeholder="PIN do supervisor" value={pin} onChange={(e) => setPin(e.target.value)} style={{ marginBottom: 10 }} />
          <button className={`btn ${neg.ativo ? "btn-ghost" : "btn-go"}`} disabled={busy} onClick={alternar}>
            <Icon name={neg.ativo ? "stop" : "checkThin"} /> {neg.ativo ? "Suspender negócio" : "Reativar negócio"}
          </button>
          {msg && <div style={{ color: "var(--warn)", fontSize: 12.5, marginTop: 8, fontWeight: 600 }}>{msg}</div>}
        </div>
      </div>
    </>
  );
}
