// Dispatch de Web Push — chamado pelo banco (pg_net) quando há nova oferta ou muda o status.
// Busca as assinaturas via RPC gated por segredo e assina/empurra cada uma. Runtime Node (web-push).
import { getServerSupabase } from "@/lib/supabase/server";
import { sendWebPush } from "@/lib/notify";

export const runtime = "nodejs";

type Row = { endpoint: string; p256dh: string; auth: string; titulo: string; corpo: string; url: string };

export async function POST(req: Request) {
  const secret = req.headers.get("x-notify-secret") ?? "";
  const body = await req.json().catch(() => null);
  const tipo = body?.tipo as string | undefined;
  const id = body?.id as string | undefined;
  if (!tipo || !id) return Response.json({ ok: false }, { status: 400 });

  const sb = await getServerSupabase();
  if (!sb) return Response.json({ ok: true }); // sem backend → no-op

  const { data } = await sb.rpc("subs_do_evento", { p_secret: secret, p_tipo: tipo, p_id: id });
  const rows = (data as Row[] | null) ?? [];

  const res = await Promise.all(
    rows.map((r) =>
      sendWebPush({ endpoint: r.endpoint, p256dh: r.p256dh, auth: r.auth }, { titulo: r.titulo, corpo: r.corpo, url: r.url }),
    ),
  );

  // limpa assinaturas mortas (404/410)
  const mortas = rows.filter((_, i) => res[i]?.gone).map((r) => r.endpoint);
  if (mortas.length) await sb.rpc("limpar_push_mortas", { p_secret: secret, p_endpoints: mortas });

  return Response.json({ ok: true, enviadas: res.filter((x) => x.ok).length });
}
