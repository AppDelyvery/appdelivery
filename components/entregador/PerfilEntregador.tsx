"use client";

import { useEffect, useState } from "react";
import EntregadorShell from "./EntregadorShell";
import { Icon } from "../Icons";
import { getBrowserSupabase } from "@/lib/supabase/browser";

type Ent = {
  nome: string;
  cpf: string;
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

export default function PerfilEntregador() {
  const [e, setE] = useState<Ent | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    (async () => {
      const sb = getBrowserSupabase();
      if (!sb) return;
      const { data } = await sb.from("entregadores").select("nome,cpf,vehicle_type,placa,status,rating,total_entregas").limit(1).maybeSingle();
      if (data) setE(data as Ent);
      setCarregando(false);
    })();
  }, []);

  const st = e ? PILL[e.status] ?? { cls: "s-pend", txt: e.status, msg: "" } : null;

  return (
    <EntregadorShell title="Verificação">
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
            <div className="card-h"><Icon name="user" /><h3>Meus dados</h3></div>
            {linha("Nome", e.nome)}
            {linha("CPF", e.cpf)}
            {linha("Veículo", e.vehicle_type + (e.placa ? ` · ${e.placa}` : ""))}
            {linha("Avaliação", e.rating != null ? `${e.rating} ★` : "—")}
            {linha("Entregas concluídas", String(e.total_entregas ?? 0))}
          </div>

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
