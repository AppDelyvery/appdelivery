"use client";

import { useCallback, useEffect, useState } from "react";
import AdminShell from "./AdminShell";
import { Icon } from "../Icons";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { aprovarEntregador } from "@/actions/aprovarEntregador";

type Ent = { id: string; nome: string; vehicle_type: string; status: string; rating: number | null };
const PILL: Record<string, { cls: string; txt: string }> = {
  aprovado: { cls: "s-ok", txt: "Aprovado" },
  em_verificacao: { cls: "s-pend", txt: "Em verificação" },
  cadastro: { cls: "s-pend", txt: "Cadastro" },
  recusado: { cls: "s-pend", txt: "Recusado" },
  suspenso: { cls: "s-pend", txt: "Suspenso" },
};

export default function EntregadoresAdmin() {
  const [ents, setEnts] = useState<Ent[]>([]);
  const [aprovando, setAprovando] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const sb = getBrowserSupabase();
    if (!sb) return;
    const { data } = await sb.from("entregadores").select("id,nome,vehicle_type,status,rating").order("created_at", { ascending: false });
    if (data) setEnts(data as Ent[]);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregar();
  }, [carregar]);

  const confirmar = async (id: string) => {
    setMsg(null);
    const r = await aprovarEntregador(id, pin);
    if (r.ok) {
      setAprovando(null);
      setPin("");
      await carregar();
    } else {
      setMsg(r.motivo === "pin-invalido" ? "PIN incorreto." : r.motivo);
    }
  };

  const pendentes = ents.filter((e) => e.status === "em_verificacao" || e.status === "cadastro");

  return (
    <AdminShell title="Entregadores">
      <div className="card">
        <div className="card-h">
          <Icon name="shield" />
          <h3>Fila de aprovação</h3>
          <span className="right">{pendentes.length} pendente(s)</span>
        </div>
        {pendentes.length === 0 && (
          <div style={{ fontSize: 13, color: "var(--muted)", textAlign: "center", padding: "12px 0" }}>Nenhum entregador na fila.</div>
        )}
        {pendentes.map((e) => (
          <div key={e.id} style={{ padding: "11px 0", borderBottom: "1px solid var(--line)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div className="td-name" style={{ fontSize: 13.5 }}>{e.nome}</div>
                <div style={{ color: "var(--muted)", fontSize: 11.5, marginTop: 2 }}>{e.vehicle_type} · {PILL[e.status]?.txt ?? e.status}</div>
              </div>
              {aprovando !== e.id && (
                <button className="btn btn-go" style={{ width: "auto", padding: "8px 15px", fontSize: 12.5 }} onClick={() => { setAprovando(e.id); setPin(""); setMsg(null); }}>
                  <Icon name="checkThin" /> Aprovar
                </button>
              )}
            </div>
            {aprovando === e.id && (
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <input className="input" type="password" placeholder="PIN do supervisor" value={pin} onChange={(ev) => setPin(ev.target.value)} />
                <button className="btn btn-go" style={{ width: "auto", padding: "0 14px" }} onClick={() => confirmar(e.id)}><Icon name="checkThin" /></button>
                <button className="btn btn-ghost" style={{ width: "auto", padding: "0 12px" }} onClick={() => { setAprovando(null); setMsg(null); }}><Icon name="stop" /></button>
              </div>
            )}
          </div>
        ))}
        {msg && <div style={{ color: "var(--warn)", fontSize: 12.5, marginTop: 8, fontWeight: 600 }}>{msg}</div>}
      </div>

      <div className="card">
        <div className="card-h">
          <Icon name="moto" />
          <h3>Todos os entregadores</h3>
          <span className="right">{ents.length}</span>
        </div>
        <table>
          <tbody>
            <tr><th>Nome</th><th>Veículo</th><th>Status</th></tr>
            {ents.map((e) => (
              <tr key={e.id}>
                <td className="td-name">{e.nome}</td>
                <td>{e.vehicle_type}</td>
                <td><span className={`status-pill ${PILL[e.status]?.cls ?? "s-pend"}`}><Icon name={e.status === "aprovado" ? "checkThin" : "clock"} /> {PILL[e.status]?.txt ?? e.status}</span></td>
              </tr>
            ))}
            {ents.length === 0 && <tr><td colSpan={3} style={{ color: "var(--faint)", fontSize: 12.5 }}>Nenhum entregador ainda.</td></tr>}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
