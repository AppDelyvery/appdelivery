// Cria contas DEMO pra testar o loop: 1 lojista (com 1 pedido) + 1 entregador.
// Uso: K=<publishable> U=<url> node scripts/seed-demo.mjs   (rodar 1x)
const U = process.env.U;
const K = process.env.K;
const SENHA = "Demo1234";
const h = (tok) => ({ apikey: K, Authorization: `Bearer ${tok || K}`, "Content-Type": "application/json" });
const rep = (tok) => ({ ...h(tok), Prefer: "return=representation" });
const j = (r) => r.json();

const signup = async (email, role, nome) => {
  const s = await fetch(`${U}/auth/v1/signup`, { method: "POST", headers: h(), body: JSON.stringify({ email, password: SENHA, data: { role, nome } }) }).then(j);
  return { tok: s.access_token, uid: s.user?.id, err: s.msg || s.error_code };
};

const main = async () => {
  // LOJISTA + PEDIDO
  const L = await signup("demo.negocio@gmail.com", "estabelecimento", "Ótica Demo");
  if (!L.tok) return console.log("Lojista: já existe ou erro ->", L.err, "(se 'already registered', as contas demo já foram criadas)");
  await fetch(`${U}/rest/v1/profiles`, { method: "POST", headers: h(L.tok), body: JSON.stringify({ id: L.uid, role: "estabelecimento", nome: "Ótica Demo" }) });
  const est = (await fetch(`${U}/rest/v1/estabelecimentos`, { method: "POST", headers: rep(L.tok), body: JSON.stringify({ profile_id: L.uid, razao_social: "Ótica Demo" }) }).then(j))[0];
  const ped = (await fetch(`${U}/rest/v1/pedidos`, { method: "POST", headers: rep(L.tok), body: JSON.stringify({ estabelecimento_id: est.id, coleta_endereco: "Ótica Demo — Q.104 Norte", coleta_lat: -10.1701, coleta_lng: -48.3401, entrega_endereco: "Andrade Contab. — Q.304 Sul", entrega_lat: -10.2008, entrega_lng: -48.3209, descricao: "Documentos + óculos", valor_declarado: 350, vehicle_type: "moto", distancia_km: 6.3, duracao_min: 10, preco_total: 17.45, preco_entregador: 13.96, preco_plataforma: 3.49, status: "buscando" }) }).then(j))[0];

  // ENTREGADOR
  const E = await signup("demo.entregador@gmail.com", "entregador", "Carlos Demo");
  if (E.tok) {
    await fetch(`${U}/rest/v1/profiles`, { method: "POST", headers: h(E.tok), body: JSON.stringify({ id: E.uid, role: "entregador", nome: "Carlos Demo" }) });
    await fetch(`${U}/rest/v1/entregadores`, { method: "POST", headers: rep(E.tok), body: JSON.stringify({ profile_id: E.uid, nome: "Carlos Demo", cpf: "000.000.000-00", vehicle_type: "moto", placa: "ABC1D23" }) });
  }

  console.log("=== CONTAS DEMO CRIADAS ===");
  console.log("LOJISTA  -> demo.negocio@gmail.com    / " + SENHA + "  (já tem 1 pedido buscando)");
  console.log("ENTREGADOR-> demo.entregador@gmail.com / " + SENHA + "  (Carlos Demo, na fila pra você aprovar)");
  console.log("pedido:", ped?.id, "| tracking_token:", ped?.tracking_token);
};
main().catch((e) => console.log("ERRO:", e.message));
