"use client";

import { useEffect, useState } from "react";
import AdminShell from "./AdminShell";
import { Icon } from "../Icons";
import { getBrowserSupabase } from "@/lib/supabase/browser";

type Row = {
  base_moto: number;
  base_carro: number;
  base_van: number;
  per_km: number;
  minimo: number;
  take_rate: number;
  raio_m: number;
  pin_supervisor: string | null;
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
        {moeda("Bandeirada moto (R$)", "base_moto")}
        {moeda("Bandeirada carro (R$)", "base_carro")}
        {moeda("Bandeirada van (R$)", "base_van")}
        {moeda("Por km (R$)", "per_km")}
        {moeda("Valor mínimo (R$)", "minimo")}
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
          <label>PIN do supervisor (aprovações)</label>
          <input
            className="input"
            value={row.pin_supervisor ?? ""}
            placeholder="vazio = sem PIN"
            onChange={(e) => setRow((r) => (r ? { ...r, pin_supervisor: e.target.value } : r))}
          />
        </div>
      </div>

      {msg && <div style={{ fontSize: 12.5, fontWeight: 600, color: msg.includes("salvas") ? "var(--go-dark)" : "var(--warn)", marginBottom: 10 }}>{msg}</div>}
      <button className="btn btn-primary" disabled={salvando} onClick={salvar}>
        <Icon name={salvando ? "spinner" : "checkThin"} /> {salvando ? "Salvando…" : "Salvar configurações"}
      </button>
      <p className="hint">Mudou aqui, vale na hora pros novos pedidos. Você não depende de ninguém pra ajustar o preço.</p>
    </AdminShell>
  );
}
