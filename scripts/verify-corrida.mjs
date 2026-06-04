// Prova da atribuição de corrida (prova-na-fonte). Requer 0007 aplicada.
// Forja admin via o furo self-promote (aberto até 0004) p/ aprovar entregadores no teste.
// Uso: K=<publishable> U=<url> node scripts/verify-corrida.mjs
const U = process.env.U;
const K = process.env.K;
const h = (tok) => ({ apikey: K, Authorization: `Bearer ${tok || K}`, "Content-Type": "application/json" });
const rep = (tok) => ({ ...h(tok), Prefer: "return=representation" });
const j = (r) => r.json();
const novo = async (role, nome, suf) => {
  const s = await fetch(`${U}/auth/v1/signup`, { method: "POST", headers: h(), body: JSON.stringify({ email: `corr.${suf}.${Date.now()}@gmail.com`, password: "Teste1234", data: { role, nome } }) }).then(j);
  return { tok: s.access_token, uid: s.user?.id };
};
const aprovarEntregador = async (admTok, entId) => fetch(`${U}/rest/v1/entregadores?id=eq.${entId}`, { method: "PATCH", headers: h(admTok), body: JSON.stringify({ status: "aprovado" }) });
const criarEntregadorAprovado = async (adm, suf) => {
  const E = await novo("entregador", "Entregador " + suf, suf);
  await fetch(`${U}/rest/v1/profiles`, { method: "POST", headers: h(E.tok), body: JSON.stringify({ id: E.uid, role: "entregador", nome: "Entregador " + suf }) });
  const ent = (await fetch(`${U}/rest/v1/entregadores`, { method: "POST", headers: rep(E.tok), body: JSON.stringify({ profile_id: E.uid, nome: "Entregador " + suf, cpf: "1", vehicle_type: "moto" }) }).then(j))[0];
  await aprovarEntregador(adm.tok, ent.id);
  return E;
};

const main = async () => {
  // admin forjado
  const adm = await novo("estabelecimento", "Adm", "adm");
  await fetch(`${U}/rest/v1/profiles`, { method: "POST", headers: h(adm.tok), body: JSON.stringify({ id: adm.uid, role: "estabelecimento", nome: "Adm" }) });
  await fetch(`${U}/rest/v1/profiles?id=eq.${adm.uid}`, { method: "PATCH", headers: h(adm.tok), body: JSON.stringify({ role: "admin" }) });

  // lojista + pedido buscando
  const L = await novo("estabelecimento", "Loja", "loja");
  await fetch(`${U}/rest/v1/profiles`, { method: "POST", headers: h(L.tok), body: JSON.stringify({ id: L.uid, role: "estabelecimento", nome: "Loja" }) });
  const est = (await fetch(`${U}/rest/v1/estabelecimentos`, { method: "POST", headers: rep(L.tok), body: JSON.stringify({ profile_id: L.uid, razao_social: "Loja" }) }).then(j))[0];
  const ped = (await fetch(`${U}/rest/v1/pedidos`, { method: "POST", headers: rep(L.tok), body: JSON.stringify({ estabelecimento_id: est.id, coleta_endereco: "Q104N", coleta_lat: -10.17, coleta_lng: -48.34, entrega_endereco: "Q304S", entrega_lat: -10.2, entrega_lng: -48.32, vehicle_type: "moto", status: "buscando", preco_entregador: 14.01, distancia_km: 6.3 }) }).then(j))[0];
  console.log("1) pedido buscando:", ped.id);

  // 2 entregadores aprovados
  const E1 = await criarEntregadorAprovado(adm, "A");
  const E2 = await criarEntregadorAprovado(adm, "B");

  // E1 lista disponíveis
  const lista = await fetch(`${U}/rest/v1/rpc/listar_corridas_disponiveis`, { method: "POST", headers: h(E1.tok), body: "{}" }).then(j);
  console.log("2) E1 vê disponíveis:", Array.isArray(lista) ? lista.length : JSON.stringify(lista).slice(0, 100), "| tem o pedido?", Array.isArray(lista) && lista.some((c) => c.id === ped.id) ? "✅" : "❌");

  // E1 aceita
  const r1 = await fetch(`${U}/rest/v1/rpc/aceitar_corrida`, { method: "POST", headers: h(E1.tok), body: JSON.stringify({ p_pedido_id: ped.id }) }).then(j);
  console.log("3) E1 aceita ->", JSON.stringify(r1), r1 === "ok" ? "✅" : "");

  // E2 tenta aceitar a mesma (race)
  const r2 = await fetch(`${U}/rest/v1/rpc/aceitar_corrida`, { method: "POST", headers: h(E2.tok), body: JSON.stringify({ p_pedido_id: ped.id }) }).then(j);
  console.log("4) E2 tenta a mesma ->", JSON.stringify(r2), r2 === "indisponivel" ? "✅ atômico (não pegou)" : "❌ FURO de corrida dupla");

  // estado final do pedido (lojista lê)
  const fim = (await fetch(`${U}/rest/v1/pedidos?id=eq.${ped.id}&select=status,entregador_id`, { headers: h(L.tok) }).then(j))[0];
  console.log("5) pedido final ->", JSON.stringify(fim), fim?.status === "aceito" && fim?.entregador_id ? "✅ atribuído" : "❌");
};
main().catch((e) => console.log("ERRO:", e.message));
