// Mapbox — token público restrito por URL (conta `appdelivery`).
// Entra por env var (NEXT_PUBLIC_MAPBOX_TOKEN); pluggable.
export const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
export const hasMapbox = () => MAPBOX_TOKEN.length > 0;

import type { LngLat } from "./rota";

// Busca a rota REAL pelas ruas (Directions) antes de desenhar — evita o "pulo".
export async function fetchDirections(
  origem: LngLat,
  destino: LngLat,
): Promise<{ coords: LngLat[]; distKm: number; durMin: number } | null> {
  if (!hasMapbox()) return null;
  try {
    const c = `${origem[0]},${origem[1]};${destino[0]},${destino[1]}`;
    const u = `https://api.mapbox.com/directions/v5/mapbox/driving/${c}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;
    const d = await (await fetch(u)).json();
    const rt = d?.routes?.[0];
    if (!rt) return null;
    return {
      coords: rt.geometry.coordinates as LngLat[],
      distKm: +(rt.distance / 1000).toFixed(2),
      durMin: Math.max(1, Math.round(rt.duration / 60)),
    };
  } catch {
    return null;
  }
}
