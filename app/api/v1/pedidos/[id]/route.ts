import { createClient } from "@supabase/supabase-js";

// API DE INTEGRAÇÃO — GET /api/v1/pedidos/{id}
// O lojista consulta o status do pedido (poll) com a chave dele.
// Header: Authorization: Bearer appdly_live_xxx  (ou X-Api-Key)

function lerChave(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  return req.headers.get("x-api-key");
}
const erro = (status: number, msg: string) => Response.json({ ok: false, erro: msg }, { status });

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const chave = lerChave(req);
  if (!chave) return erro(401, "Informe a chave de API.");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return erro(500, "Backend não configurado.");
  const sb = createClient(url, anon);

  const { data, error } = await sb.rpc("status_via_api", { p_key: chave, p_pedido_id: id });
  if (error) {
    const m = error.message || "";
    if (m.includes("chave invalida")) return erro(401, "Chave inválida.");
    if (m.includes("nao encontrado")) return erro(404, "Pedido não encontrado.");
    return erro(500, m);
  }
  return Response.json({ ok: true, ...(data as object) });
}
