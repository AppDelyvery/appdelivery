"use client";

import { useEffect, useState } from "react";
import EntregadorShell from "./EntregadorShell";
import { Icon } from "../Icons";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { abrirDisputa } from "@/actions/disputas";

type Ped = { id: string; coleta_endereco: string; entrega_endereco: string; status: string; created_at: string };
type Disp = { id: string; tipo: string; descricao: string; status: string; created_at: string };

const TIPOS = [
  { v: "pagamento", l: "Pagamento / ganhos" },
  { v: "cliente", l: "Problema com o cliente" },
  { v: "endereco", l: "Endereço errado" },
  { v: "app", l: "Problema no app" },
  { v: "seguranca", l: "Segurança / emergência" },
  { v: "outro", l: "Outro" },
];
const STATUS: Record<string, string> = { aberta: "Aberta", em_analise: "Em análise", resolvida: "Resolvida" };
const dt = (s: string) => new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

const FAQ = [
  { q: "Como recebo pelas entregas?", a: "Você recebe 80% do frete de cada entrega concluída. O valor entra no saldo da sua Carteira e você saca por Pix (mín. R$ 20)." },
  { q: "Recusar uma corrida me prejudica?", a: "Recusar não pune. A oferta passa pro próximo e você continua recebendo novas." },
  { q: "Por que preciso do código na entrega?", a: "O cliente te informa um código de 4 dígitos na hora de receber. É a prova de que a entrega chegou na pessoa certa." },
  { q: "Como funciona a verificação?", a: "Checamos seus antecedentes e documentos uma vez, no cadastro. Isso dá segurança ao negócio e ao cliente — e é o nosso diferencial." },
];

export default function AjudaEntregador() {
  const [peds, setPeds] = useState<Ped[]>([]);
  const [disputas, setDisputas] = useState<Disp[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [faqAberta, setFaqAberta] = useState<number | null>(null);

  const [pedSel, setPedSel] = useState<Ped | null>(null);
  const [tipo, setTipo] = useState("app");
  const [desc, setDesc] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [okMsg, setOkMsg] = useState(false);

  async function carregar() {
    const sb = getBrowserSupabase();
    if (!sb) return;
    const [pR, dR] = await Promise.all([
      sb.from("pedidos").select("id,coleta_endereco,entrega_endereco,status,created_at").order("created_at", { ascending: false }).limit(10),
      sb.from("disputas").select("id,tipo,descricao,status,created_at").order("created_at", { ascending: false }).limit(15),
    ]);
    if (pR.data) setPeds(pR.data as Ped[]);
    if (dR.data) setDisputas(dR.data as Disp[]);
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  async function enviar() {
    if (!pedSel) return;
    setEnviando(true);
    const r = await abrirDisputa(pedSel.id, "entregador", tipo, desc.trim());
    setEnviando(false);
    if (r.ok) {
      setOkMsg(true);
      setDesc("");
      await carregar();
    }
  }

  function fechar() {
    setPedSel(null);
    setOkMsg(false);
    setDesc("");
    setTipo("app");
  }

  return (
    <EntregadorShell title="Central de Ajuda">
      {/* Emergência */}
      <div className="card" style={{ background: "#fdecec", border: "1px solid #f3c0c0" }}>
        <div className="card-h"><Icon name="alert" /><h3 style={{ color: "#be123c" }}>Emergência</h3></div>
        <p style={{ fontSize: 12.5, color: "var(--ink-2)", margin: "0 0 10px" }}>Está em risco durante uma entrega? Acione a emergência primeiro — depois registre o ocorrido aqui.</p>
        <a href="tel:190" className="btn" style={{ width: "auto", padding: "10px 18px", background: "#be123c", color: "#fff", fontWeight: 700, textDecoration: "none", display: "inline-flex" }}>
          <Icon name="alert" /> Ligar 190
        </a>
      </div>

      {/* Suporte por entrega */}
      <div className="card">
        <div className="card-h"><Icon name="pkg" /><h3>Ajuda com uma entrega</h3></div>
        <p className="hint" style={{ marginTop: 0 }}>Escolha a entrega e abra um chamado sobre ela.</p>
        {carregando ? (
          <div style={{ fontSize: 12.5, color: "var(--faint)" }}>Carregando…</div>
        ) : peds.length === 0 ? (
          <div style={{ fontSize: 12.5, color: "var(--faint)" }}>Você ainda não tem entregas.</div>
        ) : (
          peds.slice(0, 6).map((p) => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "1px solid var(--line)" }}>
              <div style={{ fontSize: 12.5, minWidth: 0 }}>
                <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.coleta_endereco} → {p.entrega_endereco}</div>
                <div style={{ color: "var(--muted)", fontSize: 11.5 }}>{dt(p.created_at)}</div>
              </div>
              <button className="btn" style={{ width: "auto", padding: "6px 12px", fontSize: 12.5, flexShrink: 0 }} onClick={() => setPedSel(p)}>Abrir chamado</button>
            </div>
          ))
        )}
      </div>

      {/* FAQ */}
      <div className="card">
        <div className="card-h"><Icon name="help" /><h3>Dúvidas frequentes</h3></div>
        {FAQ.map((f, i) => (
          <div key={i} style={{ borderBottom: "1px solid var(--line)" }}>
            <button onClick={() => setFaqAberta(faqAberta === i ? null : i)} style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: "11px 0", fontSize: 13, fontWeight: 600, color: "var(--navy,#1b2147)", cursor: "pointer", display: "flex", justifyContent: "space-between", gap: 8 }}>
              {f.q}<span style={{ color: "var(--brand)" }}>{faqAberta === i ? "−" : "+"}</span>
            </button>
            {faqAberta === i && <p style={{ fontSize: 12.5, color: "var(--ink-2)", margin: "0 0 11px", lineHeight: 1.6 }}>{f.a}</p>}
          </div>
        ))}
      </div>

      {/* Meus chamados */}
      <div className="card">
        <div className="card-h"><Icon name="list" /><h3>Meus chamados</h3><span className="right">{disputas.length}</span></div>
        {carregando ? (
          <div style={{ fontSize: 12.5, color: "var(--faint)" }}>Carregando…</div>
        ) : disputas.length === 0 ? (
          <div style={{ fontSize: 12.5, color: "var(--faint)" }}>Nenhum chamado aberto.</div>
        ) : (
          disputas.map((d) => (
            <div key={d.id} style={{ padding: "9px 0", borderBottom: "1px solid var(--line)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <b style={{ fontSize: 12.5 }}>{TIPOS.find((t) => t.v === d.tipo)?.l ?? d.tipo}</b>
                <span style={{ fontSize: 11.5, color: d.status === "resolvida" ? "var(--ok,#059669)" : "var(--muted)" }}>{STATUS[d.status] ?? d.status}</span>
              </div>
              {d.descricao && <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 2 }}>{d.descricao}</div>}
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{dt(d.created_at)}</div>
            </div>
          ))
        )}
      </div>

      {/* Modal abrir chamado */}
      {pedSel && (
        <div onClick={fechar} style={{ position: "fixed", inset: 0, background: "rgba(20,20,45,.45)", display: "grid", placeItems: "center", zIndex: 300, padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} className="card" style={{ maxWidth: 400, width: "100%", margin: 0 }}>
            <div className="card-h" style={{ justifyContent: "space-between" }}>
              <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}><Icon name="send" /><h3 style={{ margin: 0 }}>Abrir chamado</h3></span>
              <button onClick={fechar} aria-label="Fechar" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", display: "grid", placeItems: "center", padding: 0 }}><Icon name="stop" /></button>
            </div>

            {okMsg ? (
              <div style={{ textAlign: "center", padding: "8px 0" }}>
                <Icon name="checkThin" />
                <p style={{ fontWeight: 700, color: "var(--brand)", margin: "8px 0 2px" }}>Chamado aberto!</p>
                <p className="hint">A administração vai te responder por aqui e pelo chat.</p>
              </div>
            ) : (
              <>
                <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 10px" }}>{pedSel.coleta_endereco} → {pedSel.entrega_endereco}</p>
                <div className="field">
                  <label>Tipo</label>
                  <select className="input" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                    {TIPOS.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>O que aconteceu?</label>
                  <textarea className="input" rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Descreva o problema…" />
                </div>
                <button className="btn btn-primary" disabled={enviando || !desc.trim()} onClick={enviar}>
                  <Icon name={enviando ? "spinner" : "send"} /> {enviando ? "Enviando…" : "Enviar chamado"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </EntregadorShell>
  );
}
