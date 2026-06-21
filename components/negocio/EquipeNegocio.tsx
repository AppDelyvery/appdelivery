"use client";

import { useEffect, useState } from "react";
import NegocioShell from "./NegocioShell";
import { Icon } from "../Icons";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { convidarMembro, type ConviteResult } from "@/actions/equipe";

type Membro = { profile_id: string; nome: string | null; email: string | null; papel: string; ativo: boolean; created_at: string };

const PAPEL: Record<string, string> = { gerente: "Gerente", operador: "Operador" };

export default function EquipeNegocio() {
  const [membros, setMembros] = useState<Membro[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [semAcesso, setSemAcesso] = useState(false);

  const [modal, setModal] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [papel, setPapel] = useState<"gerente" | "operador">("operador");
  const [enviando, setEnviando] = useState(false);
  const [res, setRes] = useState<ConviteResult | null>(null);
  const [copiado, setCopiado] = useState(false);

  async function carregar() {
    const sb = getBrowserSupabase();
    if (!sb) return;
    const { data: pp } = await sb.rpc("meu_papel_negocio");
    if (pp !== "dono" && pp !== "gerente") {
      setSemAcesso(true);
      setCarregando(false);
      return;
    }
    const { data } = await sb.rpc("listar_membros");
    if (data) setMembros(data as Membro[]);
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  async function convidar() {
    setEnviando(true);
    setRes(null);
    setCopiado(false);
    const r = await convidarMembro(email, nome, papel);
    setRes(r);
    setEnviando(false);
    if ("ok" in r) await carregar();
  }

  async function alternar(m: Membro) {
    const sb = getBrowserSupabase();
    if (!sb) return;
    await sb.rpc("definir_membro", { p_profile_id: m.profile_id, p_ativo: !m.ativo, p_papel: null });
    await carregar(); // read-after-write
  }

  async function trocarPapel(m: Membro) {
    const sb = getBrowserSupabase();
    if (!sb) return;
    const novo = m.papel === "gerente" ? "operador" : "gerente";
    await sb.rpc("definir_membro", { p_profile_id: m.profile_id, p_ativo: null, p_papel: novo });
    await carregar();
  }

  function fechar() {
    setModal(false);
    setRes(null);
    setNome("");
    setEmail("");
    setPapel("operador");
    setCopiado(false);
  }

  if (semAcesso) {
    return (
      <NegocioShell title="Equipe">
        <div className="card">
          <div className="card-h"><Icon name="alert" /><h3>Acesso restrito</h3></div>
          <div style={{ fontSize: 13, color: "var(--ink-2)" }}>A gestão da equipe é do gerente ou do dono do negócio.</div>
        </div>
      </NegocioShell>
    );
  }

  return (
    <NegocioShell title="Equipe">
      <div className="card">
        <div className="card-h">
          <Icon name="user" /><h3>Funcionários</h3>
          <button className="btn btn-primary right" style={{ width: "auto", padding: "6px 14px", fontSize: 12.5 }} onClick={() => setModal(true)}>
            <Icon name="send" /> Convidar
          </button>
        </div>

        <div className="trust-banner" style={{ marginBottom: 10 }}>
          <Icon name="shield" />
          <div style={{ fontSize: 12.5 }}>
            <b>Gerente</b> tem acesso total. <b>Operador</b> cria e acompanha entregas, mas não vê carteira/financeiro nem chaves de API.
          </div>
        </div>

        {carregando ? (
          <div style={{ fontSize: 12.5, color: "var(--faint)" }}>Carregando…</div>
        ) : membros.length === 0 ? (
          <div style={{ fontSize: 12.5, color: "var(--faint)" }}>Nenhum funcionário ainda. Convide a sua equipe pra dividir a operação.</div>
        ) : (
          membros.map((m) => (
            <div key={m.profile_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{m.nome || "—"}</div>
                <div style={{ fontSize: 11.5, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.email || "—"}</div>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                <button onClick={() => trocarPapel(m)} className={`status-pill ${m.papel === "gerente" ? "s-live" : "s-pend"}`} style={{ cursor: "pointer", border: "none" }} title="Trocar papel">
                  {PAPEL[m.papel] ?? m.papel}
                </button>
                <button onClick={() => alternar(m)} className="btn" style={{ width: "auto", padding: "4px 10px", fontSize: 12 }}>
                  {m.ativo ? "Desativar" : "Reativar"}
                </button>
              </div>
            </div>
          ))
        )}
        <p className="hint">O funcionário entra com o e-mail e a senha temporária que aparece ao convidar.</p>
      </div>

      {modal && (
        <div onClick={fechar} style={{ position: "fixed", inset: 0, background: "rgba(20,20,45,.45)", display: "grid", placeItems: "center", zIndex: 300, padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} className="card" style={{ maxWidth: 400, width: "100%", margin: 0 }}>
            <div className="card-h" style={{ justifyContent: "space-between" }}>
              <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}><Icon name="send" /><h3 style={{ margin: 0 }}>Convidar funcionário</h3></span>
              <span onClick={fechar} style={{ cursor: "pointer", color: "var(--muted)", fontSize: 18 }}>×</span>
            </div>

            {!(res && "ok" in res) && (
              <>
                <div className="field">
                  <label>Nome</label>
                  <input className="input" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do funcionário" />
                </div>
                <div className="field">
                  <label>E-mail (será o login)</label>
                  <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="funcionario@email.com" />
                </div>
                <div className="field">
                  <label>Papel</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {(["operador", "gerente"] as const).map((p) => (
                      <button key={p} type="button" onClick={() => setPapel(p)} className={`btn ${papel === p ? "btn-primary" : ""}`} style={{ flex: 1, padding: "8px 0" }}>
                        {PAPEL[p]}
                      </button>
                    ))}
                  </div>
                  <p className="hint" style={{ marginTop: 6 }}>
                    {papel === "gerente" ? "Acesso total ao negócio." : "Cria e acompanha entregas. Não vê carteira nem API."}
                  </p>
                </div>
                <button className="btn btn-primary" style={{ marginTop: 4 }} disabled={enviando} onClick={convidar}>
                  <Icon name={enviando ? "spinner" : "checkThin"} /> {enviando ? "Convidando…" : "Criar login"}
                </button>
              </>
            )}

            {res && "semServiceRole" in res && (
              <div className="trust-banner" style={{ background: "var(--warn-bg)", borderColor: "#f3d6a8", color: "var(--warn)" }}>
                <Icon name="shield" />
                <div>A criação de logins liga junto com a conta de pagamento (CNPJ do dono). A estrutura da equipe já está pronta.</div>
              </div>
            )}
            {res && "erro" in res && (
              <div className="trust-banner" style={{ background: "var(--warn-bg)", borderColor: "#f3d6a8", color: "var(--warn)" }}>
                <Icon name="alert" /><div>{res.erro}</div>
              </div>
            )}
            {res && "ok" in res && (
              <div style={{ textAlign: "center" }}>
                <Icon name="checkThin" />
                <p style={{ fontWeight: 700, color: "var(--brand)", margin: "8px 0 2px" }}>Login criado!</p>
                <p className="hint" style={{ marginBottom: 8 }}>Passe pro funcionário. Ele troca a senha no primeiro acesso.</p>
                <div style={{ background: "var(--surface-2,#f4f5fb)", borderRadius: 10, padding: "10px 12px", fontSize: 13, textAlign: "left" }}>
                  <div><b>E-mail:</b> {email}</div>
                  <div><b>Senha temporária:</b> {res.senhaTemp}</div>
                </div>
                <button
                  className="btn btn-primary"
                  style={{ marginTop: 10 }}
                  onClick={() => { navigator.clipboard?.writeText(`Login: ${email}\nSenha: ${res.senhaTemp}`); setCopiado(true); }}
                >
                  <Icon name={copiado ? "checkThin" : "card"} /> {copiado ? "Copiado!" : "Copiar acesso"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </NegocioShell>
  );
}
