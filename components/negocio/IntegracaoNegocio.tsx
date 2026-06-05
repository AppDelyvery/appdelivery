"use client";

import { useCallback, useEffect, useState } from "react";
import NegocioShell from "./NegocioShell";
import { Icon } from "../Icons";
import { getBrowserSupabase } from "@/lib/supabase/browser";

type Chave = { id: string; prefixo: string; nome: string | null; ativa: boolean; created_at: string; last_used_at: string | null };
const dt = (s: string | null) => (s ? new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "nunca");

export default function IntegracaoNegocio() {
  const [chaves, setChaves] = useState<Chave[]>([]);
  const [nova, setNova] = useState<string | null>(null); // chave em texto puro (mostra 1 vez)
  const [nome, setNome] = useState("");
  const [busy, setBusy] = useState(false);
  const [origin, setOrigin] = useState("");
  const [webhook, setWebhook] = useState("");
  const [webhookSecret, setWebhookSecret] = useState<string | null>(null);
  const [salvandoWh, setSalvandoWh] = useState(false);

  useEffect(() => { setOrigin(window.location.origin); }, []);

  const carregar = useCallback(async () => {
    const sb = getBrowserSupabase();
    if (!sb) return;
    const { data } = await sb.from("chaves_api").select("id,prefixo,nome,ativa,created_at,last_used_at").order("created_at", { ascending: false });
    if (data) setChaves(data as Chave[]);
    const { data: est } = await sb.from("estabelecimentos").select("webhook_url").limit(1).maybeSingle();
    if (est) setWebhook((est as { webhook_url?: string | null }).webhook_url ?? "");
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const salvarWebhook = async () => {
    const sb = getBrowserSupabase();
    if (!sb) return;
    setSalvandoWh(true);
    const { data } = await sb.rpc("salvar_webhook", { p_url: webhook });
    setSalvandoWh(false);
    if (data) setWebhookSecret(data as string); // só vem na 1ª vez
  };

  const gerar = async () => {
    const sb = getBrowserSupabase();
    if (!sb) return;
    setBusy(true);
    const { data, error } = await sb.rpc("criar_chave_api", { p_nome: nome.trim() || null });
    setBusy(false);
    if (!error && data) { setNova(data as string); setNome(""); await carregar(); }
  };

  const revogar = async (id: string) => {
    const sb = getBrowserSupabase();
    if (!sb) return;
    await sb.from("chaves_api").update({ ativa: false }).eq("id", id);
    await carregar();
  };

  const curl = `curl -X POST ${origin}/api/v1/pedidos \\
  -H "Authorization: Bearer SUA_CHAVE" \\
  -H "Content-Type: application/json" \\
  -d '{
    "coleta_endereco": "Drogasil Q.104 Norte",
    "coleta_lat": -10.1844, "coleta_lng": -48.3336,
    "entrega_endereco": "Cliente Q.604 Sul",
    "entrega_lat": -10.19, "entrega_lng": -48.33,
    "vehicle_type": "moto",
    "descricao": "Medicamentos",
    "cliente_final_nome": "Maria", "cliente_final_telefone": "63 99999-0000"
  }'`;

  return (
    <NegocioShell title="Integração / API">
      <div className="card" style={{ background: "linear-gradient(135deg,var(--brand),#3730a3)", color: "#fff", border: "none" }}>
        <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 6 }}>Entregas no automático</div>
        <div style={{ fontSize: 13, opacity: 0.9, lineHeight: 1.55 }}>
          Conecte seu sistema (app, loja virtual, ERP) à nossa API. Cada pedido seu cai aqui e
          <b> aciona um entregador verificado na hora</b> — sem ninguém digitar. É o mesmo modelo que as grandes redes usam.
        </div>
      </div>

      {nova && (
        <div className="card" style={{ borderColor: "var(--go)", background: "var(--go-bg)" }}>
          <div className="card-h"><Icon name="checkThin" /><h3>Sua nova chave (copie agora)</h3></div>
          <div style={{ fontSize: 12.5, color: "var(--go-dark)", marginBottom: 8 }}>Por segurança, ela só aparece <b>uma vez</b>. Guarde num lugar seguro.</div>
          <code style={{ display: "block", background: "#fff", border: "1px solid #aee4c8", borderRadius: 9, padding: "11px 12px", fontSize: 12.5, wordBreak: "break-all" }}>{nova}</code>
          <button className="btn btn-ghost" style={{ marginTop: 10 }} onClick={() => { navigator.clipboard?.writeText(nova); }}>Copiar</button>
          <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={() => setNova(null)}>Já guardei, fechar</button>
        </div>
      )}

      <div className="card">
        <div className="card-h"><Icon name="bolt" /><h3>Chaves de API</h3><span className="right">{chaves.filter((c) => c.ativa).length} ativa(s)</span></div>
        <div className="field">
          <label>Apelido da chave (opcional)</label>
          <input className="input" placeholder="Ex.: Integração loja virtual" value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <button className="btn btn-primary" disabled={busy} onClick={gerar}><Icon name="bolt" /> {busy ? "Gerando…" : "Gerar nova chave"}</button>

        <div style={{ marginTop: 14 }}>
          {chaves.length === 0 ? (
            <div style={{ fontSize: 12.5, color: "var(--faint)" }}>Nenhuma chave ainda. Gere a primeira pra conectar seu sistema.</div>
          ) : (
            chaves.map((c) => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{c.nome || "Chave"} <code style={{ fontSize: 11.5, color: "var(--muted)" }}>{c.prefixo}</code></div>
                  <div style={{ fontSize: 11, color: "var(--faint)" }}>criada {dt(c.created_at)} · usada {dt(c.last_used_at)}</div>
                </div>
                {c.ativa ? (
                  <button className="btn btn-ghost" style={{ width: "auto", padding: "6px 12px", fontSize: 12 }} onClick={() => revogar(c.id)}>Revogar</button>
                ) : (
                  <span className="status-pill s-pend">Revogada</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-h"><Icon name="list" /><h3>Como usar</h3></div>
        <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6, marginBottom: 10 }}>
          Faça um <b>POST</b> pra <code>{origin}/api/v1/pedidos</code> com a chave no header. A resposta traz o <b>link de rastreio</b> e o preço.
        </div>
        <pre style={{ background: "var(--ink)", color: "#e8ecf5", borderRadius: 11, padding: 14, fontSize: 11.5, overflowX: "auto", lineHeight: 1.5 }}>{curl}</pre>
        <p className="hint" style={{ textAlign: "left" }}>
          <b>Cotação</b> (preço antes de criar): <code>POST /api/v1/cotacao</code> com {"{ coleta_lat, coleta_lng, entrega_lat, entrega_lng }"} → devolve o preço das 3 categorias.<br />
          <b>Status</b>: <code>GET /api/v1/pedidos/{"{id}"}</code> com a mesma chave.
        </p>
      </div>

      <div className="card">
        <div className="card-h"><Icon name="send" /><h3>Webhook de status</h3></div>
        <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6, marginBottom: 10 }}>
          A gente avisa seu sistema <b>na hora</b> que o pedido muda (aceito, coletado, saiu pra entrega, entregue) — você não precisa ficar perguntando. Informe a URL que recebe os avisos:
        </div>
        <div className="field">
          <label>URL do seu webhook</label>
          <input className="input" placeholder="https://seusistema.com/webhooks/appdelyvery" value={webhook} onChange={(e) => setWebhook(e.target.value)} />
        </div>
        <button className="btn btn-primary" disabled={salvandoWh} onClick={salvarWebhook}>{salvandoWh ? "Salvando…" : "Salvar webhook"}</button>
        {webhookSecret && (
          <div style={{ marginTop: 12, background: "var(--go-bg)", border: "1px solid #aee4c8", borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--go-dark)", marginBottom: 6 }}>Secret de assinatura (guarde — aparece 1 vez):</div>
            <code style={{ display: "block", background: "#fff", borderRadius: 8, padding: "9px 10px", fontSize: 12, wordBreak: "break-all" }}>{webhookSecret}</code>
            <div style={{ fontSize: 11.5, color: "var(--go-dark)", marginTop: 6 }}>Cada aviso vem com o header <code>X-Appdly-Signature</code> = HMAC-SHA256 de <code>pedido_id:status:occurred_at</code> com esse secret. Confira pra garantir que o aviso é nosso.</div>
          </div>
        )}
        <p className="hint">Enviamos um POST com {"{ event, pedido_id, status, tracking_token, occurred_at }"} a cada mudança.</p>
      </div>
    </NegocioShell>
  );
}
