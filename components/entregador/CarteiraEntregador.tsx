"use client";

import { useEffect, useState } from "react";
import EntregadorShell from "./EntregadorShell";
import { Icon } from "../Icons";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { money } from "@/lib/precos";
import { solicitarSaque, type SaqueResult } from "@/actions/saque";
import { criarSubcontaEntregador, type SubcontaActionResult } from "@/actions/criarSubcontaEntregador";
import { mascaraCnpjOuCpf } from "@/lib/validacao";

type Saque = { id: string; valor: number; status: string; chave_pix: string; created_at: string };
type Cfg = { saque_minimo: number; saque_taxa_cpf: number; saque_mei_gratis: boolean };

const dt = (s: string) => new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const ROTULO: Record<string, string> = { processando: "Processando", pago: "Pago", falhou: "Falhou" };

const DEFAULT_CFG: Cfg = { saque_minimo: 35, saque_taxa_cpf: 3.5, saque_mei_gratis: true };

export default function CarteiraEntregador() {
  const [saldo, setSaldo] = useState(0);
  const [saques, setSaques] = useState<Saque[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [temSubconta, setTemSubconta] = useState(false); // MEI = tem subconta Asaas
  const [cfg, setCfg] = useState<Cfg>(DEFAULT_CFG);

  const [modal, setModal] = useState(false);
  const [valor, setValor] = useState("");
  const [chave, setChave] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [res, setRes] = useState<SaqueResult | null>(null);

  // formalização MEI (criar subconta)
  const [meiModal, setMeiModal] = useState(false);
  const [mei, setMei] = useState({ cnpj: "", email: "", telefone: "", endereco: "" });
  const [meiEnviando, setMeiEnviando] = useState(false);
  const [meiRes, setMeiRes] = useState<SubcontaActionResult | null>(null);

  // taxa que se aplica a ESTE entregador (MEI grátis; CPF paga)
  const taxa = temSubconta && cfg.saque_mei_gratis ? 0 : Number(cfg.saque_taxa_cpf);
  const valorNum = Number((valor || "0").replace(",", "."));
  const liquido = Math.max(0, Math.round((valorNum - taxa) * 100) / 100);

  async function carregar() {
    const sb = getBrowserSupabase();
    if (!sb) return;
    const [entR, sqR, cfgR, userR] = await Promise.all([
      sb.from("entregadores").select("saldo,chave_pix,asaas_subconta_id,telefone").limit(1).maybeSingle(),
      sb.from("saques").select("id,valor,status,chave_pix,created_at").order("created_at", { ascending: false }),
      sb.from("config").select("saque_minimo,saque_taxa_cpf,saque_mei_gratis").eq("id", 1).maybeSingle(),
      sb.auth.getUser(),
    ]);
    const ent = entR.data as { saldo?: number; chave_pix?: string | null; asaas_subconta_id?: string | null; telefone?: string | null } | null;
    setSaldo(ent?.saldo ?? 0);
    setTemSubconta(!!ent?.asaas_subconta_id);
    if (ent?.chave_pix) setChave(ent.chave_pix); // prefill: chave salva no perfil (0041)
    if (sqR.data) setSaques(sqR.data as Saque[]);
    if (cfgR.data) setCfg({ ...DEFAULT_CFG, ...(cfgR.data as Partial<Cfg>) });
    // prefill do formulário MEI com o que já temos
    setMei((m) => ({ ...m, email: m.email || userR.data.user?.email || "", telefone: m.telefone || ent?.telefone || "" }));
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  async function sacar() {
    setEnviando(true);
    setRes(null);
    const r = await solicitarSaque(valorNum, chave);
    setRes(r);
    setEnviando(false);
    if ("ok" in r) await carregar();
  }

  function fechar() {
    setModal(false);
    setRes(null);
    setValor("");
  }

  async function virarMei() {
    setMeiEnviando(true);
    setMeiRes(null);
    const r = await criarSubcontaEntregador(mei);
    setMeiRes(r);
    setMeiEnviando(false);
    if ("ok" in r) await carregar(); // agora temSubconta = true → saque sem taxa
  }

  const minimo = Number(cfg.saque_minimo);

  return (
    <EntregadorShell title="Carteira">
      <div className="card" style={{ background: "linear-gradient(135deg,var(--brand),#3730a3)", color: "#fff", border: "none" }}>
        <div style={{ fontSize: 12.5, opacity: 0.85, marginBottom: 6 }}>Disponível para saque</div>
        <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: -0.5 }}>{carregando ? "—" : money(saldo)}</div>
        <button
          className="btn"
          style={{ marginTop: 12, width: "auto", padding: "9px 18px", background: "#fff", color: "var(--brand)", fontWeight: 700 }}
          disabled={saldo < minimo}
          onClick={() => { setValor(String(Math.floor(saldo))); setModal(true); }}
        >
          <Icon name="download" /> Sacar por Pix
        </button>
        <div style={{ fontSize: 11.5, opacity: 0.85, marginTop: 8 }}>
          Saque mínimo de {money(minimo)}. {temSubconta ? "Você é MEI: saque sem taxa." : `Taxa de ${money(taxa)} por saque no CPF.`} Cai na sua chave Pix em até 1 dia útil.
        </div>
      </div>

      {/* Formalização MEI — vira a chave do saque sem taxa */}
      <div className="card">
        <div className="card-h"><Icon name="shield" /><h3>Formalização</h3></div>
        {temSubconta ? (
          <div className="trust-banner" style={{ background: "rgba(5,150,105,.08)", borderColor: "#a7d8c4", color: "var(--ok,#059669)" }}>
            <Icon name="checkThin" />
            <div>Você é <b>MEI</b> — seus saques são <b>sem taxa</b>, direto na sua conta.</div>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 13, color: "var(--muted)", margin: "2px 2px 10px" }}>
              No <b>CPF</b>, cada saque tem taxa de <b>{money(taxa)}</b>. Vire <b>MEI</b> e passe a sacar <b>sem taxa</b> — o dinheiro fica na sua própria conta.
            </p>
            <button className="btn btn-primary" style={{ width: "auto", padding: "9px 18px" }} onClick={() => { setMeiRes(null); setMeiModal(true); }}>
              <Icon name="shield" /> Virar MEI e saque sem taxa
            </button>
          </>
        )}
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
                {/* a escolha: MEI grátis × CPF com taxa */}
                {temSubconta ? (
                  <div className="trust-banner" style={{ background: "rgba(5,150,105,.08)", borderColor: "#a7d8c4", color: "var(--ok,#059669)" }}>
                    <Icon name="checkThin" />
                    <div><b>MEI</b> — você saca <b>sem taxa</b>.</div>
                  </div>
                ) : (
                  <div className="trust-banner" style={{ background: "var(--warn-bg)", borderColor: "#f3d6a8", color: "var(--warn)" }}>
                    <Icon name="shield" />
                    <div>Saque no <b>CPF</b>: taxa de <b>{money(taxa)}</b>. Vire <b>MEI</b> e saque <b>sem taxa</b>.</div>
                  </div>
                )}

                <div className="field">
                  <label>Valor (mín. {money(minimo)} · disponível {money(saldo)})</label>
                  <input className="input" inputMode="numeric" value={valor} onChange={(e) => setValor(e.target.value.replace(/[^\d,]/g, ""))} placeholder={String(Math.floor(minimo))} />
                </div>

                {/* preview do líquido quando há taxa */}
                {taxa > 0 && valorNum > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--muted)", margin: "2px 2px 8px" }}>
                    <span>Você recebe (após taxa de {money(taxa)})</span>
                    <b style={{ color: "var(--brand)" }}>{money(liquido)}</b>
                  </div>
                )}

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
                <p className="hint">{res.taxa > 0 ? `Você recebe ${money(res.liquido)} (taxa de ${money(res.taxa)}) ` : "Sem taxa (MEI). "}na sua chave Pix em até 1 dia útil.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {meiModal && (
        <div onClick={() => setMeiModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(20,20,45,.45)", display: "grid", placeItems: "center", zIndex: 300, padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} className="card" style={{ maxWidth: 400, width: "100%", margin: 0 }}>
            <div className="card-h" style={{ justifyContent: "space-between" }}>
              <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}><Icon name="shield" /><h3 style={{ margin: 0 }}>Virar MEI</h3></span>
              <span onClick={() => setMeiModal(false)} style={{ cursor: "pointer", color: "var(--muted)", fontSize: 18 }}>×</span>
            </div>

            {!(meiRes && "ok" in meiRes) ? (
              <>
                <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "0 2px 10px" }}>
                  Já tem MEI? Informe seu <b>CNPJ</b> e criamos sua conta de recebimento — aí seus saques ficam <b>sem taxa</b>.
                </p>
                <div className="field">
                  <label>CNPJ do MEI</label>
                  <input className="input" inputMode="numeric" value={mei.cnpj} onChange={(e) => setMei((m) => ({ ...m, cnpj: mascaraCnpjOuCpf(e.target.value) }))} placeholder="00.000.000/0000-00" />
                </div>
                <div className="field">
                  <label>E-mail</label>
                  <input className="input" type="email" value={mei.email} onChange={(e) => setMei((m) => ({ ...m, email: e.target.value }))} />
                </div>
                <div className="field">
                  <label>Telefone</label>
                  <input className="input" inputMode="numeric" value={mei.telefone} onChange={(e) => setMei((m) => ({ ...m, telefone: e.target.value }))} placeholder="(63) 90000-0000" />
                </div>
                <div className="field">
                  <label>Endereço</label>
                  <input className="input" value={mei.endereco} onChange={(e) => setMei((m) => ({ ...m, endereco: e.target.value }))} placeholder="Rua, número, bairro" />
                </div>
                {meiRes && "naoConfigurado" in meiRes && (
                  <div className="trust-banner" style={{ background: "var(--warn-bg)", borderColor: "#f3d6a8", color: "var(--warn)" }}>
                    <Icon name="shield" />
                    <div>A criação da conta MEI ativa assim que o <b>Asaas</b> for ligado. A estrutura já está pronta.</div>
                  </div>
                )}
                {meiRes && "erro" in meiRes && (
                  <div className="trust-banner" style={{ background: "var(--warn-bg)", borderColor: "#f3d6a8", color: "var(--warn)" }}>
                    <Icon name="shield" />
                    <div>{meiRes.erro}</div>
                  </div>
                )}
                <button className="btn btn-primary" style={{ marginTop: 6 }} disabled={meiEnviando} onClick={virarMei}>
                  <Icon name={meiEnviando ? "spinner" : "shield"} /> {meiEnviando ? "Criando conta…" : "Criar minha conta MEI"}
                </button>
                <p className="hint">Só CNPJ (MEI) tem conta própria de recebimento — por isso a vantagem do saque sem taxa.</p>
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "8px 0" }}>
                <Icon name="checkThin" />
                <p style={{ fontWeight: 700, color: "var(--ok,#059669)", margin: "8px 0 2px" }}>Agora você é MEI!</p>
                <p className="hint">Seus próximos saques são sem taxa.</p>
                <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={() => setMeiModal(false)}>Fechar</button>
              </div>
            )}
          </div>
        </div>
      )}
    </EntregadorShell>
  );
}
