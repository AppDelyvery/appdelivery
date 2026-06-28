"use client";

import { useCallback, useEffect, useState } from "react";
import AdminShell from "./AdminShell";
import Busca, { norm } from "./Busca";
import { Icon } from "../Icons";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { definirStatusEntregador, type StatusEntregador } from "@/actions/moderarEntregador";

type Ent = { id: string; nome: string; cpf: string; vehicle_type: string; placa: string | null; status: string; rating: number | null; total_entregas: number | null; is_online: boolean | null };
type Verif = { tipo: string; resultado: string; provedor: string | null; criado_at: string };
type Doc = { tipo: string; url: string };

const PILL: Record<string, { cls: string; txt: string }> = {
  aprovado: { cls: "s-ok", txt: "Aprovado" },
  em_verificacao: { cls: "s-pend", txt: "Em verificação" },
  cadastro: { cls: "s-pend", txt: "Cadastro" },
  recusado: { cls: "s-pend", txt: "Recusado" },
  suspenso: { cls: "s-pend", txt: "Suspenso" },
};

export default function EntregadoresAdmin() {
  const [ents, setEnts] = useState<Ent[]>([]);
  const [sel, setSel] = useState<Ent | null>(null);
  const [q, setQ] = useState("");

  const carregar = useCallback(async () => {
    const sb = getBrowserSupabase();
    if (!sb) return;
    const { data } = await sb.from("entregadores").select("id,nome,cpf,vehicle_type,placa,status,rating,total_entregas,is_online").order("created_at", { ascending: false });
    if (data) setEnts(data as Ent[]);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregar();
  }, [carregar]);

  const pendentes = ents.filter((e) => e.status === "em_verificacao" || e.status === "cadastro");
  const online = ents.filter((e) => e.is_online).length;
  const aprovados = ents.filter((e) => e.status === "aprovado").length;

  const linha = (e: Ent) => (
    <div key={e.id} onClick={() => setSel(e)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--line)", cursor: "pointer" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
        <span style={{ position: "relative", flexShrink: 0 }}>
          <span style={{ width: 38, height: 38, borderRadius: 11, background: "linear-gradient(135deg,var(--brand-2),var(--brand-dark))", color: "#fff", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 15 }}>{e.nome.charAt(0).toUpperCase()}</span>
          {e.is_online && <span style={{ position: "absolute", right: -2, bottom: -2, width: 12, height: 12, borderRadius: "50%", background: "var(--go)", border: "2px solid #fff" }} />}
        </span>
        <div style={{ minWidth: 0 }}>
          <div className="td-name" style={{ fontSize: 13.5 }}>{e.nome}</div>
          <div style={{ color: "var(--muted)", fontSize: 11.5, marginTop: 2 }}>{e.vehicle_type}{e.placa ? ` · ${e.placa}` : ""} · nota {e.rating ?? "—"} · {e.total_entregas ?? 0} entregas</div>
        </div>
      </div>
      <span className={`status-pill ${PILL[e.status]?.cls ?? "s-pend"}`}>{PILL[e.status]?.txt ?? e.status}</span>
    </div>
  );

  return (
    <AdminShell title="Entregadores">
      <div className="kpis">
        <div className="kpi"><div className="ic"><Icon name="moto" /></div><div className="v">{ents.length}</div><div className="l">Entregadores</div></div>
        <div className="kpi"><div className="ic"><Icon name="moto" /></div><div className="v" style={{ color: "var(--go)" }}>{online}</div><div className="l">Online agora</div></div>
        <div className="kpi"><div className="ic"><Icon name="checkThin" /></div><div className="v">{aprovados}</div><div className="l">Aprovados</div></div>
        <div className="kpi"><div className="ic"><Icon name="shield" /></div><div className="v">{pendentes.length}</div><div className="l">Na fila</div></div>
      </div>
      <div className="card">
        <div className="card-h"><Icon name="shield" /><h3>Fila de aprovação</h3><span className="right">{pendentes.length} pendente(s)</span></div>
        {pendentes.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--muted)", textAlign: "center", padding: "12px 0" }}>Nenhum entregador na fila.</div>
        ) : (
          pendentes.map(linha)
        )}
      </div>

      <div className="card">
        <div className="card-h"><Icon name="moto" /><h3>Todos os entregadores</h3><span className="right">{ents.length}</span></div>
        <Busca value={q} onChange={setQ} placeholder="Buscar por nome ou CPF…" />
        {(() => {
          const f = ents.filter((e) => norm(`${e.nome} ${e.cpf}`).includes(norm(q)));
          return f.length === 0 ? <div style={{ fontSize: 12.5, color: "var(--faint)" }}>Nenhum entregador encontrado.</div> : f.map(linha);
        })()}
      </div>
      <p className="hint">Clique num entregador pra ver o perfil (documentos, verificação) e aprovar / suspender / recusar.</p>

      {sel && <Drawer ent={sel} onClose={() => setSel(null)} onMudou={async () => { await carregar(); setSel(null); }} />}
    </AdminShell>
  );
}

function Drawer({ ent, onClose, onMudou }: { ent: Ent; onClose: () => void; onMudou: () => void }) {
  const [verifs, setVerifs] = useState<Verif[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [pin, setPin] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  useEffect(() => {
    (async () => {
      const sb = getBrowserSupabase();
      if (!sb) return;
      const { data: v } = await sb.from("verificacoes").select("tipo,resultado,provedor,criado_at").eq("entregador_id", ent.id).order("criado_at", { ascending: false });
      if (v) setVerifs(v as Verif[]);
      const { data: d } = await sb.from("entregador_documentos").select("tipo,url").eq("entregador_id", ent.id);
      if (d) setDocs(d as Doc[]);
    })();
  }, [ent.id]);

  const acao = async (status: StatusEntregador) => {
    setMsg(null);
    setBusy(true);
    const r = await definirStatusEntregador(ent.id, status, pin);
    setBusy(false);
    if (r.ok) onMudou();
    else setMsg(r.motivo === "pin-invalido" ? "PIN incorreto." : r.motivo);
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", zIndex: 200 }} />
      <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "min(440px,100vw)", background: "var(--bg)", borderLeft: "1px solid var(--line)", boxShadow: "var(--shadow-lg)", zIndex: 201, overflowY: "auto", padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>{ent.nome}</div>
          <button className="btn btn-ghost" style={{ width: "auto", padding: "6px 12px" }} onClick={onClose}><Icon name="stop" /></button>
        </div>

        <div className="card">
          <div className="card-h"><Icon name="user" /><h3>Cadastro</h3><span className={`right status-pill ${PILL[ent.status]?.cls ?? "s-pend"}`}>{PILL[ent.status]?.txt ?? ent.status}</span></div>
          <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.9 }}>
            CPF: {ent.cpf}
            <br />
            Veículo: {ent.vehicle_type}{ent.placa ? ` · ${ent.placa}` : ""}
            <br />
            Rating: {ent.rating ?? "—"} · Entregas: {ent.total_entregas ?? 0}
          </div>
        </div>

        <div className="card">
          <div className="card-h"><Icon name="shield" /><h3>Verificação (LGPD · só admin)</h3></div>
          {verifs.length === 0 ? (
            <div style={{ fontSize: 12.5, color: "var(--faint)" }}>Sem verificações registradas (rodam quando FlagCheck/Infosimples/idwall estiverem plugados).</div>
          ) : (
            verifs.map((v, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "5px 0" }}>
                <span>{v.tipo}{v.provedor ? ` · ${v.provedor}` : ""}</span>
                <span className={`status-pill ${v.resultado === "aprovado" ? "s-ok" : "s-pend"}`}>{v.resultado}</span>
              </div>
            ))
          )}
        </div>

        <div className="card">
          <div className="card-h"><Icon name="card" /><h3>Documentos</h3></div>
          {docs.length === 0 ? (
            <div style={{ fontSize: 12.5, color: "var(--faint)" }}>Sem documentos enviados ainda.</div>
          ) : (
            docs.map((d, i) => (
              <a key={i} href={d.url} target="_blank" rel="noreferrer" style={{ display: "block", fontSize: 12.5, color: "var(--brand)", padding: "4px 0" }}>
                {d.tipo} →
              </a>
            ))
          )}
        </div>

        <div className="card">
          <div className="card-h"><Icon name="bolt" /><h3>Ações</h3></div>
          <input className="input" type="password" placeholder="PIN do supervisor" value={pin} onChange={(e) => setPin(e.target.value)} style={{ marginBottom: 10 }} />
          <div className="btn-row" style={{ marginBottom: 8 }}>
            <button className="btn btn-go" disabled={busy} onClick={() => acao("aprovado")}><Icon name="checkThin" /> Aprovar</button>
            <button className="btn btn-ghost" disabled={busy} onClick={() => acao("recusado")}>Recusar</button>
          </div>
          <div className="btn-row">
            <button className="btn btn-ghost" disabled={busy} onClick={() => acao("suspenso")}>Suspender</button>
            <button className="btn btn-ghost" disabled={busy} onClick={() => acao("em_verificacao")}>Reverificar</button>
          </div>
          {msg && <div style={{ color: "var(--warn)", fontSize: 12.5, marginTop: 8, fontWeight: 600 }}>{msg}</div>}
        </div>
      </div>
    </>
  );
}
