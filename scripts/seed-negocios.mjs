// Cria vários NEGÓCIOS demo pra ver a lista no admin. Uso: K=.. U=.. node scripts/seed-negocios.mjs
const U = process.env.U;
const K = process.env.K;
const SENHA = "Demo1234";
const h = (tok) => ({ apikey: K, Authorization: `Bearer ${tok || K}`, "Content-Type": "application/json" });
const j = (r) => r.json();

const NEGOCIOS = [
  { email: "negocio.demo1@gmail.com", nome: "Ótica Visão Center", cnpj: "12.345.678/0001-90", end: "Q. 104 Norte, Av. JK" },
  { email: "negocio.demo2@gmail.com", nome: "Farmácia Saúde Total", cnpj: "23.456.789/0001-01", end: "Q. 204 Sul, Av. LO-5" },
  { email: "negocio.demo3@gmail.com", nome: "Contabilidade Andrade", cnpj: "34.567.890/0001-12", end: "Q. 304 Sul, Av. NS-2" },
  { email: "negocio.demo4@gmail.com", nome: "Distribuidora Tocantins", cnpj: "45.678.901/0001-23", end: "Q. 1004 Sul, Av. Teotônio" },
  { email: "negocio.demo5@gmail.com", nome: "Boutique Bella", cnpj: "56.789.012/0001-34", end: "Q. 108 Norte, Av. JK" },
];

const main = async () => {
  for (const n of NEGOCIOS) {
    const s = await fetch(`${U}/auth/v1/signup`, { method: "POST", headers: h(), body: JSON.stringify({ email: n.email, password: SENHA, data: { role: "estabelecimento", nome: n.nome } }) }).then(j);
    if (!s.access_token) { console.log(`- ${n.nome}: já existe/erro (${s.msg || s.error_code})`); continue; }
    await fetch(`${U}/rest/v1/profiles`, { method: "POST", headers: h(s.access_token), body: JSON.stringify({ id: s.user.id, role: "estabelecimento", nome: n.nome }) });
    await fetch(`${U}/rest/v1/estabelecimentos`, { method: "POST", headers: h(s.access_token), body: JSON.stringify({ profile_id: s.user.id, razao_social: n.nome, cnpj: n.cnpj, endereco: n.end }) });
    console.log(`✓ ${n.nome}  (${n.email} / ${SENHA})`);
  }
  console.log("\nLista visível no /admin após o redeploy.");
};
main().catch((e) => console.log("ERRO:", e.message));
