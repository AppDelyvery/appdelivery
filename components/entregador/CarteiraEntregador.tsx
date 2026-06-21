"use client";

import { useEffect, useState } from "react";
import EntregadorShell from "./EntregadorShell";
import { Icon } from "../Icons";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { money } from "@/lib/precos";
import { solicitarSaque, type SaqueResult } from "@/actions/saque";

type Saque = { id: string; valor: number; status: string; chave_pix: string; created_at: string };

const dt = (s: string) => new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const ROTULO: Record<string, string> = { processando: "Processando", pago: "Pago", falhou: "Falhou" };

export default function CarteiraEntregador() {
  const [saldo, setSaldo] = useState(0);
  const [saques, setSaques] = useState<Saque[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [modal, setModal] = useState(false);
  const [valor, setValor] = useState("");
  const [chave, setChave] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [res, setRes] = useState<SaqueResult | null>(null);

  async function carregar() {
    const sb = getBrowserSupabase();
    if (!sb) return;
    const [entR, sqR] = await Promise.all([
      sb.from("entregadores").select("saldo,chave_pix").limit(1).maybeSingle(),
      sb.from("saques").select("id,valor,status,chave_pix,created_at").order("created_at", { ascending: false }),
    ]);
    const ent = entR.data as { saldo?: number; chave_pix?: string | null } | null;
    setSaldo(ent?.saldo ?? 0);
    if (ent?.chave_pix) setChave(ent.chave_pix); // prefill: chave salva no perfil (0041)
    if (sqR.data) setSaques(sqR.data as Saque[]);
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  async function sacar() {
    setEnviando(true);
    setRes(null);
    const r = await solicitarSaque(Number((valor || "0").replace(",", ".")), chave);
    setRes(r);
    setEnviando(false);
    if ("ok" in r) await carregar();
  }

  function fechar() {
    setModal(false);
    setRes(null);
    setValor("");
  }

  return (
    <EntregadorShell title="Carteira">
      <div className="card" style={{ background: "linear-gradient(135deg,var(--brand),#3730a3)", color: "#fff", border: "none" }}>
        <div style={{ fontSize: 12.5, opacity: 0.85, marginBottom: 6 }}>Disponível para saque</div>
        <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: -0.5 }}>{carregando ? "—" : money(saldo)}</div>
        <button
          className="btn"
          style={{ marginTop: 12, width: "auto", padding: "9px 18px", background: "#fff", color: "var(--brand)", fontWeight: 700 }}
          disabled={saldo < 20}
          onClick={() => { setValor(String(Math.floor(saldo))); setModal(true); }}
        >
          <Icon name="download" /> Sacar por Pix
        </button>
        <div style={{ fontSize: 11.5, opacity: 0.85, marginTop: 8 }}>Saque mínimo de R$ 20. Cai na sua chave Pix em até 1 dia útil.</div>
      </div>

      <div className="card">
        <div className="card-h"><Icon name="list" /><h3>Meus saques</h3><span className="right">{saques.length}</span></div>
        {carregando ? (
          <div style={{ fontSize: 12.5, color: "var(--faint)" }}>Carregando…</div>
        ) : saques.length === 0 ? (
          <div style={{ fontSize: 12.5, color: "var(--faint)" }}>Nenhum saque ainda. Suas entregas creditam o saldo aqui.</div>
        ) : (
          <table>
            <tbody>
              <tr><th>Valor</th><th>Status</th><th>Quando</th></tr>
              {saques.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 700 }}>{money(s.valor)}</td>
                  <td style={{ color: s.status === "pago" ? "var(--ok,#059669)" : s.status === "falhou" ? "var(--warn,#b45309)" : "var(--muted)" }}>{ROTULO[s.status] ?? s.status}</td>
                  <td style={{ color: "var(--muted)", fontSize: 12 }}>{dt(s.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="hint">Você recebe 80% do frete de cada entrega concluída; o valor entra no saldo e você saca quando quiser.</p>
      </div>

      {modal && (
        <div onClick={fechar} style={{ position: "fixed", inset: 0, background: "rgba(20,20,45,.45)", display: "grid", placeItems: "center", zIndex: 300, padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} className="card" style={{ maxWidth: 380, width: "100%", margin: 0 }}>
            <div className="card-h" style={{ justifyContent: "space-between" }}>
              <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}><Icon name="download" /><h3 style={{ margin: 0 }}>Sacar saldo</h3></span>
              <span onClick={fechar} style={{ cursor: "pointer", color: "var(--muted)", fontSize: 18 }}>×</span>
            </div>

            {!(res && "ok" in res) && (
              <>
                <div className="field">
                  <label>Valor (mín. R$ 20 · disponível {money(saldo)})</label>
                  <input className="input" inputMode="numeric" value={valor} onChange={(e) => setValor(e.target.value.replace(/[^\d,]/g, ""))} placeholder="20" />
                </div>
                <div className="field">
                  <label>Sua chave Pix</label>
                  <input className="input" value={chave} onChange={(e) => setChave(e.target.value)} placeholder="CPF, telefone, e-mail ou aleatória" />
                </div>
                <button className="btn btn-primary" style={{ marginTop: 6 }} disabled={enviando} onClick={sacar}>
                  <Icon name={enviando ? "spinner" : "download"} /> {enviando ? "Processando…" : "Confirmar saque"}
                </button>
              </>
            )}

            {res && "naoConfigurado" in res && (
              <div className="trust-banner" style={{ background: "var(--warn-bg)", borderColor: "#f3d6a8", color: "var(--warn)" }}>
                <Icon name="shield" />
                <div>O saque por Pix ativa assim que a conta <b>Asaas</b> (CNPJ do dono) for ligada. A estrutura já está pronta.</div>
              </div>
            )}
            {res && "erro" in res && (
              <div className="trust-banner" style={{ background: "var(--warn-bg)", borderColor: "#f3d6a8", color: "var(--warn)" }}>
                <Icon name="shield" />
                <div>{res.erro}</div>
              </div>
            )}
            {res && "ok" in res && (
              <div style={{ textAlign: "center", padding: "8px 0" }}>
                <Icon name="checkThin" />
                <p style={{ fontWeight: 700, color: "var(--brand)", margin: "8px 0 2px" }}>Saque enviado!</p>
                <p className="hint">O valor cai na sua chave Pix em até 1 dia útil.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </EntregadorShell>
  );
}
