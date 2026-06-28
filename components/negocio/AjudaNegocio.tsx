"use client";

import { useEffect, useState } from "react";
import NegocioShell from "./NegocioShell";
import { Icon } from "../Icons";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { abrirDisputa } from "@/actions/disputas";

type Ped = { id: string; coleta_endereco: string; entrega_endereco: string; status: string; created_at: string };
type Disp = { id: string; tipo: string; descricao: string; status: string; created_at: string };

const TIPOS = [
  { v: "atraso", l: "Entrega atrasada" },
  { v: "entregador", l: "Problema com o entregador" },
  { v: "cobranca", l: "Cobrança / valor" },
  { v: "cancelamento", l: "Cancelamento / reembolso" },
  { v: "app", l: "Problema no app" },
  { v: "outro", l: "Outro" },
];
const STATUS: Record<string, string> = { aberta: "Aberta", em_analise: "Em análise", resolvida: "Resolvida" };
const dt = (s: string) => new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

const FAQ = [
  { q: "Como crio uma entrega?", a: "Em 'Nova entrega': informe coleta e destino, escolha o veículo (vê o preço na hora) e confirme. O sistema aciona o entregador verificado mais próximo." },
  { q: "Como recarrego a carteira?", a: "Em 'Carteira' > 'Adicionar saldo', você gera um Pix. O saldo entra assim que o pagamento confirma; cada entrega desconta o frete do saldo." },
  { q: "Quanto custa?", a: "Você paga o frete da entrega (moto/carro/van + distância). Não há mensalidade obrigatória pra usar — o modelo é pré-pago por carteira." },
  { q: "E se ninguém aceitar a corrida?", a: "O sistema oferece a vários entregadores em cascata. Se não houver ninguém disponível na hora, você é avisado pra tentar de novo." },
  { q: "O entregador é confiável?", a: "Todo entregador passa por verificação de antecedentes e documentos antes de rodar. É o nosso diferencial." },
];

export default function AjudaNegocio() {
  const [peds, setPeds] = useState<Ped[]>([]);
  const [disputas, setDisputas] = useState<Disp[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [faqAberta, setFaqAberta] = useState<number | null>(null);

  const [pedSel, setPedSel] = useState<Ped | null>(null);
  const [tipo, setTipo] = useState("atraso");
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
    const r = await abrirDisputa(pedSel.id, "estabelecimento", tipo, desc.trim());
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
    setTipo("atraso");
  }

  return (
    <NegocioShell title="Central de Ajuda">
      <div className="card" style={{ background: "linear-gradient(135deg,var(--brand),#3730a3)", color: "#fff", border: "none" }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Precisa de ajuda?</div>
        <div style={{ fontSize: 12.5, opacity: 0.9 }}>Abra um chamado sobre uma entrega ou veja as dúvidas frequentes. A administração responde por aqui.</div>
      </div>

      <div className="card">
        <div className="card-h"><Icon name="pkg" /><h3>Ajuda com uma entrega</h3></div>
        <p className="hint" style={{ marginTop: 0 }}>Escolha a entrega e abra um chamado sobre ela.</p>
        {carregando ? (
          <div style={{ fontSize: 12.5, color: "var(--faint)" }}>Carregando…</div>
        ) : peds.length === 0 ? (
          <div style={{ fontSize: 12.5, color: "var(--faint)" }}>Você ainda não criou entregas.</div>
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
                <span className={`status-pill ${d.status === "resolvida" ? "s-ok" : d.status === "em_analise" ? "s-live" : "s-pend"}`} style={{ flexShrink: 0 }}>{STATUS[d.status] ?? d.status}</span>
              </div>
              {d.descricao && <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 2 }}>{d.descricao}</div>}
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{dt(d.created_at)}</div>
            </div>
          ))
        )}
      </div>

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
    </NegocioShell>
  );
}
