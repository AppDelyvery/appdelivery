// Proxy de rota/ETA (Mapbox Directions) server-side — esqueleto.
// Hoje o protótipo chama a Directions direto do client com token público restrito por URL.
// Quando precisar esconder lógica/limites, este handler assume.
export async function GET() {
  return Response.json({ ok: false, msg: "em construção" }, { status: 501 });
}
