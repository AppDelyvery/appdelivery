// Prova do fluxo completo (prova-na-fonte): cadastro -> pedido -> rastreio público.
// Uso: K=<publishable> U=<url> node scripts/verify-fluxo.mjs
const U = process.env.U;
const K = process.env.K;
const email = `loja.fluxo.${Date.now()}@gmail.com`;
const h = (tok) => ({ apikey: K, Authorization: `Bearer ${tok || K}`, "Content-Type": "application/json" });
const rep = (tok) => ({ ...h(tok), Prefer: "return=representation" });
const j = (r) => r.json();

const main = async () => {
  const s = await fetch(`${U}/auth/v1/signup`, {
    method: "POST",
    headers: h(),
    body: JSON.stringify({ email, password: "Teste1234", data: { role: "estabelecimento", nome: "Otica Fluxo" } }),
  }).then(j);
  const tok = s.access_token;
  const uid = s.user?.id;
  if (!tok) return console.log(">> signup falhou:", s.msg || s.error_code);
  console.log("1) conta criada:", uid);

  await fetch(`${U}/rest/v1/profiles`, { method: "POST", headers: h(tok), body: JSON.stringify({ id: uid, role: "estabelecimento", nome: "Otica Fluxo" }) });
  const est = await fetch(`${U}/rest/v1/estabelecimentos`, { method: "POST", headers: rep(tok), body: JSON.stringify({ profile_id: uid, razao_social: "Otica Fluxo" }) }).then(j);
  const estId = est[0]?.id;
  console.log("2) estabelecimento:", estId);

  // preço (tabela): moto 8 + 6.3km*1.5 = 17.45 ; 80/20
  const pedido = {
    estabelecimento_id: estId,
    coleta_endereco: "Q.104 Norte, Av. JK",
    coleta_lat: -10.1701, coleta_lng: -48.3401,
    entrega_endereco: "Q.304 Sul, Av. NS-2",
    entrega_lat: -10.2008, entrega_lng: -48.3209,
    descricao: "Documentos + 1 par de óculos",
    valor_declarado: 350,
    vehicle_type: "moto",
    distancia_km: 6.3, duracao_min: 10,
    preco_total: 17.45, preco_entregador: 13.96, preco_plataforma: 3.49,
    status: "buscando",
  };
  const ped = await fetch(`${U}/rest/v1/pedidos`, { method: "POST", headers: rep(tok), body: JSON.stringify(pedido) }).then(j);
  const pedId = ped[0]?.id;
  const token = ped[0]?.tracking_token;
  console.log("3) pedido criado:", pedId, "| status:", ped[0]?.status, "| token:", token);

  // read-after-write
  const back = await fetch(`${U}/rest/v1/pedidos?id=eq.${pedId}&select=id,status,preco_total,tracking_token`, { headers: h(tok) }).then(j);
  console.log("4) READ-AFTER-WRITE pedido ->", JSON.stringify(back));

  // rastreio público (anon, sem login) acha o pedido pelo token
  const pub = await fetch(`${U}/rest/v1/rpc/get_rastreio_publico`, { method: "POST", headers: h(), body: JSON.stringify({ p_token: token }) }).then(j);
  console.log("5) RASTREIO PUBLICO (anon, por token) ->", JSON.stringify(pub));
};
main().catch((e) => console.log("ERRO:", e.message));
