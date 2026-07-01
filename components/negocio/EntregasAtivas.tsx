"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import NegocioShell from "./NegocioShell";
import { Icon } from "../Icons";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { money } from "@/lib/precos";

type Entrega = {
  id: string; status: string; coleta: string; entrega: string;
  created_at: string; token: string; preco: number | null; veiculo: string; entregador: string | null;
};

const LABEL: Record<string, string> = {
  buscando: "Procurando entregador", aceito: "Entregador a caminho da coleta",
  a_caminho_coleta: "A caminho da coleta", coletado: "Coletado", a_caminho_entrega: "A caminho da entrega",
};
const COR: Record<string, string> = {
  buscando: "var(--muted)", aceito: "var(--brand)", a_caminho_coleta: "var(--brand)",
  coletado: "#a86b00", a_caminho_entrega: "var(--go)",
};

function haMin(iso: string): string {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  return min < 1 ? "agora" : min < 60 ? `há ${min} min` : `há ${Math.floor(min / 60)}h`;
}

export default function EntregasAtivas() {
  const [itens, setItens] = useState<Entrega[] | null>(null);

  useEffect(() => {
    let vivo = true;
    const puxar = async () => {
      const sb = getBrowserSupabase();
      if (!sb) return;
      const { data } = await sb.rpc("minhas_entregas_ativas");
      if (vivo) setItens((data as Entrega[]) ?? []);
    };
    puxar();
    const t = setInterval(puxar, 6000);
    return () => { vivo = false; clearInterval(t); };
  }, []);

  return (
    <NegocioShell title="Entregas ativas">
      <div className="card-h" style={{ marginBottom: 10 }}>
        <Icon name="moto" />
        <h3>Em andamento agora</h3>
        {itens && <span className="right">{itens.length}</span>}
      </div>

      {itens == null ? (
        <div className="card" style={{ textAlign: "center", color: "var(--muted)", padding: 20 }}>Carregando…</div>
      ) : itens.length === 0 ? (
        <div className="card" style={{ textAlign: "center", color: "var(--muted)", padding: "26px 16px" }}>
          <Icon name="pkg" />
          <p style={{ margin: "8px 0 0", fontWeight: 600, fontSize: 13.5 }}>Nenhuma entrega ativa no momento.</p>
          <Link href="/negocio/novo-pedido" className="btn btn-primary" style={{ width: "auto", padding: "9px 16px", fontSize: 13, marginTop: 12 }}>
            <Icon name="send" /> Nova entrega
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {itens.map((e) => (
            <div key={e.id} className="card" style={{ padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <span style={{ fontWeight: 800, fontSize: 12.5, color: COR[e.status] ?? "var(--ink)" }}>
                  {LABEL[e.status] ?? e.status}
                </span>
                <span style={{ fontSize: 11.5, color: "var(--muted)" }}>#{e.id.slice(0, 8)} · {haMin(e.created_at)}</span>
              </div>
              <div className="route-pts" style={{ margin: "9px 0 6px" }}>
                <div className="rpt"><div className="pin o" /><div className="txt"><div className="a" style={{ fontSize: 12.5 }}>{e.coleta}</div><div className="b">coleta</div></div></div>
                <div className="rpt"><div className="pin d" /><div className="txt"><div className="a" style={{ fontSize: 12.5 }}>{e.entrega}</div><div className="b">entrega</div></div></div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>
                  {e.entregador ? `${e.entregador} · ` : ""}{e.preco != null ? money(e.preco) : ""}
                </span>
                <a href={`/rastreio/${e.token}`} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, fontWeight: 700, color: "var(--brand)" }}>
                  <Icon name="pin" /> Acompanhar
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </NegocioShell>
  );
}
