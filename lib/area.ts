// Área de cobertura do AppDelyvery — Palmas + Taquaralto/Aurenys + Luzimangues + Porto Nacional.
// Mesmo bbox usado no enviesamento do geocoder (AddressAutocomplete) — fonte única.
export const AREA_BBOX = { minLng: -48.75, minLat: -10.85, maxLng: -48.1, maxLat: -9.8 };

export function dentroDaArea(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) && Number.isFinite(lng) &&
    lng >= AREA_BBOX.minLng && lng <= AREA_BBOX.maxLng &&
    lat >= AREA_BBOX.minLat && lat <= AREA_BBOX.maxLat
  );
}

// Distância em linha reta (km). É o PISO físico: a rota por rua é sempre >= isso.
// Usada pra impedir que um request forjado mande distância menor que o possível e pague menos.
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
