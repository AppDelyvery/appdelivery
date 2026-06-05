import { createClient } from "@supabase/supabase-js";
import { fetchDirections } from "@/lib/mapbox";
import { geoDist } from "@/lib/rota";

// API DE INTEGRAÇÃO — POST /api/v1/cotacao
// Devolve o preço das 3 categorias ANTES de criar o pedido (pra o lojista mostrar
// o frete pro cliente dele). NÃO cria nada. Autentica pela chave.
//
// Body: { coleta_lat, coleta_lng, entrega_lat, entrega_lng }

function lerChave(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  return req.headers.get("x-api-key");
}
const erro = (status: number, msg: string) => Response.json({ ok: false, erro: msg }, { status });
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : Number(v));

export async function POST(req: Request) {
  const chave = lerChave(req);
  if (!chave) return erro(401, "Informe a chave de API.");

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return erro(400, "Body JSON inválido.");
  }

  const cLng = num(body.coleta_lng), cLat = num(body.coleta_lat);
  const eLng = num(body.entrega_lng), eLat = num(body.entrega_lat);
  if ([cLng, cLat, eLng, eLat].some((n) => !Number.isFinite(n))) return erro(400, "Coordenadas inválidas (coleta_lat/lng, entrega_lat/lng).");

  const rota = await fetchDirections([cLng, cLat], [eLng, eLat]);
  const distancia_km = rota ? rota.distKm : +(geoDist([cLng, cLat], [eLng, eLat]) / 1000).toFixed(2);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return erro(500, "Backend não configurado.");
  const sb = createClient(url, anon);

  const { data, error } = await sb.rpc("cotar_via_api", { p_key: chave, p_dist: distancia_km });
  if (error) {
    if ((error.message || "").includes("chave invalida")) return erro(401, "Chave de API inválida.");
    return erro(500, error.message);
  }

  const c = data as { distancia_km: number; moto: { total: number }; carro: { total: number }; van: { total: number } };
  return Response.json({
    ok: true,
    distancia_km,
    opcoes: [
      { veiculo: "moto", preco_total: c.moto.total },
      { veiculo: "carro", preco_total: c.carro.total },
      { veiculo: "van", preco_total: c.van.total },
    ],
  });
}
