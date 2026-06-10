"use client";

import { useEffect, useState } from "react";
import NegocioShell from "./NegocioShell";
import { Icon } from "../Icons";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { money } from "@/lib/precos";
import { criarRecarga, type RecargaResult } from "@/actions/recarga";

type Estab = { razao_social: string; saldo_carteira: number | null };

export default function CarteiraNegocio() {
  const [estab, setEstab] = useState<Estab | null>(null);
  const [carregando, setCarregando] = useState(true);

  const [modal, setModal] = useState(false);
  const [valor, setValor] = useState("50");
  const [enviando, setEnviando] = useState(false);
  const [res, setRes] = useState<RecargaResult | null>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    (async () => {
      const sb = getBrowserSupabase();
      if (!sb) return;
      const { data } = await sb.from("estabelecimentos").select("razao_social,saldo_carteira").limit(1).maybeSingle();
      if (data) setEstab(data as Estab);
      setCarregando(false);
    })();
  }, []);

  const saldo = estab?.saldo_carteira ?? 0;

  async function gerar() {
    setEnviando(true);
    setRes(null);
    const r = await criarRecarga(Number(valor.replace(",", ".")));
    setRes(r);
    setEnviando(false);
  }

  function fechar() {
    setModal(false);
    setRes(null);
    setCopiado(false);
  }

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
        <button className="btn btn-primary" style={{ width: "auto", padding: "9px 18px", marginTop: 12 }} onClick={() => setModal(true)}>
          <Icon name="upload" /> Adicionar saldo
        </button>
        <p className="hint">Recarga por Pix, mínimo R$ 50. O saldo entra assim que o pagamento for confirmado.</p>
      </div>

      {modal && (
        <div onClick={fechar} style={{ position: "fixed", inset: 0, background: "rgba(20,20,45,.45)", display: "grid", placeItems: "center", zIndex: 300, padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} className="card" style={{ maxWidth: 380, width: "100%", margin: 0 }}>
            <div className="card-h" style={{ justifyContent: "space-between" }}>
              <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}><Icon name="upload" /><h3 style={{ margin: 0 }}>Adicionar saldo</h3></span>
              <span onClick={fechar} style={{ cursor: "pointer", color: "var(--muted)", fontSize: 18 }}>×</span>
            </div>

            {!res && (
              <>
                <div className="field">
                  <label>Valor da recarga (mín. R$ 50)</label>
                  <input className="input" inputMode="numeric" value={valor} onChange={(e) => setValor(e.target.value.replace(/[^\d,]/g, ""))} placeholder="50" />
                </div>
                <button className="btn btn-primary" style={{ marginTop: 6 }} disabled={enviando} onClick={gerar}>
                  <Icon name={enviando ? "spinner" : "money"} /> {enviando ? "Gerando…" : "Gerar Pix"}
                </button>
              </>
            )}

            {res && "naoConfigurado" in res && (
              <div className="trust-banner" style={{ background: "var(--warn-bg)", borderColor: "#f3d6a8", color: "var(--warn)" }}>
                <Icon name="shield" />
                <div>A recarga por Pix ativa assim que a conta <b>Asaas</b> (CNPJ do dono) for ligada. A estrutura já está pronta.</div>
              </div>
            )}

            {res && "erro" in res && (
              <div className="trust-banner" style={{ background: "var(--warn-bg)", borderColor: "#f3d6a8", color: "var(--warn)" }}>
                <Icon name="shield" />
                <div>{res.erro}</div>
              </div>
            )}

            {res && "ok" in res && (
              <div style={{ textAlign: "center" }}>
                {res.qrBase64 && <img src={`data:image/png;base64,${res.qrBase64}`} alt="QR Pix" style={{ width: 200, height: 200, margin: "8px auto" }} />}
                <p className="hint" style={{ marginTop: 4 }}>Escaneie o QR ou copie o código abaixo. O saldo entra ao confirmar o pagamento.</p>
                {res.pixCopiaCola && (
                  <button
                    className="btn btn-primary"
                    style={{ marginTop: 8 }}
                    onClick={() => {
                      navigator.clipboard?.writeText(res.pixCopiaCola!);
                      setCopiado(true);
                    }}
                  >
                    <Icon name={copiado ? "checkThin" : "card"} /> {copiado ? "Copiado!" : "Copiar código Pix"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </NegocioShell>
  );
}
