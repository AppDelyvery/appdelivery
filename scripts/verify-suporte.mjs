// Prova de suporte/disputas. Usa a conta demo do lojista. Requer 0012.
// Uso: K=<publishable> U=<url> node scripts/verify-suporte.mjs
const U = process.env.U;
const K = process.env.K;
const h = (tok) => ({ apikey: K, Authorization: `Bearer ${tok || K}`, "Content-Type": "application/json" });
const rep = (tok) => ({ ...h(tok), Prefer: "return=representation" });
const j = (r) => r.json();

const main = async () => {
  const login = await fetch(`${U}/auth/v1/token?grant_type=password`, { method: "POST", headers: h(), body: JSON.stringify({ email: "demo.negocio@gmail.com", password: "Demo1234" }) }).then(j);
  const tok = login.access_token;
  const uid = login.user?.id;
  if (!tok) return console.log("login falhou:", login.error_description);
  const ped = (await fetch(`${U}/rest/v1/pedidos?select=id,tracking_token&order=created_at.desc&limit=1`, { headers: h(tok) }).then(j))[0];
  console.log("1) pedido do lojista:", ped?.id, "| token:", ped?.tracking_token);

  // cliente final abre disputa pelo token (anon)
  const c = await fetch(`${U}/rest/v1/rpc/abrir_disputa_rastreio`, { method: "POST", headers: h(), body: JSON.stringify({ p_token: ped.tracking_token, p_tipo: "Atraso", p_descricao: "Pedido não chegou no horário" }) }).then(j);
  console.log("2) cliente (anon) abre chamado ->", JSON.stringify(c), c === "ok" ? "✅" : "");

  // lojista abre disputa (autenticado)
  const l = await fetch(`${U}/rest/v1/disputas`, { method: "POST", headers: rep(tok), body: JSON.stringify({ pedido_id: ped.id, aberta_por: uid, papel: "estabelecimento", tipo: "Cobrança", descricao: "Valor errado" }) }).then(j);
  console.log("3) lojista abre chamado ->", Array.isArray(l) ? "ok ✅" : JSON.stringify(l).slice(0, 120));

  // lojista lê os chamados do pedido dele (RLS de parte)
  const lidas = await fetch(`${U}/rest/v1/disputas?pedido_id=eq.${ped.id}&select=papel,tipo,status`, { headers: h(tok) }).then(j);
  console.log("4) lojista lê chamados ->", JSON.stringify(lidas), Array.isArray(lidas) && lidas.length >= 2 ? "✅" : "");

  // admin responde no chat (papel suporte) — controle: lojista NÃO deveria conseguir mandar como suporte
  const fake = await fetch(`${U}/rest/v1/mensagens`, { method: "POST", headers: rep(tok), body: JSON.stringify({ pedido_id: ped.id, autor_papel: "suporte", texto: "sou suporte (falso)" }) }).then(j);
  console.log("5) [FURO] lojista tenta mandar como SUPORTE ->", Array.isArray(fake) ? "❌ conseguiu (furo!)" : "✅ bloqueado (RLS)");
};
main().catch((e) => console.log("ERRO:", e.message));
