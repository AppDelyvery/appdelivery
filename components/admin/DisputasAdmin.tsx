"use client";

import { useCallback, useEffect, useState } from "react";
import AdminShell from "./AdminShell";
import { Icon } from "../Icons";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { resolverDisputa } from "@/actions/disputas";
import { money } from "@/lib/precos";

type Ped = { id: string; coleta_endereco: string; entrega_endereco: string; preco_total: number | null };
type Disputa = {
  id: string; papel: string | null; tipo: string | null; descricao: string; status: string;
  resolucao: string | null; valor_reembolso: number | null; created_at: string; pedidos: Ped | null;
};
type Msg = { autor_papel: string | null; texto: string; created_at: string };

const ROTULO: Record<string, string> = { estabelecimento: "Loja", entregador: "Entregador", cliente_final: "Cliente", cliente: "Cliente" };
const ST: Record<string, { cls: string; txt: string }> = {
  aberta: { cls: "s-pend", txt: "Aberta" },
  em_analise: { cls: "s-live", txt: "Em análise" },
  resolvida: { cls: "s-ok", txt: "Resolvida" },
};
const dt = (s: string) => new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const hm = (s: string) => new Date(s).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

export default function DisputasAdmin() {
  const [disputas, setDisputas] = useState<Disputa[]>([]);
  const [aberta, setAberta] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [texto, setTexto] = useState("");
  const [reembolso, setReembolso] = useState("");
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const sb = getBrowserSupabase();
    if (!sb) return;
    const { data } = await sb
      .from("disputas")
      .select("id,papel,tipo,descricao,status,resolucao,valor_reembolso,created_at,pedidos(id,coleta_endereco,entrega_endereco,preco_total)")
      .order("created_at", { ascending: false });
    if (data) setDisputas(data as unknown as Disputa[]);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const abrir = async (d: Disputa) => {
    if (aberta === d.id) { setAberta(null); return; }
    setAberta(d.id); setTexto(""); setReembolso(""); setErro(null); setMsgs([]);
    const sb = getBrowserSupabase();
    if (!sb || !d.pedidos?.id) return;
    const { data } = await sb.from("mensagens").select("autor_papel,texto,created_at").eq("pedido_id", d.pedidos.id).order("created_at", { ascending: true });
    if (data) setMsgs(data as Msg[]);
  };

  const resolver = async (d: Disputa) => {
    setBusy(true); setErro(null);
    const valor = Math.max(0, Number(reembolso.replace(",", ".")) || 0);
    const r = await resolverDisputa(d.id, texto.trim() || "Resolvido pela operação.", valor);
    setBusy(false);
    if (!r.ok) { setErro(r.motivo); return; }
    setAberta(null); setTexto(""); setReembolso("");
    await carregar();
  };

  const abertas = disputas.filter((d) => d.status !== "resolvida");

  return (
    <AdminShell title="Suporte">
      <div className="card">
        <div className="card-h"><Icon name="shield" /><h3>Chamados</h3><span className="right">{abertas.length} aberto(s)</span></div>
        {disputas.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--muted)", textAlign: "center", padding: "12px 0" }}>Nenhum chamado. Negócio, entregador e cliente abrem por aqui.</div>
        ) : (
          disputas.map((d) => {
            const frete = d.pedidos?.preco_total ?? 0;
            const open = aberta === d.id;
            return (
              <div key={d.id} style={{ padding: "12px 0", borderBottom: "1px solid var(--line)" }}>
                {/* cabeçalho clicável */}
                <button onClick={() => abrir(d)} style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4, gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{ROTULO[d.papel ?? ""] ?? d.papel ?? "—"} · {d.tipo}</span>
                    <span className={`status-pill ${ST[d.status]?.cls ?? "s-pend"}`}>{ST[d.status]?.txt ?? d.status}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--faint)", marginBottom: 4 }}>
                    {d.pedidos ? `${d.pedidos.coleta_endereco} → ${d.pedidos.entrega_endereco}` : ""} · {dt(d.created_at)}{frete ? ` · frete ${money(frete)}` : ""}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--ink-2)" }}>{d.descricao}</div>
                </button>

                {/* resolvida: mostra desfecho + reembolso */}
                {d.status === "resolvida" && (
                  <div style={{ fontSize: 12.5, color: "var(--go-dark)", marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
                    <Icon name="checkThin" /> {d.resolucao}{(d.valor_reembolso ?? 0) > 0 ? ` · reembolso ${money(d.valor_reembolso!)}` : ""}
                  </div>
                )}

                {/* detalhe expandido: conversa + resolver com reembolso */}
                {open && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed var(--line-2)" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 8 }}>Conversa do pedido</div>
                    {msgs.length === 0 ? (
                      <div style={{ fontSize: 12, color: "var(--faint)", marginBottom: 10 }}>Sem mensagens neste pedido.</div>
                    ) : (
                      <div style={{ display: "grid", gap: 7, marginBottom: 12, maxHeight: 260, overflowY: "auto" }}>
                        {msgs.map((m, i) => (
                          <div key={i} style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 10, padding: "8px 11px" }}>
                            <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--brand)", marginBottom: 2 }}>{ROTULO[m.autor_papel ?? ""] ?? m.autor_papel ?? "—"} · {hm(m.created_at)}</div>
                            <div style={{ fontSize: 12.5, color: "var(--ink-2)" }}>{m.texto}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {d.status !== "resolvida" && (
                      <div style={{ display: "grid", gap: 8 }}>
                        <input className="input" placeholder="Como foi resolvido?" value={texto} onChange={(e) => setTexto(e.target.value)} />
                        <div className="field" style={{ margin: 0 }}>
                          <label>Reembolso ao lojista (opcional · máx {money(frete)})</label>
                          <input className="input" inputMode="decimal" placeholder="0,00" value={reembolso} onChange={(e) => setReembolso(e.target.value)} />
                        </div>
                        {erro && <div style={{ fontSize: 12, color: "var(--warn)", fontWeight: 600 }}>{erro}</div>}
                        <div className="btn-row">
                          <button className="btn btn-go" disabled={busy} onClick={() => resolver(d)}><Icon name="checkThin" /> Resolver{Number(reembolso.replace(",", ".")) > 0 ? " + reembolsar" : ""}</button>
                          <button className="btn btn-ghost" style={{ width: "auto", padding: "0 16px" }} onClick={() => setAberta(null)}>Fechar</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      <p className="hint">Clique no chamado pra ver a conversa do pedido e resolver. O reembolso volta pra carteira do lojista e fica registrado.</p>
    </AdminShell>
  );
}
