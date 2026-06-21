"use client";

import { useEffect, useState } from "react";
import EntregadorShell from "./EntregadorShell";
import { Icon } from "../Icons";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { mascaraTelefone, mascaraCPF } from "@/lib/validacao";

type Ent = {
  nome: string;
  cpf: string;
  telefone: string | null;
  chave_pix: string | null;
  vehicle_type: string;
  placa: string | null;
  status: string;
  rating: number | null;
  total_entregas: number | null;
};

const PILL: Record<string, { cls: string; txt: string; msg: string }> = {
  aprovado: { cls: "s-ok", txt: "Aprovado", msg: "Antecedentes e documentos checados. Você pode aceitar corridas." },
  em_verificacao: { cls: "s-pend", txt: "Em verificação", msg: "Seus dados estão sendo conferidos. Avisamos quando liberar." },
  cadastro: { cls: "s-pend", txt: "Cadastro incompleto", msg: "Finalize o envio de documentos pra entrar na fila de verificação." },
  recusado: { cls: "s-pend", txt: "Recusado", msg: "Seu cadastro não foi aprovado. Fale com a central pelo suporte." },
  suspenso: { cls: "s-pend", txt: "Suspenso", msg: "Sua conta está suspensa. Fale com a central pelo suporte." },
};

const linha = (label: string, valor: string) => (
  <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid var(--line)", fontSize: 13 }}>
    <span style={{ color: "var(--muted)" }}>{label}</span>
    <span style={{ color: "var(--ink)", fontWeight: 600 }}>{valor}</span>
  </div>
);

const VEIC: Record<string, string> = { moto: "Moto", carro: "Carro", van: "Van" };

export default function PerfilEntregador() {
  const [e, setE] = useState<Ent | null>(null);
  const [carregando, setCarregando] = useState(true);

  const [editando, setEditando] = useState(false);
  const [telefone, setTelefone] = useState("");
  const [chavePix, setChavePix] = useState("");
  const [placa, setPlaca] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function carregar() {
    const sb = getBrowserSupabase();
    if (!sb) return;
    const { data } = await sb
      .from("entregadores")
      .select("nome,cpf,telefone,chave_pix,vehicle_type,placa,status,rating,total_entregas")
      .limit(1)
      .maybeSingle();
    if (data) setE(data as Ent);
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  function abrirEdicao() {
    if (!e) return;
    setTelefone(e.telefone || "");
    setChavePix(e.chave_pix || "");
    setPlaca(e.placa || "");
    setErro(null);
    setEditando(true);
  }

  async function salvar() {
    setSalvando(true);
    setErro(null);
    const sb = getBrowserSupabase();
    if (!sb) return;
    const { error } = await sb.rpc("atualizar_meu_perfil_entregador", {
      p_telefone: telefone.trim(),
      p_chave_pix: chavePix.trim(),
      p_placa: placa.trim(),
    });
    if (error) {
      setErro("Não consegui salvar. Tente de novo.");
      setSalvando(false);
      return;
    }
    // read-after-write: relê a row do banco; UI verde não é prova
    await carregar();
    setSalvando(false);
    setEditando(false);
  }

  const st = e ? PILL[e.status] ?? { cls: "s-pend", txt: e.status, msg: "" } : null;
  const veicIcon = e?.vehicle_type === "carro" ? "car" : e?.vehicle_type === "van" ? "van" : "moto";

  return (
    <EntregadorShell title="Meu perfil">
      <div className="card">
        <div className="card-h">
          <Icon name="shield" /><h3>Status da conta</h3>
          {st && <span className={`right status-pill ${st.cls}`}>{st.txt}</span>}
        </div>
        {carregando ? (
          <div style={{ fontSize: 12.5, color: "var(--faint)" }}>Carregando…</div>
        ) : !e ? (
          <div style={{ fontSize: 12.5, color: "var(--faint)" }}>Conta sem cadastro de entregador. Refaça o cadastro.</div>
        ) : (
          <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6 }}>{st?.msg}</div>
        )}
      </div>

      {e && !carregando && (
        <>
          <div className="card">
            <div className="card-h">
              <Icon name="user" /><h3>Meus dados</h3>
              {!editando && (
                <button className="btn right" style={{ width: "auto", padding: "5px 12px", fontSize: 12.5 }} onClick={abrirEdicao}>
                  <Icon name="pen" /> Editar
                </button>
              )}
            </div>
            {linha("Nome", e.nome)}
            {linha("CPF", mascaraCPF(e.cpf))}
            {editando ? (
              <div className="field" style={{ marginTop: 10 }}>
                <label>Telefone</label>
                <input className="input" inputMode="numeric" value={telefone} onChange={(ev) => setTelefone(mascaraTelefone(ev.target.value))} placeholder="(63) 99999-9999" />
              </div>
            ) : (
              linha("Telefone", e.telefone ? mascaraTelefone(e.telefone) : "—")
            )}
            {linha("Avaliação", e.rating != null ? `${e.rating} ★` : "—")}
            {linha("Entregas concluídas", String(e.total_entregas ?? 0))}
          </div>

          <div className="card">
            <div className="card-h"><Icon name="money" /><h3>Repasse (Pix)</h3></div>
            {editando ? (
              <div className="field">
                <label>Sua chave Pix</label>
                <input className="input" value={chavePix} onChange={(ev) => setChavePix(ev.target.value)} placeholder="CPF, telefone, e-mail ou aleatória" />
              </div>
            ) : (
              linha("Chave Pix", e.chave_pix || "—")
            )}
            <p className="hint">É pra essa chave que cai o saldo das suas entregas quando você saca. Mantenha sempre certa.</p>
          </div>

          <div className="card">
            <div className="card-h"><Icon name={veicIcon} /><h3>Meu veículo</h3></div>
            {linha("Tipo", VEIC[e.vehicle_type] ?? e.vehicle_type)}
            {editando ? (
              <div className="field" style={{ marginTop: 10 }}>
                <label>Placa</label>
                <input className="input" value={placa} onChange={(ev) => setPlaca(ev.target.value.toUpperCase())} placeholder="ABC1D23" maxLength={8} />
              </div>
            ) : (
              linha("Placa", e.placa || "—")
            )}
            <p className="hint">Trocar o tipo de veículo exige nova verificação — fale com a central pelo suporte.</p>
          </div>

          {editando && (
            <div className="card">
              {erro && (
                <div className="trust-banner" style={{ background: "var(--warn-bg)", borderColor: "#f3d6a8", color: "var(--warn)", marginBottom: 10 }}>
                  <Icon name="alert" /><div>{erro}</div>
                </div>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-primary" style={{ width: "auto", padding: "9px 18px" }} disabled={salvando} onClick={salvar}>
                  <Icon name={salvando ? "spinner" : "check"} /> {salvando ? "Salvando…" : "Salvar"}
                </button>
                <button className="btn" style={{ width: "auto", padding: "9px 18px" }} disabled={salvando} onClick={() => setEditando(false)}>
                  Cancelar
                </button>
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-h"><Icon name="shield" /><h3>Sobre a verificação</h3></div>
            <p style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.7, margin: 0 }}>
              O APPDELYVERY confere <b>antecedentes</b> e documentos de quem entrega — é o que dá segurança pro negócio
              confiar a encomenda. O resultado dessa checagem é <b>sigiloso (LGPD)</b> e fica só com a central; aqui você
              vê apenas se está <b>liberado</b> pra rodar.
            </p>
          </div>
        </>
      )}
    </EntregadorShell>
  );
}
