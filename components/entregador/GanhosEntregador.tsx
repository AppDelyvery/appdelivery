"use client";

import { useEffect, useState } from "react";
import EntregadorShell from "./EntregadorShell";
import { Icon } from "../Icons";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { money } from "@/lib/precos";
import { solicitarSaque, type SaqueResult } from "@/actions/saque";

type Ped = {
  id: string;
  status: string;
  coleta_endereco: string;
  entrega_endereco: string;
  preco_entregador: number | null;
  entregue_at: string | null;
  created_at: string;
};

const dt = (s: string | null) => (s ? new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—");
const inicioDoDia = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
const inicioDaSemana = () => Date.now() - 7 * 86400000;

export default function GanhosEntregador() {
  const [peds, setPeds] = useState<Ped[]>([]);
  const [saldo, setSaldo] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [oculto, setOculto] = useState(false);
  const fmt = (v: number) => (oculto ? "R$ ••••" : money(v));

  const [modal, setModal] = useState(false);
  const [valor, setValor] = useState("");
  const [chave, setChave] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [res, setRes] = useState<SaqueResult | null>(null);

  async function carregar() {
    const sb = getBrowserSupabase();
    if (!sb) return;
    const [pedR, entR] = await Promise.all([
      sb.from("pedidos").select("id,status,coleta_endereco,entrega_endereco,preco_entregador,entregue_at,created_at").order("created_at", { ascending: false }),
      sb.from("entregadores").select("saldo").limit(1).maybeSingle(),
    ]);
    if (pedR.data) setPeds(pedR.data as Ped[]);
    setSaldo((entR.data as { saldo?: number } | null)?.saldo ?? 0);
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  const entregues = peds.filter((p) => p.status === "entregue");
  const ganho = (lista: Ped[]) => lista.reduce((s, p) => s + (p.preco_entregador ?? 0), 0);
  const hoje = entregues.filter((p) => p.entregue_at && new Date(p.entregue_at).getTime() >= inicioDoDia());
  const semana = entregues.filter((p) => p.entregue_at && new Date(p.entregue_at).getTime() >= inicioDaSemana());

  async function sacar() {
    setEnviando(true);
    setRes(null);
    const r = await solicitarSaque(Number((valor || "0").replace(",", ".")), chave);
    setRes(r);
    setEnviando(false);
    if ("ok" in r) {
      await carregar();
    }
  }

  function fecharModal() {
    setModal(false);
    setRes(null);
    setValor("");
  }

  return (
    <EntregadorShell title="Ganhos">
      <div className="card" style={{ background: "linear-gradient(135deg,#059669,#047857)", color: "#fff", border: "none" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <div style={{ fontSize: 12.5, opacity: 0.85 }}>Ganhos de hoje</div>
          <button onClick={() => setOculto((o) => !o)} aria-label="Ocultar valores" style={{ background: "rgba(255,255,255,.2)", border: "none", color: "#fff", borderRadius: 8, width: 32, height: 32, display: "grid", placeItems: "center", cursor: "pointer" }}>
            <Icon name={oculto ? "shield" : "star"} />
          </button>
        </div>
        <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: -0.5 }}>{carregando ? "—" : fmt(ganho(hoje))}</div>
        <div style={{ fontSize: 12, opacity: 0.85, marginTop: 6 }}>{hoje.length} entrega(s) hoje</div>
      </div>

      <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>Disponível para saque</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "var(--brand)" }}>{carregando ? "—" : fmt(saldo)}</div>
        </div>
        <button className="btn btn-primary" style={{ width: "auto", padding: "9px 18px" }} disabled={saldo < 20} onClick={() => { setValor(String(Math.floor(saldo))); setModal(true); }}>
          <Icon name="money" /> Sacar
        </button>
      </div>

      <div className="kpis" style={{ marginBottom: 14 }}>
        <div className="kpi"><div className="ic"><Icon name="money" /></div><div className="v" style={{ fontSize: 17 }}>{fmt(ganho(semana))}</div><div className="l">Últimos 7 dias</div></div>
        <div className="kpi"><div className="ic"><Icon name="checkThin" /></div><div className="v">{semana.length}</div><div className="l">Entregas na semana</div></div>
        <div className="kpi"><div className="ic"><Icon name="moto" /></div><div className="v">{entregues.length}</div><div className="l">Total entregue</div></div>
      </div>

      <div className="card">
        <div className="card-h"><Icon name="list" /><h3>Histórico de entregas</h3><span className="right">{entregues.length}</span></div>
        {carregando ? (
          <div style={{ fontSize: 12.5, color: "var(--faint)" }}>Carregando…</div>
        ) : entregues.length === 0 ? (
          <div style={{ fontSize: 12.5, color: "var(--faint)" }}>Nenhuma entrega concluída ainda. Aceite corridas em “Disponíveis”.</div>
        ) : (
          <table>
            <tbody>
              <tr><th>Rota</th><th>Você recebeu</th><th>Quando</th></tr>
              {entregues.map((p) => (
                <tr key={p.id}>
                  <td className="td-name" style={{ fontSize: 12.5 }}>{p.coleta_endereco} → {p.entrega_endereco}</td>
                  <td style={{ fontWeight: 700, color: "var(--ok, #059669)" }}>{fmt(p.preco_entregador ?? 0)}</td>
                  <td style={{ color: "var(--muted)", fontSize: 12 }}>{dt(p.entregue_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="hint">Você recebe 80% do frete de cada entrega concluída; o valor cai no saldo e você saca por Pix (mín. R$ 20).</p>
      </div>

      {modal && (
        <div onClick={fecharModal} style={{ position: "fixed", inset: 0, background: "rgba(20,20,45,.45)", display: "grid", placeItems: "center", zIndex: 300, padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} className="card" style={{ maxWidth: 380, width: "100%", margin: 0 }}>
            <div className="card-h" style={{ justifyContent: "space-between" }}>
              <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}><Icon name="money" /><h3 style={{ margin: 0 }}>Sacar saldo</h3></span>
              <span onClick={fecharModal} style={{ cursor: "pointer", color: "var(--muted)", fontSize: 18 }}>×</span>
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
                  <Icon name={enviando ? "spinner" : "money"} /> {enviando ? "Processando…" : "Confirmar saque"}
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
