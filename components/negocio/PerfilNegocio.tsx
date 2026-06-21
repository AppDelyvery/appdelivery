"use client";

import { useEffect, useState } from "react";
import NegocioShell from "./NegocioShell";
import { Icon } from "../Icons";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { mascaraTelefone, mascaraCnpjOuCpf } from "@/lib/validacao";

type Estab = {
  razao_social: string;
  cnpj: string | null;
  endereco: string | null;
  telefone: string | null;
  plano: string | null;
  ativo: boolean;
};

const linha = (label: string, valor: string) => (
  <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid var(--line)", fontSize: 13 }}>
    <span style={{ color: "var(--muted)" }}>{label}</span>
    <span style={{ color: "var(--ink)", fontWeight: 600, textAlign: "right", maxWidth: "60%" }}>{valor}</span>
  </div>
);

const planoTxt = (p: string | null) => (p === "prepago" ? "Pré-pago (carteira)" : p || "—");

export default function PerfilNegocio() {
  const [e, setE] = useState<Estab | null>(null);
  const [carregando, setCarregando] = useState(true);

  const [editando, setEditando] = useState(false);
  const [razao, setRazao] = useState("");
  const [endereco, setEndereco] = useState("");
  const [telefone, setTelefone] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function carregar() {
    const sb = getBrowserSupabase();
    if (!sb) return;
    const { data } = await sb.from("estabelecimentos").select("razao_social,cnpj,endereco,telefone,plano,ativo").limit(1).maybeSingle();
    if (data) setE(data as Estab);
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  function abrirEdicao() {
    if (!e) return;
    setRazao(e.razao_social || "");
    setEndereco(e.endereco || "");
    setTelefone(e.telefone || "");
    setErro(null);
    setEditando(true);
  }

  async function salvar() {
    if (!razao.trim()) {
      setErro("A razão social é obrigatória.");
      return;
    }
    setSalvando(true);
    setErro(null);
    const sb = getBrowserSupabase();
    if (!sb) return;
    const { error } = await sb.rpc("atualizar_meu_negocio", {
      p_razao_social: razao.trim(),
      p_endereco: endereco.trim(),
      p_telefone: telefone.trim(),
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

  return (
    <NegocioShell title="Meu negócio">
      <div className="card">
        <div className="card-h">
          <Icon name="building" /><h3>Dados cadastrais</h3>
          {e && !editando && (
            <button
              className="btn right"
              style={{ width: "auto", padding: "5px 12px", fontSize: 12.5 }}
              onClick={abrirEdicao}
            >
              <Icon name="pen" /> Editar
            </button>
          )}
        </div>

        {carregando ? (
          <div style={{ fontSize: 12.5, color: "var(--faint)" }}>Carregando…</div>
        ) : !e ? (
          <div style={{ fontSize: 12.5, color: "var(--faint)" }}>Conta sem estabelecimento vinculado. Refaça o cadastro.</div>
        ) : editando ? (
          <>
            <div className="field">
              <label>Razão social</label>
              <input className="input" value={razao} onChange={(ev) => setRazao(ev.target.value)} placeholder="Nome da empresa" />
            </div>
            <div className="field">
              <label>Endereço (ponto de coleta)</label>
              <input className="input" value={endereco} onChange={(ev) => setEndereco(ev.target.value)} placeholder="Rua, nº, bairro" />
            </div>
            <div className="field">
              <label>Telefone</label>
              <input className="input" inputMode="numeric" value={telefone} onChange={(ev) => setTelefone(mascaraTelefone(ev.target.value))} placeholder="(63) 99999-9999" />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderTop: "1px solid var(--line)", marginTop: 4, fontSize: 12.5 }}>
              <span style={{ color: "var(--muted)" }}>CNPJ</span>
              <span style={{ color: "var(--faint)" }}>{e.cnpj ? mascaraCnpjOuCpf(e.cnpj) : "—"} · travado</span>
            </div>

            {erro && (
              <div className="trust-banner" style={{ background: "var(--warn-bg)", borderColor: "#f3d6a8", color: "var(--warn)", marginTop: 10 }}>
                <Icon name="alert" /><div>{erro}</div>
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button className="btn btn-primary" style={{ width: "auto", padding: "9px 18px" }} disabled={salvando} onClick={salvar}>
                <Icon name={salvando ? "spinner" : "check"} /> {salvando ? "Salvando…" : "Salvar"}
              </button>
              <button className="btn" style={{ width: "auto", padding: "9px 18px" }} disabled={salvando} onClick={() => setEditando(false)}>
                Cancelar
              </button>
            </div>
            <p className="hint">CNPJ, plano e status são controlados pela operação. O endereço é o ponto de coleta padrão das suas entregas.</p>
          </>
        ) : (
          <>
            {linha("Razão social", e.razao_social)}
            {linha("CNPJ", e.cnpj ? mascaraCnpjOuCpf(e.cnpj) : "—")}
            {linha("Endereço", e.endereco || "—")}
            {linha("Telefone", e.telefone ? mascaraTelefone(e.telefone) : "—")}
            {linha("Plano", planoTxt(e.plano))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", fontSize: 13 }}>
              <span style={{ color: "var(--muted)" }}>Status</span>
              <span className={`status-pill ${e.ativo ? "s-ok" : "s-pend"}`}>{e.ativo ? "Ativo" : "Suspenso"}</span>
            </div>
            <p className="hint">Suspensão/reativação e troca de plano são controladas pela operação (admin).</p>
          </>
        )}
      </div>
    </NegocioShell>
  );
}
