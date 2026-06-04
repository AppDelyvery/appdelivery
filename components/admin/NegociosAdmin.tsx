"use client";

import { useEffect, useState } from "react";
import AdminShell from "./AdminShell";
import { Icon } from "../Icons";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { money } from "@/lib/precos";

type Negocio = { id: string; razao_social: string; cnpj: string | null; endereco: string | null; telefone: string | null; saldo_carteira: number | null };

export default function NegociosAdmin() {
  const [negocios, setNegocios] = useState<Negocio[]>([]);
  const [sel, setSel] = useState<Negocio | null>(null);

  useEffect(() => {
    (async () => {
      const sb = getBrowserSupabase();
      if (!sb) return;
      const { data } = await sb.from("estabelecimentos").select("id,razao_social,cnpj,endereco,telefone,saldo_carteira").order("created_at", { ascending: false });
      if (data) setNegocios(data as Negocio[]);
    })();
  }, []);

  return (
    <AdminShell title="Negócios">
      <div className="card">
        <div className="card-h"><Icon name="building" /><h3>Negócios cadastrados</h3><span className="right">{negocios.length}</span></div>
        <table>
          <tbody>
            <tr><th>Negócio</th><th>CNPJ/CPF</th><th>Saldo</th></tr>
            {negocios.map((n) => (
              <tr key={n.id} style={{ cursor: "pointer" }} onClick={() => setSel(n)}>
                <td className="td-name">{n.razao_social}</td>
                <td>{n.cnpj ?? "—"}</td>
                <td>{money(n.saldo_carteira ?? 0)}</td>
              </tr>
            ))}
            {negocios.length === 0 && <tr><td colSpan={3} style={{ color: "var(--faint)", fontSize: 12.5 }}>Nenhum negócio ainda.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="hint">Clique num negócio pra ver o perfil (pedidos, gasto, carteira).</p>

      {sel && <Drawer neg={sel} onClose={() => setSel(null)} />}
    </AdminShell>
  );
}

function Drawer({ neg, onClose }: { neg: Negocio; onClose: () => void }) {
  const [tot, setTot] = useState<{ n: number; gasto: number } | null>(null);

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
      </div>
    </>
  );
}
