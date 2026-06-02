// Prova do cadastro de entregador (prova-na-fonte).
// Uso: K=<publishable> U=<url> node scripts/verify-entregador.mjs
const U = process.env.U;
const K = process.env.K;
const email = `entregador.${Date.now()}@gmail.com`;
const h = (tok) => ({ apikey: K, Authorization: `Bearer ${tok || K}`, "Content-Type": "application/json" });
const rep = (tok) => ({ ...h(tok), Prefer: "return=representation" });
const j = (r) => r.json();

const main = async () => {
  const s = await fetch(`${U}/auth/v1/signup`, {
    method: "POST",
    headers: h(),
    body: JSON.stringify({ email, password: "Teste1234", data: { role: "entregador", nome: "Diego Teste" } }),
  }).then(j);
  const tok = s.access_token;
  const uid = s.user?.id;
  if (!tok) return console.log(">> signup falhou:", s.msg || s.error_code);
  console.log("1) conta entregador:", uid);

  await fetch(`${U}/rest/v1/profiles`, { method: "POST", headers: h(tok), body: JSON.stringify({ id: uid, role: "entregador", nome: "Diego Teste" }) });
  const ent = await fetch(`${U}/rest/v1/entregadores`, {
    method: "POST",
    headers: rep(tok),
    body: JSON.stringify({ profile_id: uid, nome: "Diego Teste", cpf: "047.000.000-12", vehicle_type: "moto" }),
  }).then(j);
  console.log("2) entregador gravado ->", JSON.stringify(ent).slice(0, 180));

  const back = await fetch(`${U}/rest/v1/entregadores?profile_id=eq.${uid}&select=id,nome,vehicle_type,status,rating`, { headers: h(tok) }).then(j);
  console.log("3) READ-AFTER-WRITE ->", JSON.stringify(back));

  // controle: tenta se AUTO-APROVAR (deve ser possivel hoje com RLS de dono — vamos ver o furo)
  const hack = await fetch(`${U}/rest/v1/entregadores?profile_id=eq.${uid}`, {
    method: "PATCH",
    headers: rep(tok),
    body: JSON.stringify({ status: "aprovado" }),
  }).then(j);
  console.log("4) [TESTE DE FURO] entregador tentou se auto-aprovar ->", JSON.stringify(hack).slice(0, 160));
};
main().catch((e) => console.log("ERRO:", e.message));
