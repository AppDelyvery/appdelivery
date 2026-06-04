import { geoDist, type LngLat } from "./rota";

// Raio de tolerância (metros) pra considerar que o entregador "chegou" no ponto.
export const RAIO_CHEGADA = 150;

// Distância em metros do GPS do entregador até um ponto (lat/lng), ou null se faltar dado.
export function distanciaAte(gps: LngLat | null, lat: number | null, lng: number | null): number | null {
  if (!gps || lat == null || lng == null) return null;
  return geoDist(gps, [lng, lat]);
}

// true quando temos posição confiável E ela está longe do ponto.
export function estaLonge(gps: LngLat | null, lat: number | null, lng: number | null, raio = RAIO_CHEGADA): boolean {
  const d = distanciaAte(gps, lat, lng);
  return d != null && d > raio;
}
