// Prova do caminho de aprovação (admin aprova entregador). Prova-na-fonte.
// NOTA: forja um admin via o furo self-promote (aberto até a 0004). Pós-0004, admin é seed por SQL.
// Uso: K=<publishable> U=<url> node scripts/verify-admin-approve.mjs
const U = process.env.U;
const K = process.env.K;
const h = (tok) => ({ apikey: K, Authorization: `Bearer ${tok || K}`, "Content-Type": "application/json" });
const rep = (tok) => ({ ...h(tok), Prefer: "return=representation" });
const j = (r) => r.json();
const novo = async (role, nome, suf) => {
  const s = await fetch(`${U}/auth/v1/signup`, { method: "POST", headers: h(), body: JSON.stringify({ email: `aa.${suf}.${Date.now()}@gmail.com`, password: "Teste1234", data: { role, nome } }) }).then(j);
  return { tok: s.access_token, uid: s.user?.id };
};

const main = async () => {
  // 1) entregador em verificação
  const E = await novo("entregador", "Diego Pendente", "ent");
  await fetch(`${U}/rest/v1/profiles`, { method: "POST", headers: h(E.tok), body: JSON.stringify({ id: E.uid, role: "entregador", nome: "Diego Pendente" }) });
  const ent = (await fetch(`${U}/rest/v1/entregadores`, { method: "POST", headers: rep(E.tok), body: JSON.stringify({ profile_id: E.uid, nome: "Diego Pendente", cpf: "111", vehicle_type: "moto" }) }).then(j))[0];
  await fetch(`${U}/rest/v1/entregadores?id=eq.${ent.id}`, { method: "PATCH", headers: h(E.tok), body: JSON.stringify({ status: "em_verificacao" }) });
  const st1 = (await fetch(`${U}/rest/v1/entregadores?id=eq.${ent.id}&select=status`, { headers: h(E.tok) }).then(j))[0]?.status;
  console.log("1) entregador pediu verificacao -> status:", st1, st1 === "em_verificacao" ? "✅" : "❌ (esperava em_verificacao)");

  // 2) forja admin (via furo self-promote, ainda aberto)
  const Adm = await novo("estabelecimento", "Admin Forjado", "adm");
  await fetch(`${U}/rest/v1/profiles`, { method: "POST", headers: h(Adm.tok), body: JSON.stringify({ id: Adm.uid, role: "estabelecimento", nome: "Admin Forjado" }) });
  await fetch(`${U}/rest/v1/profiles?id=eq.${Adm.uid}`, { method: "PATCH", headers: h(Adm.tok), body: JSON.stringify({ role: "admin" }) });
  const admRole = (await fetch(`${U}/rest/v1/profiles?id=eq.${Adm.uid}&select=role`, { headers: h(Adm.tok) }).then(j))[0]?.role;
  console.log("2) admin forjado -> role:", admRole, admRole === "admin" ? "(furo ainda aberto — fechar com 0004)" : "(furo ja fechado!)");

  // 3) admin aprova o entregador
  await fetch(`${U}/rest/v1/entregadores?id=eq.${ent.id}`, { method: "PATCH", headers: h(Adm.tok), body: JSON.stringify({ status: "aprovado" }) });
  const st2 = (await fetch(`${U}/rest/v1/entregadores?id=eq.${ent.id}&select=status`, { headers: h(Adm.tok) }).then(j))[0]?.status;
  console.log("3) ADMIN APROVOU -> status:", st2, st2 === "aprovado" ? "✅ admin consegue aprovar" : "❌");
};
main().catch((e) => console.log("ERRO:", e.message));
