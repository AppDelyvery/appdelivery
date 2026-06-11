"use client";

import { useEffect, useState } from "react";
import EntregadorShell from "./EntregadorShell";
import { Icon } from "../Icons";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { money } from "@/lib/precos";

type Ped = {
  id: string;
  status: string;
  coleta_endereco: string;
  entrega_endereco: string;
  preco_entregador: number | null;
  entregue_at: string | null;
  created_at: string;
};

const dt = (s: string | null) => (s ? new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—");
const inicioDoDia = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
const inicioDaSemana = () => Date.now() - 7 * 86400000;

export default function GanhosEntregador() {
  const [peds, setPeds] = useState<Ped[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [oculto, setOculto] = useState(false);
  const fmt = (v: number) => (oculto ? "R$ ••••" : money(v));

  useEffect(() => {
    (async () => {
      const sb = getBrowserSupabase();
      if (!sb) return;
      const { data } = await sb
        .from("pedidos")
        .select("id,status,coleta_endereco,entrega_endereco,preco_entregador,entregue_at,created_at")
        .order("created_at", { ascending: false });
      if (data) setPeds(data as Ped[]);
      setCarregando(false);
    })();
  }, []);

  const entregues = peds.filter((p) => p.status === "entregue");
  const ganho = (lista: Ped[]) => lista.reduce((s, p) => s + (p.preco_entregador ?? 0), 0);
  const hoje = entregues.filter((p) => p.entregue_at && new Date(p.entregue_at).getTime() >= inicioDoDia());
  const semana = entregues.filter((p) => p.entregue_at && new Date(p.entregue_at).getTime() >= inicioDaSemana());

  return (
    <EntregadorShell title="Ganhos">
      <div className="card" style={{ background: "linear-gradient(135deg,#059669,#047857)", color: "#fff", border: "none" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <div style={{ fontSize: 12.5, opacity: 0.85 }}>Ganhos de hoje</div>
          <button onClick={() => setOculto((o) => !o)} aria-label="Ocultar valores" style={{ background: "rgba(255,255,255,.2)", border: "none", color: "#fff", borderRadius: 8, width: 32, height: 32, display: "grid", placeItems: "center", cursor: "pointer" }}>
            <Icon name={oculto ? "shield" : "star"} />
          </button>
        </div>
        <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: -0.5 }}>{carregando ? "—" : fmt(ganho(hoje))}</div>
        <div style={{ fontSize: 12, opacity: 0.85, marginTop: 6 }}>{hoje.length} entrega(s) hoje</div>
      </div>

      <div className="kpis" style={{ marginBottom: 14 }}>
        <div className="kpi"><div className="ic"><Icon name="money" /></div><div className="v" style={{ fontSize: 17 }}>{fmt(ganho(semana))}</div><div className="l">Últimos 7 dias</div></div>
        <div className="kpi"><div className="ic"><Icon name="checkThin" /></div><div className="v">{semana.length}</div><div className="l">Entregas na semana</div></div>
        <div className="kpi"><div className="ic"><Icon name="moto" /></div><div className="v">{entregues.length}</div><div className="l">Total entregue</div></div>
      </div>

      <div className="card">
        <div className="card-h"><Icon name="list" /><h3>Histórico de entregas</h3><span className="right">{entregues.length}</span></div>
        {carregando ? (
          <div style={{ fontSize: 12.5, color: "var(--faint)" }}>Carregando…</div>
        ) : entregues.length === 0 ? (
          <div style={{ fontSize: 12.5, color: "var(--faint)" }}>Nenhuma entrega concluída ainda. Aceite corridas em “Disponíveis”.</div>
        ) : (
          <table>
            <tbody>
              <tr><th>Rota</th><th>Você recebeu</th><th>Quando</th></tr>
              {entregues.map((p) => (
                <tr key={p.id}>
                  <td className="td-name" style={{ fontSize: 12.5, maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.coleta_endereco} → {p.entrega_endereco}</td>
                  <td style={{ fontWeight: 700, color: "var(--ok, #059669)" }}>{fmt(p.preco_entregador ?? 0)}</td>
                  <td style={{ color: "var(--muted)", fontSize: 12 }}>{dt(p.entregue_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="hint">Você recebe 80% do frete de cada entrega concluída. O valor entra no saldo da sua <b>Carteira</b>, onde você saca por Pix.</p>
      </div>
    </EntregadorShell>
  );
}
