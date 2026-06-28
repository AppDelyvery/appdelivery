"use client";

import { useCallback, useEffect, useState } from "react";
import AdminShell from "./AdminShell";
import { Icon } from "../Icons";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { promoverOperador } from "@/actions/operadores";

type Row = {
  base_moto: number; per_km_moto: number; min_moto: number;
  base_carro: number; per_km_carro: number; min_carro: number;
  base_van: number; per_km_van: number; min_van: number;
  take_rate: number;
  raio_m: number;
  protecao_teto: number;
  pin_supervisor: string | null;
  risco_coleta_min: number;
  risco_gps_min: number;
  sla_buscando_min: number;
  sla_buscando_cancel_min: number;
  taxa_cancelamento: number;
};

export default function ConfigAdmin() {
  const [row, setRow] = useState<Row | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const sb = getBrowserSupabase();
      if (!sb) return;
      const { data } = await sb.from("config").select("*").eq("id", 1).single();
      if (data) setRow(data as Row);
    })();
  }, []);

  const num = (k: keyof Row) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setRow((r) => (r ? { ...r, [k]: Number(e.target.value) } : r));

  const salvar = async () => {
    if (!row) return;
    setMsg(null);
    setSalvando(true);
    const sb = getBrowserSupabase();
    const { error } = await sb!.from("config").update({ ...row, updated_at: new Date().toISOString() }).eq("id", 1);
    setSalvando(false);
    setMsg(error ? "Falha ao salvar — você precisa ser admin." : "Configurações salvas.");
  };

  if (!row)
    return (
      <AdminShell title="Configurações">
        <div className="card">
          <div style={{ padding: 20, textAlign: "center", color: "var(--muted)" }}>Carregando…</div>
        </div>
      </AdminShell>
    );

  const moeda = (label: string, k: keyof Row) => (
    <div className="field">
      <label>{label}</label>
      <input className="input" type="number" step="0.01" value={row[k] as number} onChange={num(k)} />
    </div>
  );

  return (
    <AdminShell title="Configurações">
      <div className="card">
        <div className="card-h">
          <Icon name="money" />
          <h3>Tabela de preço</h3>
        </div>
        <div className="cfg-veic"><div className="cfg-veic-h">Moto</div>
          {moeda("Bandeirada (R$)", "base_moto")}
          {moeda("Por km (R$)", "per_km_moto")}
          {moeda("Mínimo (R$)", "min_moto")}
        </div>
        <div className="cfg-veic"><div className="cfg-veic-h">Carro</div>
          {moeda("Bandeirada (R$)", "base_carro")}
          {moeda("Por km (R$)", "per_km_carro")}
          {moeda("Mínimo (R$)", "min_carro")}
        </div>
        <div className="cfg-veic"><div className="cfg-veic-h">Van</div>
          {moeda("Bandeirada (R$)", "base_van")}
          {moeda("Por km (R$)", "per_km_van")}
          {moeda("Mínimo (R$)", "min_van")}
        </div>
        <div className="field">
          <label>Take rate da plataforma (%)</label>
          <input
            className="input"
            type="number"
            step="1"
            value={Math.round(row.take_rate * 100)}
            onChange={(e) => setRow((r) => (r ? { ...r, take_rate: Number(e.target.value) / 100 } : r))}
          />
          <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 4 }}>
            Entregador fica com {100 - Math.round(row.take_rate * 100)}%.
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-h">
          <Icon name="shield" />
          <h3>Operação</h3>
        </div>
        <div className="field">
          <label>Raio de matching (metros)</label>
          <input className="input" type="number" value={row.raio_m} onChange={num("raio_m")} />
        </div>
        <div className="field">
          <label>Proteção de carga — teto de ressarcimento (R$)</label>
          <input className="input" type="number" step="1" value={row.protecao_teto} onChange={num("protecao_teto")} />
          <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 4 }}>Cobertura por pedido = menor entre o teto e o valor declarado.</div>
        </div>
        <div className="field">
          <label>PIN do supervisor (aprovações)</label>
          <input
            className="input"
            value={row.pin_supervisor ?? ""}
            placeholder="vazio = sem PIN"
            onChange={(e) => setRow((r) => (r ? { ...r, pin_supervisor: e.target.value } : r))}
          />
        </div>
      </div>

      <div className="card">
        <div className="card-h">
          <Icon name="bolt" />
          <h3>Controles operacionais</h3>
        </div>
        <div className="field">
          <label>Coleta atrasada — alerta após (min)</label>
          <input className="input" type="number" value={row.risco_coleta_min} onChange={num("risco_coleta_min")} />
          <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 4 }}>Aceitou e não coletou nesse tempo → pedido entra em risco no Despacho.</div>
        </div>
        <div className="field">
          <label>Carga parada — alerta de GPS frio após (min)</label>
          <input className="input" type="number" value={row.risco_gps_min} onChange={num("risco_gps_min")} />
          <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 4 }}>Coletou mas o entregador parou de se mover → alerta de carga em risco.</div>
        </div>
        <div className="field">
          <label>Sem entregador — alerta após (min)</label>
          <input className="input" type="number" value={row.sla_buscando_min} onChange={num("sla_buscando_min")} />
          <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 4 }}>Pedido em &ldquo;buscando&rdquo; além desse tempo → sinaliza no Despacho.</div>
        </div>
        <div className="field">
          <label>Auto-cancelar sem entregador após (min)</label>
          <input className="input" type="number" value={row.sla_buscando_cancel_min} onChange={num("sla_buscando_cancel_min")} />
          <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 4 }}>Acima de 0: cancela e estorna sozinho se ninguém aceitar nesse tempo. <b>0 desliga.</b></div>
        </div>
        <div className="field">
          <label>Taxa de cancelamento do lojista (R$)</label>
          <input className="input" type="number" step="0.01" value={row.taxa_cancelamento} onChange={num("taxa_cancelamento")} />
          <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 4 }}>Lojista cancela com entregador já designado → retém esse valor e repassa como compensação pro entregador. <b>0 = estorno cheio.</b></div>
        </div>
      </div>

      {msg && <div style={{ fontSize: 12.5, fontWeight: 600, color: msg.includes("salvas") ? "var(--go-dark)" : "var(--warn)", marginBottom: 10 }}>{msg}</div>}
      <button className="btn btn-primary" disabled={salvando} onClick={salvar}>
        <Icon name={salvando ? "spinner" : "checkThin"} /> {salvando ? "Salvando…" : "Salvar configurações"}
      </button>
      <p className="hint" style={{ marginBottom: 18 }}>Mudou aqui, vale na hora pros novos pedidos. Você não depende de ninguém pra ajustar o preço.</p>

      <Operadores pin={row.pin_supervisor ?? ""} />
    </AdminShell>
  );
}

function Operadores({ pin }: { pin: string }) {
  const [ops, setOps] = useState<{ email: string; nome: string; role: string }[]>([]);
  const [email, setEmail] = useState("");
  const [opPin, setOpPin] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const carregar = useCallback(async () => {
    const sb = getBrowserSupabase();
    if (!sb) return;
    const { data } = await sb.rpc("listar_operadores");
    if (data) setOps(data as { email: string; nome: string; role: string }[]);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregar();
  }, [carregar]);

  const agir = async (alvo: string, ativar: boolean) => {
    setMsg(null);
    setBusy(true);
    const r = await promoverOperador(alvo, ativar, opPin || pin);
    setBusy(false);
    if (r.ok) {
      setEmail("");
      await carregar();
    } else {
      setMsg(r.motivo === "pin-invalido" ? "PIN incorreto." : r.motivo);
    }
  };

  return (
    <div className="card">
      <div className="card-h">
        <Icon name="user" />
        <h3>Operadores</h3>
      </div>
      <p style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 10 }}>
        Quem ajuda a operar (aprovar entregador, etc). A pessoa precisa já ter conta no app.
      </p>
      {ops.map((o) => (
        <div key={o.email} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid var(--line)" }}>
          <div>
            <div className="td-name" style={{ fontSize: 13 }}>{o.nome}</div>
            <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{o.email} · {o.role}</div>
          </div>
          {o.role === "operador" && (
            <button className="btn btn-ghost" style={{ width: "auto", padding: "6px 12px", fontSize: 12 }} disabled={busy} onClick={() => agir(o.email, false)}>
              Remover
            </button>
          )}
        </div>
      ))}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input className="input" type="email" placeholder="e-mail do operador" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button className="btn btn-go" style={{ width: "auto", padding: "0 16px" }} disabled={busy || !email} onClick={() => agir(email, true)}>
          <Icon name="checkThin" />
        </button>
      </div>
      <input className="input" type="password" placeholder="PIN (se diferente do salvo)" value={opPin} onChange={(e) => setOpPin(e.target.value)} style={{ marginTop: 8 }} />
      {msg && <div style={{ color: "var(--warn)", fontSize: 12.5, marginTop: 8, fontWeight: 600 }}>{msg}</div>}
    </div>
  );
}
