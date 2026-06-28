"use client";

import { useCallback, useEffect, useState } from "react";
import AdminShell from "./AdminShell";
import { Icon, type IconName } from "../Icons";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { enviarComunicado } from "@/actions/comunicados";

type Com = { id: string; titulo: string; corpo: string; alvo: string; created_at: string };

const ALVOS: { k: string; txt: string; ic: IconName; cor: string }[] = [
  { k: "todos", txt: "Todos", ic: "send", cor: "var(--brand)" },
  { k: "entregadores", txt: "Entregadores", ic: "moto", cor: "#f59e0b" },
  { k: "negocios", txt: "Negócios", ic: "building", cor: "var(--go)" },
];
const alvoMeta = (k: string) => ALVOS.find((a) => a.k === k) ?? ALVOS[0];
const dt = (s: string) => new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export default function ComunicadosAdmin() {
  const [coms, setComs] = useState<Com[]>([]);
  const [titulo, setTitulo] = useState("");
  const [corpo, setCorpo] = useState("");
  const [alvo, setAlvo] = useState("todos");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const sb = getBrowserSupabase();
    if (!sb) return;
    const { data } = await sb.from("comunicados").select("id,titulo,corpo,alvo,created_at").order("created_at", { ascending: false });
    if (data) setComs(data as Com[]);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregar();
  }, [carregar]);

  const enviar = async () => {
    setMsg(null);
    setBusy(true);
    const r = await enviarComunicado(titulo, corpo, alvo);
    setBusy(false);
    if (r.ok) {
      setTitulo("");
      setCorpo("");
      setAlvo("todos");
      setMsg("Comunicado enviado.");
      await carregar();
    } else {
      setMsg(r.motivo === "apenas admin" ? "Só admin pode enviar." : r.motivo);
    }
  };

  const podeEnviar = titulo.trim() && corpo.trim() && !busy;

  return (
    <AdminShell title="Comunicados">
      <div className="card">
        <div className="card-h"><Icon name="send" /><h3>Novo comunicado</h3></div>
        <input className="input" placeholder="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} style={{ marginBottom: 10 }} />
        <textarea className="input" placeholder="Mensagem…" value={corpo} onChange={(e) => setCorpo(e.target.value)} rows={3} style={{ marginBottom: 10, resize: "vertical" }} />
        <div style={{ display: "inline-flex", background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 12, padding: 3, gap: 2, marginBottom: 10, flexWrap: "wrap" }}>
          {ALVOS.map((a) => {
            const on = alvo === a.k;
            return (
              <button key={a.k} onClick={() => setAlvo(a.k)}
                style={{ border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, padding: "7px 15px", borderRadius: 9, background: on ? "#fff" : "transparent", color: on ? "var(--brand)" : "var(--muted)", boxShadow: on ? "var(--shadow-sm)" : "none", transition: ".15s" }}>
                {a.txt}
              </button>
            );
          })}
        </div>
        <button className="btn btn-primary" style={{ width: "auto", padding: "9px 18px" }} disabled={!podeEnviar} onClick={enviar}>
          <Icon name="send" /> {busy ? "Enviando…" : "Enviar"}
        </button>
        {msg && <div style={{ fontSize: 12.5, marginTop: 10, fontWeight: 600, color: msg.includes("enviado") ? "var(--ok, #059669)" : "var(--warn)" }}>{msg}</div>}
        <p className="hint">Mural in-app. Push por SMS/notificação entra quando Zenvia/FCM ligarem (CNPJ do dono).</p>
      </div>

      <div className="card">
        <div className="card-h"><Icon name="list" /><h3>Enviados</h3><span className="right">{coms.length}</span></div>
        {coms.length === 0 ? (
          <div style={{ fontSize: 12.5, color: "var(--faint)" }}>Nenhum comunicado enviado ainda.</div>
        ) : (
          coms.map((c) => {
            const m = alvoMeta(c.alvo);
            return (
              <div key={c.id} style={{ display: "flex", gap: 11, padding: "11px 0", borderBottom: "1px solid var(--line)" }}>
                <span style={{ width: 36, height: 36, borderRadius: 10, background: "var(--brand-light)", display: "grid", placeItems: "center", flexShrink: 0 }}><Icon name={m.ic} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <span className="td-name" style={{ fontSize: 13.5 }}>{c.titulo}</span>
                    <span style={{ flexShrink: 0, fontSize: 10.5, fontWeight: 800, color: m.cor, background: `color-mix(in srgb, ${m.cor} 13%, transparent)`, padding: "3px 9px", borderRadius: 20 }}>{m.txt}</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--ink-2)", margin: "4px 0" }}>{c.corpo}</div>
                  <div style={{ fontSize: 11, color: "var(--faint)" }}>{dt(c.created_at)}</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </AdminShell>
  );
}
