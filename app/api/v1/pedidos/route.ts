import { createClient } from "@supabase/supabase-js";
import { fetchDirections } from "@/lib/mapbox";
import { geoDist } from "@/lib/rota";

// API DE INTEGRAÇÃO — POST /api/v1/pedidos
// O sistema do lojista (ex.: app/loja virtual) cria uma entrega que dispara o
// despacho automático. Autentica pela chave do estabelecimento.
//
// Header:  Authorization: Bearer appdly_live_xxx   (ou X-Api-Key: appdly_live_xxx)
// Body JSON: { coleta_endereco, coleta_lat, coleta_lng, entrega_endereco,
//   entrega_lat, entrega_lng, vehicle_type?, descricao?, valor_declarado?,
//   cliente_final_nome?, cliente_final_telefone? }

function lerChave(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  return req.headers.get("x-api-key");
}

function erro(status: number, msg: string) {
  return Response.json({ ok: false, erro: msg }, { status });
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : Number(v));

export async function POST(req: Request) {
  const chave = lerChave(req);
  if (!chave) return erro(401, "Informe a chave de API (Authorization: Bearer …).");

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return erro(400, "Body JSON inválido.");
  }

  const obrig = ["coleta_endereco", "coleta_lat", "coleta_lng", "entrega_endereco", "entrega_lat", "entrega_lng"];
  for (const k of obrig) {
    if (body[k] === undefined || body[k] === null || body[k] === "") return erro(400, `Campo obrigatório ausente: ${k}.`);
  }

  const cLng = num(body.coleta_lng), cLat = num(body.coleta_lat);
  const eLng = num(body.entrega_lng), eLat = num(body.entrega_lat);
  if ([cLng, cLat, eLng, eLat].some((n) => !Number.isFinite(n))) return erro(400, "Coordenadas inválidas.");

  // distância/duração reais (Mapbox); fallback = linha reta
  const rota = await fetchDirections([cLng, cLat], [eLng, eLat]);
  const distancia_km = rota ? rota.distKm : +(geoDist([cLng, cLat], [eLng, eLat]) / 1000).toFixed(2);
  const duracao_min = rota ? rota.durMin : Math.max(1, Math.round((distancia_km / 25) * 60));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return erro(500, "Backend não configurado.");
  const sb = createClient(url, anon);

  const dados = {
    coleta_endereco: body.coleta_endereco,
    coleta_lat: cLat, coleta_lng: cLng,
    entrega_endereco: body.entrega_endereco,
    entrega_lat: eLat, entrega_lng: eLng,
    vehicle_type: body.vehicle_type ?? "moto",
    descricao: body.descricao ?? null,
    valor_declarado: body.valor_declarado ?? null,
    cliente_final_nome: body.cliente_final_nome ?? null,
    cliente_final_telefone: body.cliente_final_telefone ?? null,
    retornar: body.retornar === true,
    distancia_km, duracao_min,
  };

  const { data, error } = await sb.rpc("criar_pedido_via_api", { p_key: chave, p_dados: dados });
  if (error) {
    const m = error.message || "";
    if (m.includes("chave invalida")) return erro(401, "Chave de API inválida ou revogada.");
    if (m.includes("suspenso")) return erro(403, "Estabelecimento suspenso.");
    return erro(500, m);
  }

  const r = data as { pedido_id: string; tracking_token: string; preco_total: number; vehicle_type: string };
  const origem = new URL(req.url).origin;
  return Response.json({
    ok: true,
    pedido_id: r.pedido_id,
    tracking_token: r.tracking_token,
    rastreio_url: `${origem}/rastreio/${r.tracking_token}`,
    veiculo: r.vehicle_type,
    preco_total: r.preco_total,
    distancia_km,
  }, { status: 201 });
}
