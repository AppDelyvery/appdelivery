// AUDITORIA RLS adversarial (prova-na-fonte): cria vítima + atacante e testa o que o atacante
// NÃO deveria conseguir (ler dados alheios, se auto-promover a admin, adulterar status).
// Uso: K=<publishable> U=<url> node scripts/audit-rls.mjs
const U = process.env.U;
const K = process.env.K;
const h = (tok) => ({ apikey: K, Authorization: `Bearer ${tok || K}`, "Content-Type": "application/json" });
const rep = (tok) => ({ ...h(tok), Prefer: "return=representation" });
const j = (r) => r.json();
const novo = async (role, nome) => {
  const s = await fetch(`${U}/auth/v1/signup`, { method: "POST", headers: h(), body: JSON.stringify({ email: `audit.${role}.${Date.now()}.${Math.floor(performance.now())}@gmail.com`, password: "Teste1234", data: { role, nome } }) }).then(j);
  return { tok: s.access_token, uid: s.user?.id };
};
const FINDINGS = [];
const flag = (id, hole, detalhe) => { FINDINGS.push({ id, hole, detalhe }); console.log(`${hole ? "❌ FURO" : "✅ ok  "} | ${id} | ${detalhe}`); };

const main = async () => {
  // VÍTIMA: lojista com estabelecimento + pedido
  const V = await novo("estabelecimento", "Vitima Loja");
  await fetch(`${U}/rest/v1/profiles`, { method: "POST", headers: h(V.tok), body: JSON.stringify({ id: V.uid, role: "estabelecimento", nome: "Vitima Loja" }) });
  const vEst = (await fetch(`${U}/rest/v1/estabelecimentos`, { method: "POST", headers: rep(V.tok), body: JSON.stringify({ profile_id: V.uid, razao_social: "Vitima Loja" }) }).then(j))[0];
  const vPed = (await fetch(`${U}/rest/v1/pedidos`, { method: "POST", headers: rep(V.tok), body: JSON.stringify({ estabelecimento_id: vEst.id, coleta_endereco: "x", coleta_lat: -10.17, coleta_lng: -48.34, entrega_endereco: "y", entrega_lat: -10.2, entrega_lng: -48.32, vehicle_type: "moto", status: "buscando" }) }).then(j))[0];

  // ATACANTE: outro lojista
  const A = await novo("estabelecimento", "Atacante");
  await fetch(`${U}/rest/v1/profiles`, { method: "POST", headers: h(A.tok), body: JSON.stringify({ id: A.uid, role: "estabelecimento", nome: "Atacante" }) });

  // 1) atacante lê estabelecimento da vítima?
  const r1 = await fetch(`${U}/rest/v1/estabelecimentos?id=eq.${vEst.id}&select=id,razao_social`, { headers: h(A.tok) }).then(j);
  flag("cross-read-estab", Array.isArray(r1) && r1.length > 0, `retornou ${JSON.stringify(r1).slice(0, 80)}`);

  // 2) atacante lê pedido da vítima?
  const r2 = await fetch(`${U}/rest/v1/pedidos?id=eq.${vPed.id}&select=id,status`, { headers: h(A.tok) }).then(j);
  flag("cross-read-pedido", Array.isArray(r2) && r2.length > 0, `retornou ${JSON.stringify(r2).slice(0, 80)}`);

  // 3) atacante adultera pedido da vítima (status entregue)?
  await fetch(`${U}/rest/v1/pedidos?id=eq.${vPed.id}`, { method: "PATCH", headers: rep(A.tok), body: JSON.stringify({ status: "entregue" }) });
  const r3 = await fetch(`${U}/rest/v1/pedidos?id=eq.${vPed.id}&select=status`, { headers: h(V.tok) }).then(j);
  flag("cross-tamper-pedido", r3[0]?.status === "entregue", `status apos ataque: ${r3[0]?.status}`);

  // 4) atacante lê verificacoes (LGPD, deveria ser admin-only)?
  const r4 = await fetch(`${U}/rest/v1/verificacoes?select=id,payload&limit=1`, { headers: h(A.tok) }).then(j);
  flag("read-verificacoes-lgpd", Array.isArray(r4) && r4.length > 0, `retornou ${JSON.stringify(r4).slice(0, 80)}`);

  // 5) ESCALONAMENTO: atacante se auto-promove a admin?
  await fetch(`${U}/rest/v1/profiles?id=eq.${A.uid}`, { method: "PATCH", headers: rep(A.tok), body: JSON.stringify({ role: "admin" }) });
  const meRole = (await fetch(`${U}/rest/v1/profiles?id=eq.${A.uid}&select=role`, { headers: h(A.tok) }).then(j))[0]?.role;
  // se virou admin, agora consegue ler tudo:
  const r5 = await fetch(`${U}/rest/v1/estabelecimentos?id=eq.${vEst.id}&select=razao_social`, { headers: h(A.tok) }).then(j);
  flag("self-promote-admin", meRole === "admin" && Array.isArray(r5) && r5.length > 0, `role apos ataque: ${meRole}; leu loja alheia: ${JSON.stringify(r5).slice(0, 60)}`);

  // 6) lojista dono adultera o PRÓPRIO pedido pra 'entregue' sem evidência (dodge)?
  await fetch(`${U}/rest/v1/pedidos?id=eq.${vPed.id}`, { method: "PATCH", headers: rep(V.tok), body: JSON.stringify({ status: "entregue" }) });
  const r6 = await fetch(`${U}/rest/v1/pedidos?id=eq.${vPed.id}&select=status`, { headers: h(V.tok) }).then(j);
  flag("owner-status-tamper", r6[0]?.status === "entregue", `dono setou proprio pedido para: ${r6[0]?.status} (deveria exigir evidencia)`);

  console.log("\n=== RESUMO ===");
  const furos = FINDINGS.filter((f) => f.hole);
  console.log(`${furos.length} furo(s): ${furos.map((f) => f.id).join(", ") || "nenhum"}`);
};
main().catch((e) => console.log("ERRO:", e.message));
