// Prova de comunicados/broadcast (0014). enviar_comunicado é só-admin.
// Controles: conta demo (não-admin) não envia pela RPC nem insere direto.
// Uso: K=<publishable> U=<url> node scripts/verify-comunicados.mjs
const U = process.env.U;
const K = process.env.K;
const h = (tok) => ({ apikey: K, Authorization: `Bearer ${tok || K}`, "Content-Type": "application/json" });
const rep = (tok) => ({ ...h(tok), Prefer: "return=representation" });
const j = (r) => r.json();

const main = async () => {
  const login = await fetch(`${U}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: h(),
    body: JSON.stringify({ email: "demo.negocio@gmail.com", password: "Demo1234" }),
  }).then(j);
  const tok = login.access_token;
  if (!tok) return console.log("login falhou:", login.error_description);

  const rpc = await fetch(`${U}/rest/v1/rpc/enviar_comunicado`, {
    method: "POST", headers: h(tok),
    body: JSON.stringify({ p_titulo: "x", p_corpo: "y", p_alvo: "todos" }),
  }).then(j);
  console.log("1) demo (não-admin) chama enviar_comunicado ->", rpc?.message && /apenas admin/.test(rpc.message) ? "✅ bloqueado" : `❌ ${JSON.stringify(rpc).slice(0, 140)}`);

  const ins = await fetch(`${U}/rest/v1/comunicados`, {
    method: "POST", headers: rep(tok),
    body: JSON.stringify({ titulo: "furo", corpo: "tentei direto", alvo: "todos" }),
  }).then(j);
  console.log("2) demo tenta INSERT direto ->", Array.isArray(ins) ? "❌ conseguiu (furo!)" : "✅ bloqueado (RLS)");

  const leitura = await fetch(`${U}/rest/v1/comunicados?select=titulo,alvo&limit=5`, { headers: h(tok) }).then(j);
  console.log("3) demo (estabelecimento) lê comunicados ->", Array.isArray(leitura) ? `ok, ${leitura.length} visível(eis) ✅` : JSON.stringify(leitura).slice(0, 120));
};
main().catch((e) => console.log("ERRO:", e.message));
