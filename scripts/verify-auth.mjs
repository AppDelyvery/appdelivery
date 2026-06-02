// Verificação end-to-end do cadastro (prova-na-fonte), sem service_role.
// Uso: K=<publishable> U=<url> node scripts/verify-auth.mjs
const U = process.env.U;
const K = process.env.K;
const email = `loja.teste.${Date.now()}@gmail.com`;
const h = (tok) => ({ apikey: K, Authorization: `Bearer ${tok || K}`, "Content-Type": "application/json" });

const j = (r) => r.json();
const main = async () => {
  const s = await fetch(`${U}/auth/v1/signup`, {
    method: "POST",
    headers: h(),
    body: JSON.stringify({ email, password: "Teste1234", data: { role: "estabelecimento", nome: "Otica Teste" } }),
  }).then(j);
  const tok = s.access_token;
  const uid = s.user?.id;
  console.log("signup -> access_token?", !!tok, "| uid:", uid || "-", "| msg:", s.msg || s.error_code || "ok");
  if (!tok) {
    console.log(">> SEM SESSAO: confirmacao de e-mail ainda LIGADA (ou rate limit). Desligue 'Confirm email'.");
    return;
  }
  const prof = await fetch(`${U}/rest/v1/profiles`, {
    method: "POST",
    headers: { ...h(tok), Prefer: "return=representation" },
    body: JSON.stringify({ id: uid, role: "estabelecimento", nome: "Otica Teste" }),
  }).then(j);
  console.log("insert profiles ->", JSON.stringify(prof).slice(0, 160));
  const est = await fetch(`${U}/rest/v1/estabelecimentos`, {
    method: "POST",
    headers: { ...h(tok), Prefer: "return=representation" },
    body: JSON.stringify({ profile_id: uid, razao_social: "Otica Teste", endereco: "Q.104 Norte" }),
  }).then(j);
  console.log("insert estabelecimentos ->", JSON.stringify(est).slice(0, 160));
  const back = await fetch(`${U}/rest/v1/estabelecimentos?profile_id=eq.${uid}&select=id,razao_social,endereco`, {
    headers: h(tok),
  }).then(j);
  console.log("READ-AFTER-WRITE ->", JSON.stringify(back));
};
main().catch((e) => console.log("ERRO:", e.message));
