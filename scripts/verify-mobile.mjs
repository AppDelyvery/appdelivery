// Prova dos RPCs da reforma mobile (migrations 0015-0018).
// Uso: K=<publishable> U=<url> node scripts/verify-mobile.mjs
const U = process.env.U;
const K = process.env.K;
const h = (tok) => ({ apikey: K, Authorization: `Bearer ${tok || K}`, "Content-Type": "application/json" });
const j = (r) => r.json();

const main = async () => {
  const login = await fetch(`${U}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: h(),
    body: JSON.stringify({ email: "demo.entregador@gmail.com", password: "Demo1234" }),
  }).then(j);
  const tok = login.access_token;
  if (!tok) return console.log("login falhou:", login.error_description);

  // 0016 — ficar online (Palmas) + ler is_online
  const on = await fetch(`${U}/rest/v1/rpc/definir_disponibilidade`, {
    method: "POST", headers: h(tok),
    body: JSON.stringify({ p_online: true, p_lng: -48.3336, p_lat: -10.1844 }),
  }).then(j);
  console.log("1) definir_disponibilidade(online) ->", on === "ok" ? "✅ ok" : JSON.stringify(on).slice(0, 120));

  const row = await fetch(`${U}/rest/v1/entregadores?select=is_online`, { headers: h(tok) }).then(j);
  console.log("2) is_online no banco ->", Array.isArray(row) && row[0]?.is_online === true ? "✅ true" : JSON.stringify(row).slice(0, 80));

  // 0015 — listar_corridas_disponiveis devolve coleta_lat/lng
  const cor = await fetch(`${U}/rest/v1/rpc/listar_corridas_disponiveis`, { method: "POST", headers: h(tok), body: "{}" }).then(j);
  const okShape = Array.isArray(cor) && (cor.length === 0 || ("coleta_lat" in cor[0] && "coleta_lng" in cor[0]));
  console.log("3) listar_corridas_disponiveis (coords) ->", okShape ? `✅ shape ok (${cor.length} corrida(s))` : JSON.stringify(cor).slice(0, 120));

  // volta offline
  const off = await fetch(`${U}/rest/v1/rpc/definir_disponibilidade`, { method: "POST", headers: h(tok), body: JSON.stringify({ p_online: false }) }).then(j);
  console.log("4) definir_disponibilidade(offline) ->", off === "ok" ? "✅ ok" : JSON.stringify(off).slice(0, 80));

  // 0017 — cancelar sem corrida em andamento deve dar erro controlado (não 'ok')
  const cancel = await fetch(`${U}/rest/v1/rpc/cancelar_corrida_entregador`, {
    method: "POST", headers: h(tok),
    body: JSON.stringify({ p_pedido_id: "00000000-0000-0000-0000-000000000000", p_motivo: "teste" }),
  }).then(j);
  console.log("5) cancelar_corrida_entregador (sem corrida) ->", cancel?.message ? "✅ erro controlado (" + cancel.message.slice(0, 30) + ")" : JSON.stringify(cancel).slice(0, 80));
};
main().catch((e) => console.log("ERRO:", e.message));
