"use client";

import { useEffect, useState } from "react";
import NegocioShell from "./NegocioShell";
import { Icon } from "../Icons";
import { getBrowserSupabase } from "@/lib/supabase/browser";

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

export default function PerfilNegocio() {
  const [e, setE] = useState<Estab | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    (async () => {
      const sb = getBrowserSupabase();
      if (!sb) return;
      const { data } = await sb.from("estabelecimentos").select("razao_social,cnpj,endereco,telefone,plano,ativo").limit(1).maybeSingle();
      if (data) setE(data as Estab);
      setCarregando(false);
    })();
  }, []);

  return (
    <NegocioShell title="Meu negócio">
      <div className="card">
        <div className="card-h">
          <Icon name="building" /><h3>Dados cadastrais</h3>
          {e && <span className={`right status-pill ${e.ativo ? "s-ok" : "s-pend"}`}>{e.ativo ? "Ativo" : "Suspenso"}</span>}
        </div>
        {carregando ? (
          <div style={{ fontSize: 12.5, color: "var(--faint)" }}>Carregando…</div>
        ) : !e ? (
          <div style={{ fontSize: 12.5, color: "var(--faint)" }}>Conta sem estabelecimento vinculado. Refaça o cadastro.</div>
        ) : (
          <>
            {linha("Razão social", e.razao_social)}
            {linha("CNPJ", e.cnpj || "—")}
            {linha("Endereço", e.endereco || "—")}
            {linha("Telefone", e.telefone || "—")}
            {linha("Plano", e.plano === "prepago" ? "Pré-pago (carteira)" : e.plano || "—")}
          </>
        )}
        <p className="hint">Edição de dados e troca de plano entram na próxima fatia. Suspensão/reativação é controlada pela operação (admin).</p>
      </div>
    </NegocioShell>
  );
}
