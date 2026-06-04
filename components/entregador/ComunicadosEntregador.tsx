"use client";

import { useEffect, useState } from "react";
import EntregadorShell from "./EntregadorShell";
import { Icon } from "../Icons";
import { getBrowserSupabase } from "@/lib/supabase/browser";

type Com = { id: string; titulo: string; corpo: string; alvo: string; created_at: string };

const dt = (s: string) => new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export default function ComunicadosEntregador() {
  const [coms, setComs] = useState<Com[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    (async () => {
      const sb = getBrowserSupabase();
      if (!sb) return;
      // RLS comunicados_leitura: entregador recebe 'todos' + 'entregadores'
      const { data } = await sb.from("comunicados").select("id,titulo,corpo,alvo,created_at").order("created_at", { ascending: false });
      if (data) setComs(data as Com[]);
      setCarregando(false);
    })();
  }, []);

  return (
    <EntregadorShell title="Comunicados">
      <div className="card">
        <div className="card-h"><Icon name="send" /><h3>Avisos da operação</h3><span className="right">{coms.length}</span></div>
        {carregando ? (
          <div style={{ fontSize: 12.5, color: "var(--faint)" }}>Carregando…</div>
        ) : coms.length === 0 ? (
          <div style={{ fontSize: 12.5, color: "var(--faint)" }}>Nenhum aviso por enquanto. Comunicados da central aparecem aqui.</div>
        ) : (
          coms.map((c) => (
            <div key={c.id} style={{ padding: "12px 0", borderBottom: "1px solid var(--line)" }}>
              <div className="td-name" style={{ fontSize: 14 }}>{c.titulo}</div>
              <div style={{ fontSize: 13, color: "var(--ink-2)", margin: "4px 0", lineHeight: 1.5 }}>{c.corpo}</div>
              <div style={{ fontSize: 11, color: "var(--faint)" }}>{dt(c.created_at)}</div>
            </div>
          ))
        )}
      </div>
    </EntregadorShell>
  );
}
