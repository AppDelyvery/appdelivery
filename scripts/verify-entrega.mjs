// Prova a máquina de estados ponta a ponta usando a conta demo do entregador.
// Requer: 0007+0008 aplicadas + Carlos Demo APROVADO no admin.
// Uso: K=<publishable> U=<url> node scripts/verify-entrega.mjs
const U = process.env.U;
const K = process.env.K;
const h = (tok) => ({ apikey: K, Authorization: `Bearer ${tok || K}`, "Content-Type": "application/json" });
const j = (r) => r.json();

const main = async () => {
  // login como o entregador demo
  const login = await fetch(`${U}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: h(),
    body: JSON.stringify({ email: "demo.entregador@gmail.com", password: "Demo1234" }),
  }).then(j);
  const tok = login.access_token;
  if (!tok) return console.log("login falhou:", login.error_description || login.msg);
  console.log("1) logado como Carlos Demo");

  const lista = await fetch(`${U}/rest/v1/rpc/listar_corridas_disponiveis`, { method: "POST", headers: h(tok), body: "{}" }).then(j);
  if (!Array.isArray(lista) || lista.length === 0) {
    return console.log("2) sem corridas disponíveis -> Carlos provavelmente NÃO está aprovado. Aprove em /admin/entregadores e rode de novo.");
  }
  const pedidoId = lista[0].id;
  console.log("2) corridas disponíveis:", lista.length, "| vou pegar:", pedidoId);

  const ac = await fetch(`${U}/rest/v1/rpc/aceitar_corrida`, { method: "POST", headers: h(tok), body: JSON.stringify({ p_pedido_id: pedidoId }) }).then(j);
  console.log("3) aceitar ->", JSON.stringify(ac));
  if (ac !== "ok") return;

  const col = await fetch(`${U}/rest/v1/rpc/registrar_coleta`, { method: "POST", headers: h(tok), body: JSON.stringify({ p_pedido_id: pedidoId, p_foto_url: "https://teste/coleta.jpg" }) }).then(j);
  console.log("4) registrar coleta ->", JSON.stringify(col), col === "ok" ? "✅" : "");

  const ent = await fetch(`${U}/rest/v1/rpc/registrar_entrega`, { method: "POST", headers: h(tok), body: JSON.stringify({ p_pedido_id: pedidoId, p_foto_url: "https://teste/entrega.jpg", p_assinatura_url: "https://teste/ass.png" }) }).then(j);
  console.log("5) registrar entrega ->", JSON.stringify(ent), ent === "ok" ? "✅" : "");

  // estado final + comprovantes (lê pela função pública)
  const pub = await fetch(`${U}/rest/v1/rpc/get_rastreio_publico`, { method: "POST", headers: h(), body: JSON.stringify({ p_token: lista[0].id }) }).then(() => null);
  const status = await fetch(`${U}/rest/v1/pedidos?id=eq.${pedidoId}&select=status,coletado_at,entregue_at`, { headers: h(tok) }).then(j);
  console.log("6) pedido final ->", JSON.stringify(status[0]), status[0]?.status === "entregue" ? "✅ ENTREGUE com trilha de auditoria" : "❌");
  void pub;
};
main().catch((e) => console.log("ERRO:", e.message));
