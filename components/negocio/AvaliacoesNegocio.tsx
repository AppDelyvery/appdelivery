"use client";

import { useEffect, useState } from "react";
import NegocioShell from "./NegocioShell";
import { Icon } from "../Icons";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { Estrelas, corNota } from "../Estrelas";

type Av = { nota: number; comentario: string | null; created_at: string };
const dt = (s: string) => new Date(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });

export default function AvaliacoesNegocio() {
  const [avs, setAvs] = useState<Av[]>([]);
  const [rating, setRating] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    (async () => {
      const sb = getBrowserSupabase();
      if (!sb) return;
      const [aR, eR] = await Promise.all([
        sb.rpc("minhas_avaliacoes_negocio"),
        sb.from("estabelecimentos").select("rating").limit(1).maybeSingle(),
      ]);
      if (aR.data) setAvs(aR.data as Av[]);
      setRating((eR.data as { rating?: number } | null)?.rating ?? null);
      setCarregando(false);
    })();
  }, []);

  const total = avs.length;
  const dist = [5, 4, 3, 2, 1].map((n) => ({ n, qtd: avs.filter((a) => a.nota === n).length }));
  const comentarios = avs.filter((a) => a.comentario && a.comentario.trim());

  return (
    <NegocioShell title="Avaliações">
      <div className="card" style={{ textAlign: "center" }}>
        <div style={{ fontSize: 44, fontWeight: 800, color: "var(--brand)", letterSpacing: -1 }}>
          {carregando ? "—" : total > 0 && rating != null ? Number(rating).toFixed(1).replace(".", ",") : "—"}
        </div>
        <div style={{ display: "flex", justifyContent: "center", marginTop: 2 }}>
          <Estrelas n={total > 0 && rating != null ? Math.round(Number(rating)) : 0} size={20} />
        </div>
        <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 6 }}>{total} avaliação(ões) de entregadores</div>
        <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 4 }}>As novas avaliações só aparecem no dia seguinte.</div>
      </div>

      <div className="card">
        <div className="card-h"><Icon name="chart" /><h3>Distribuição</h3></div>
        {dist.map((d) => (
          <div key={d.n} style={{ display: "flex", alignItems: "center", gap: 8, margin: "6px 0", fontSize: 12.5 }}>
            <span style={{ width: 30, color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: 3 }}>
              {d.n}
              <svg width={11} height={11} viewBox="0 0 24 24" fill="#f59e0b" aria-hidden><polygon points="12 2 15 9 22 9.3 16.5 14 18.5 21 12 17 5.5 21 7.5 14 2 9.3 9 9" /></svg>
            </span>
            <div style={{ flex: 1, height: 8, background: "var(--line)", borderRadius: 99, overflow: "hidden" }}>
              <div style={{ width: total ? `${(d.qtd / total) * 100}%` : "0%", height: "100%", background: corNota(d.n), transition: "width .3s" }} />
            </div>
            <span style={{ width: 24, textAlign: "right", color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>{d.qtd}</span>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-h"><Icon name="send" /><h3>Comentários</h3><span className="right">{comentarios.length}</span></div>
        {carregando ? (
          <div style={{ fontSize: 12.5, color: "var(--faint)" }}>Carregando…</div>
        ) : comentarios.length === 0 ? (
          <div style={{ fontSize: 12.5, color: "var(--faint)" }}>Ainda sem comentários dos entregadores.</div>
        ) : (
          comentarios.map((a, i) => (
            <div key={i} style={{ padding: "9px 0", borderBottom: "1px solid var(--line)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Estrelas n={a.nota} />
                <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{dt(a.created_at)}</span>
              </div>
              <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 3 }}>{a.comentario}</div>
            </div>
          ))
        )}
      </div>
    </NegocioShell>
  );
}
