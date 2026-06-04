"use client";

import { useEffect, useState } from "react";
import NegocioShell from "./NegocioShell";
import { Icon } from "../Icons";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { money } from "@/lib/precos";

type Estab = { razao_social: string; saldo_carteira: number | null };

export default function CarteiraNegocio() {
  const [estab, setEstab] = useState<Estab | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    (async () => {
      const sb = getBrowserSupabase();
      if (!sb) return;
      // RLS devolve só o estabelecimento do próprio lojista
      const { data } = await sb.from("estabelecimentos").select("razao_social,saldo_carteira").limit(1).maybeSingle();
      if (data) setEstab(data as Estab);
      setCarregando(false);
    })();
  }, []);

  const saldo = estab?.saldo_carteira ?? 0;

  return (
    <NegocioShell title="Carteira">
      <div className="card" style={{ background: "linear-gradient(135deg,var(--brand),#3730a3)", color: "#fff", border: "none" }}>
        <div style={{ fontSize: 12.5, opacity: 0.85, marginBottom: 6 }}>Saldo disponível</div>
        <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: -0.5 }}>{carregando ? "—" : money(saldo)}</div>
        <div style={{ fontSize: 12, opacity: 0.85, marginTop: 6 }}>{estab?.razao_social ?? ""}</div>
      </div>

      <div className="card">
        <div className="card-h"><Icon name="money" /><h3>Como funciona</h3></div>
        <ul style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.8, paddingLeft: 18, margin: 0 }}>
          <li>Você abastece a carteira por <b>Pix</b> e cada entrega debita o frete na hora.</li>
          <li>O entregador recebe <b>80%</b> do frete na conclusão; a plataforma fica com o restante (take rate).</li>
          <li>Carteira pré-paga evita boleto a vencer e mantém a operação rodando sem fricção.</li>
        </ul>
        <button className="btn btn-primary" style={{ width: "auto", padding: "9px 18px", marginTop: 12 }} disabled>
          <Icon name="upload" /> Adicionar saldo (em breve)
        </button>
        <p className="hint">Recarga por Pix e extrato detalhado de transações ligam quando a conta <b>Asaas</b> existir (CNPJ do dono) — ver build-spec/06-FINANCEIRO.</p>
      </div>
    </NegocioShell>
  );
}
