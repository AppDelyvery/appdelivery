// Prova do mapa de despacho (0013). A RPC mapa_despacho() é só-admin.
// Controle: conta demo (não-admin) deve ser BLOQUEADA. Admin de verdade
// valida o caminho positivo logando em /admin/despacho.
// Uso: K=<publishable> U=<url> node scripts/verify-despacho.mjs
const U = process.env.U;
const K = process.env.K;
const h = (tok) => ({ apikey: K, Authorization: `Bearer ${tok || K}`, "Content-Type": "application/json" });
const j = (r) => r.json();

const main = async () => {
  const login = await fetch(`${U}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: h(),
    body: JSON.stringify({ email: "demo.negocio@gmail.com", password: "Demo1234" }),
  }).then(j);
  const tok = login.access_token;
  if (!tok) return console.log("login falhou:", login.error_description);

  const r = await fetch(`${U}/rest/v1/rpc/mapa_despacho`, { method: "POST", headers: h(tok), body: "{}" }).then(j);
  const bloqueado = r && r.message && /apenas admin/.test(r.message);
  console.log("1) demo (não-admin) chama mapa_despacho ->", bloqueado ? "✅ bloqueado (apenas admin)" : `❌ vazou: ${JSON.stringify(r).slice(0, 160)}`);
};
main().catch((e) => console.log("ERRO:", e.message));
