"use client";

import { useEffect, useState } from "react";
import AdminShell from "./AdminShell";
import Busca, { norm } from "./Busca";
import { Icon } from "../Icons";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { Estrelas, corNota } from "../Estrelas";

type Av = {
  nota: number | null;
  comentario: string | null;
  created_at: string;
  pedidos: {
    coleta_endereco: string;
    entrega_endereco: string;
    entregadores: { nome: string } | null;
    estabelecimentos: { razao_social: string } | null;
  } | null;
};

const dt = (s: string) => new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export default function AvaliacoesAdmin() {
  const [avs, setAvs] = useState<Av[]>([]);
  const [q, setQ] = useState("");
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    (async () => {
      const sb = getBrowserSupabase();
      if (!sb) return;
      const { data } = await sb
        .from("avaliacoes")
        .select("nota,comentario,created_at,pedidos(coleta_endereco,entrega_endereco,entregadores(nome),estabelecimentos(razao_social))")
        .order("created_at", { ascending: false });
      if (data) setAvs(data as unknown as Av[]);
      setCarregando(false);
    })();
  }, []);

  const comNota = avs.filter((a) => typeof a.nota === "number");
  const media = comNota.length ? comNota.reduce((s, a) => s + (a.nota ?? 0), 0) / comNota.length : null;
  const dist = [5, 4, 3, 2, 1].map((n) => ({ n, qtd: comNota.filter((a) => a.nota === n).length }));
  const max = Math.max(1, ...dist.map((d) => d.qtd));

  const lista = avs.filter((a) =>
    norm(`${a.comentario ?? ""} ${a.pedidos?.entregadores?.nome ?? ""} ${a.pedidos?.estabelecimentos?.razao_social ?? ""} ${a.pedidos?.coleta_endereco ?? ""} ${a.pedidos?.entrega_endereco ?? ""}`).includes(norm(q)),
  );

  return (
    <AdminShell title="Avaliações">
      <div className="kpis" style={{ marginBottom: 14 }}>
        <div className="kpi"><div className="ic"><Icon name="star" /></div><div className="v">{media !== null ? media.toFixed(1) : "—"}</div><div className="l">Média geral</div></div>
        <div className="kpi"><div className="ic"><Icon name="list" /></div><div className="v">{comNota.length}</div><div className="l">Avaliações</div></div>
        <div className="kpi"><div className="ic"><Icon name="send" /></div><div className="v">{avs.filter((a) => a.comentario?.trim()).length}</div><div className="l">Com comentário</div></div>
      </div>

      <div className="card">
        <div className="card-h"><Icon name="chart" /><h3>Distribuição</h3></div>
        {dist.map((d) => (
          <div key={d.n} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0" }}>
            <span style={{ width: 30, fontSize: 12.5, color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: 3 }}>
              {d.n}
              <svg width={11} height={11} viewBox="0 0 24 24" fill="#f59e0b" aria-hidden><polygon points="12 2 15 9 22 9.3 16.5 14 18.5 21 12 17 5.5 21 7.5 14 2 9.3 9 9" /></svg>
            </span>
            <div style={{ flex: 1, height: 8, background: "var(--line)", borderRadius: 6, overflow: "hidden" }}>
              <div style={{ width: `${(d.qtd / max) * 100}%`, height: "100%", background: corNota(d.n), transition: "width .3s" }} />
            </div>
            <span style={{ width: 28, textAlign: "right", fontSize: 12.5, fontVariantNumeric: "tabular-nums" }}>{d.qtd}</span>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-h"><Icon name="star" /><h3>Comentários</h3><span className="right">{lista.length}</span></div>
        <Busca value={q} onChange={setQ} placeholder="Buscar por entregador, negócio ou texto…" />
        {carregando ? (
          <div style={{ fontSize: 12.5, color: "var(--faint)" }}>Carregando…</div>
        ) : lista.length === 0 ? (
          <div style={{ fontSize: 12.5, color: "var(--faint)" }}>Nenhuma avaliação ainda. Entram quando o cliente final avalia a entrega.</div>
        ) : (
          lista.map((a, i) => (
            <div key={i} style={{ padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Estrelas n={a.nota ?? 0} />
                <span style={{ color: "var(--faint)", fontSize: 11 }}>{dt(a.created_at)}</span>
              </div>
              {a.comentario?.trim() && <div style={{ fontSize: 13, color: "var(--ink)", margin: "4px 0" }}>{a.comentario}</div>}
              <div style={{ fontSize: 11.5, color: "var(--muted)" }}>
                {a.pedidos?.entregadores?.nome ?? "—"} · {a.pedidos?.estabelecimentos?.razao_social ?? "—"}
              </div>
            </div>
          ))
        )}
      </div>
    </AdminShell>
  );
}
