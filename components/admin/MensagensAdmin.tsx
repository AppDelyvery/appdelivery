"use client";

import { useCallback, useEffect, useState } from "react";
import AdminShell from "./AdminShell";
import Busca, { norm } from "./Busca";
import { Icon } from "../Icons";
import { getBrowserSupabase } from "@/lib/supabase/browser";

type Msg = {
  pedido_id: string;
  autor_papel: string;
  texto: string;
  created_at: string;
  pedidos: { coleta_endereco: string; entrega_endereco: string } | null;
};

const ROTULO: Record<string, string> = { estabelecimento: "Loja", entregador: "Entregador", cliente_final: "Cliente", suporte: "Suporte" };
const dt = (s: string) => new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export default function MensagensAdmin() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const carregar = useCallback(async () => {
    const sb = getBrowserSupabase();
    if (!sb) return;
    const { data } = await sb
      .from("mensagens")
      .select("pedido_id,autor_papel,texto,created_at,pedidos(coleta_endereco,entrega_endereco)")
      .order("created_at");
    if (data) setMsgs(data as unknown as Msg[]);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregar();
  }, [carregar]);

  const threads = new Map<string, Msg[]>();
  for (const m of msgs) {
    const arr = threads.get(m.pedido_id) ?? threads.set(m.pedido_id, []).get(m.pedido_id)!;
    arr.push(m);
  }
  const lista = [...threads.entries()]
    .map(([id, ms]) => ({ id, ms, last: ms[ms.length - 1] }))
    .filter((t) => norm(`${t.last.pedidos?.coleta_endereco ?? ""} ${t.last.pedidos?.entrega_endereco ?? ""} ${t.ms.map((m) => m.texto).join(" ")}`).includes(norm(q)))
    .sort((a, b) => b.last.created_at.localeCompare(a.last.created_at));

  const thread = sel ? threads.get(sel) ?? [] : [];

  return (
    <AdminShell title="Mensagens">
      <div className="card">
        <div className="card-h"><Icon name="send" /><h3>Conversas</h3><span className="right">{lista.length}</span></div>
        <Busca value={q} onChange={setQ} placeholder="Buscar por endereço ou conteúdo…" />
        {lista.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--muted)", textAlign: "center", padding: "12px 0" }}>Nenhuma conversa ainda.</div>
        ) : (
          lista.map((t) => (
            <div key={t.id} onClick={() => setSel(t.id)} style={{ padding: "10px 0", borderBottom: "1px solid var(--line)", cursor: "pointer" }}>
              <div className="td-name" style={{ fontSize: 12.5 }}>{t.last.pedidos ? `${t.last.pedidos.coleta_endereco} → ${t.last.pedidos.entrega_endereco}` : `#${t.id.slice(0, 8)}`}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                <b style={{ color: "var(--brand)" }}>{ROTULO[t.last.autor_papel] ?? t.last.autor_papel}:</b> {t.last.texto} <span style={{ color: "var(--faint)" }}>· {t.ms.length} msg</span>
              </div>
            </div>
          ))
        )}
      </div>
      <p className="hint">Acesso total às conversas (auditoria · só admin). O admin pode entrar como “suporte”.</p>

      {sel && (
        <Drawer
          titulo={thread[0]?.pedidos ? `${thread[0].pedidos.coleta_endereco} → ${thread[0].pedidos.entrega_endereco}` : `#${sel.slice(0, 8)}`}
          pedidoId={sel}
          thread={thread}
          onClose={() => setSel(null)}
          onEnviado={carregar}
        />
      )}
    </AdminShell>
  );
}

function Drawer({ titulo, pedidoId, thread, onClose, onEnviado }: { titulo: string; pedidoId: string; thread: Msg[]; onClose: () => void; onEnviado: () => void }) {
  const [texto, setTexto] = useState("");

  const enviar = async () => {
    if (!texto.trim()) return;
    const sb = getBrowserSupabase();
    if (!sb) return;
    await sb.from("mensagens").insert({ pedido_id: pedidoId, autor_papel: "suporte", texto: texto.trim() });
    setTexto("");
    onEnviado();
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", zIndex: 200 }} />
      <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "min(440px,100vw)", background: "var(--bg)", borderLeft: "1px solid var(--line)", boxShadow: "var(--shadow-lg)", zIndex: 201, overflowY: "auto", padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 800 }}>{titulo}</div>
          <button className="btn btn-ghost" style={{ width: "auto", padding: "6px 12px" }} onClick={onClose}><Icon name="stop" /></button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {thread.map((m, i) => {
            const loja = m.autor_papel === "estabelecimento";
            return (
              <div key={i} style={{ display: "flex", justifyContent: loja ? "flex-start" : m.autor_papel === "entregador" ? "flex-end" : "center" }}>
                <div style={{ maxWidth: "82%", background: "#fff", border: "1px solid var(--line)", borderRadius: 12, padding: "8px 11px" }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "var(--brand)", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 2 }}>
                    {ROTULO[m.autor_papel] ?? m.autor_papel} · {dt(m.created_at)}
                  </div>
                  <div style={{ fontSize: 13.5, lineHeight: 1.4 }}>{m.texto}</div>
                </div>
              </div>
            );
          })}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void enviar();
          }}
          style={{ display: "flex", gap: 8, marginTop: 14 }}
        >
          <input className="input" placeholder="Responder como suporte…" value={texto} onChange={(e) => setTexto(e.target.value)} />
          <button className="btn btn-primary" type="submit" style={{ width: "auto", padding: "0 16px" }} aria-label="Enviar">
            <Icon name="send" />
          </button>
        </form>
      </div>
    </>
  );
}
