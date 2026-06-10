// Webhook do Asaas — confirma pagamento de recarga e credita a carteira (idempotente).
// Valida o token do webhook (configurado no painel do Asaas e em ASAAS_WEBHOOK_TOKEN).
import { getAdminSupabase } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const expected = process.env.ASAAS_WEBHOOK_TOKEN;
  if (expected) {
    const token = req.headers.get("asaas-access-token");
    if (token !== expected) return Response.json({ ok: false }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const evento = body?.event as string | undefined;
  const paymentId = body?.payment?.id as string | undefined;

  if (paymentId && (evento === "PAYMENT_RECEIVED" || evento === "PAYMENT_CONFIRMED")) {
    const sb = getAdminSupabase();
    if (sb) await sb.rpc("confirmar_recarga", { p_asaas_id: paymentId });
  }

  // Sempre 200 pro Asaas não reenfileirar (idempotência garante segurança).
  return Response.json({ ok: true });
}
