"use client";

import { useCallback, useEffect, useState } from "react";
import AdminShell from "./AdminShell";
import { Icon } from "../Icons";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { resolverDisputa } from "@/actions/disputas";

type Disputa = {
  id: string;
  papel: string | null;
  tipo: string | null;
  descricao: string;
  status: string;
  resolucao: string | null;
  created_at: string;
  pedidos: { coleta_endereco: string; entrega_endereco: string } | null;
};

const ROTULO: Record<string, string> = { estabelecimento: "Loja", entregador: "Entregador", cliente_final: "Cliente" };
const ST: Record<string, { cls: string; txt: string }> = {
  aberta: { cls: "s-pend", txt: "Aberta" },
  em_analise: { cls: "s-live", txt: "Em análise" },
  resolvida: { cls: "s-ok", txt: "Resolvida" },
};
const dt = (s: string) => new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export default function DisputasAdmin() {
  const [disputas, setDisputas] = useState<Disputa[]>([]);
  const [resolvendo, setResolvendo] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const [busy, setBusy] = useState(false);

  const carregar = useCallback(async () => {
    const sb = getBrowserSupabase();
    if (!sb) return;
    const { data } = await sb
      .from("disputas")
      .select("id,papel,tipo,descricao,status,resolucao,created_at,pedidos(coleta_endereco,entrega_endereco)")
      .order("created_at", { ascending: false });
    if (data) setDisputas(data as unknown as Disputa[]);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregar();
  }, [carregar]);

  const resolver = async (id: string) => {
    setBusy(true);
    await resolverDisputa(id, texto.trim() || "Resolvido pela operação.");
    setBusy(false);
    setResolvendo(null);
    setTexto("");
    await carregar();
  };

  const abertas = disputas.filter((d) => d.status !== "resolvida");

  return (
    <AdminShell title="Suporte">
      <div className="card">
        <div className="card-h">
          <Icon name="shield" />
          <h3>Chamados</h3>
          <span className="right">{abertas.length} aberto(s)</span>
        </div>
        {disputas.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--muted)", textAlign: "center", padding: "12px 0" }}>Nenhum chamado. Negócio, entregador e cliente abrem por aqui.</div>
        ) : (
          disputas.map((d) => (
            <div key={d.id} style={{ padding: "12px 0", borderBottom: "1px solid var(--line)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{ROTULO[d.papel ?? ""] ?? d.papel ?? "—"} · {d.tipo}</span>
                <span className={`status-pill ${ST[d.status]?.cls ?? "s-pend"}`}>{ST[d.status]?.txt ?? d.status}</span>
              </div>
              <div style={{ fontSize: 11.5, color: "var(--faint)", marginBottom: 4 }}>
                {d.pedidos ? `${d.pedidos.coleta_endereco} → ${d.pedidos.entrega_endereco}` : ""} · {dt(d.created_at)}
              </div>
              <div style={{ fontSize: 13, color: "var(--ink-2)" }}>{d.descricao}</div>
              {d.status === "resolvida" ? (
                <div style={{ fontSize: 12.5, color: "var(--go-dark)", marginTop: 6 }}>✓ {d.resolucao}</div>
              ) : resolvendo === d.id ? (
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <input className="input" placeholder="Como foi resolvido?" value={texto} onChange={(e) => setTexto(e.target.value)} />
                  <button className="btn btn-go" style={{ width: "auto", padding: "0 14px" }} disabled={busy} onClick={() => resolver(d.id)}><Icon name="checkThin" /></button>
                  <button className="btn btn-ghost" style={{ width: "auto", padding: "0 12px" }} onClick={() => setResolvendo(null)}><Icon name="stop" /></button>
                </div>
              ) : (
                <button className="btn btn-ghost" style={{ width: "auto", padding: "7px 14px", fontSize: 12.5, marginTop: 8 }} onClick={() => { setResolvendo(d.id); setTexto(""); }}>
                  <Icon name="checkThin" /> Resolver
                </button>
              )}
            </div>
          ))
        )}
      </div>
      <p className="hint">Pra responder a conversa do pedido, use Mensagens (o admin entra como “suporte”).</p>
    </AdminShell>
  );
}
