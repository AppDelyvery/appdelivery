// Webhook do Asaas (pagamento/split) — esqueleto.
// Entra quando a conta Asaas existir. Validar assinatura do webhook antes de processar.
export async function POST() {
  return Response.json({ ok: false, msg: "em construção" }, { status: 501 });
}
