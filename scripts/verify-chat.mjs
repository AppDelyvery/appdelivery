// Prova do chat por pedido (prova-na-fonte). Requer 0006 aplicada.
// Uso: K=<publishable> U=<url> node scripts/verify-chat.mjs
const U = process.env.U;
const K = process.env.K;
const h = (tok) => ({ apikey: K, Authorization: `Bearer ${tok || K}`, "Content-Type": "application/json" });
const rep = (tok) => ({ ...h(tok), Prefer: "return=representation" });
const j = (r) => r.json();

const main = async () => {
  // lojista + pedido
  const s = await fetch(`${U}/auth/v1/signup`, { method: "POST", headers: h(), body: JSON.stringify({ email: `chat.${Date.now()}@gmail.com`, password: "Teste1234", data: { role: "estabelecimento", nome: "Loja Chat" } }) }).then(j);
  const tok = s.access_token, uid = s.user?.id;
  if (!tok) return console.log(">> signup falhou:", s.msg || s.error_code);
  await fetch(`${U}/rest/v1/profiles`, { method: "POST", headers: h(tok), body: JSON.stringify({ id: uid, role: "estabelecimento", nome: "Loja Chat" }) });
  const est = (await fetch(`${U}/rest/v1/estabelecimentos`, { method: "POST", headers: rep(tok), body: JSON.stringify({ profile_id: uid, razao_social: "Loja Chat" }) }).then(j))[0];
  const ped = (await fetch(`${U}/rest/v1/pedidos`, { method: "POST", headers: rep(tok), body: JSON.stringify({ estabelecimento_id: est.id, coleta_endereco: "x", coleta_lat: -10.17, coleta_lng: -48.34, entrega_endereco: "y", entrega_lat: -10.2, entrega_lng: -48.32, vehicle_type: "moto", status: "buscando" }) }).then(j))[0];
  const token = ped.tracking_token;
  console.log("1) pedido:", ped.id, "| token:", token);

  // lojista manda mensagem (RLS de parte)
  const m1 = await fetch(`${U}/rest/v1/mensagens`, { method: "POST", headers: rep(tok), body: JSON.stringify({ pedido_id: ped.id, autor_papel: "estabelecimento", texto: "Oi, pode coletar 14h?" }) }).then(j);
  console.log("2) lojista enviou ->", Array.isArray(m1) ? "ok" : JSON.stringify(m1).slice(0, 120));

  // cliente final manda pelo TOKEN (anon, sem login)
  const c1 = await fetch(`${U}/rest/v1/rpc/enviar_mensagem_rastreio`, { method: "POST", headers: h(), body: JSON.stringify({ p_token: token, p_texto: "Pode sim, tô esperando!" }) });
  console.log("3) cliente final (anon) enviou pelo token -> HTTP", c1.status);

  // cliente lê pelo token
  const pub = await fetch(`${U}/rest/v1/rpc/ler_mensagens_rastreio`, { method: "POST", headers: h(), body: JSON.stringify({ p_token: token }) }).then(j);
  console.log("4) cliente lê (anon) ->", JSON.stringify(pub));

  // lojista lê a thread
  const loj = await fetch(`${U}/rest/v1/mensagens?pedido_id=eq.${ped.id}&select=autor_papel,texto&order=created_at`, { headers: h(tok) }).then(j);
  console.log("5) lojista lê a thread ->", JSON.stringify(loj));
  const ok = Array.isArray(loj) && loj.length === 2;
  console.log(ok ? "✅ CHAT 3-PONTAS FUNCIONA (loja + cliente final na mesma thread)" : "❌ verificar");
};
main().catch((e) => console.log("ERRO:", e.message));
