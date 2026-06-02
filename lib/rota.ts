// Geometria de rota + ETA — Palmas-TO. Portado do protótipo.
// A rota real vem da Mapbox Directions (no client); aqui ficam os dados-base,
// o fallback aproximado e os helpers de posição/distância sobre a linha.

export type LngLat = [number, number];
export type Ponto = { lng: number; lat: number; nome: string; end: string };

export const PALMAS: LngLat = [-48.3336, -10.1844];

export const ORIGEM: Ponto = {
  lng: -48.3401,
  lat: -10.1701,
  nome: "Ótica Visão Center",
  end: "Q. 104 Norte, Av. JK",
};
export const DESTINO: Ponto = {
  lng: -48.3209,
  lat: -10.2008,
  nome: "Andrade Contabilidade",
  end: "Q. 304 Sul, Av. NS-2",
};

export const STEPS = [
  { t: "Pedido aceito", s: "Lucas confirmou a corrida" },
  { t: "A caminho da coleta", s: "Indo até a Ótica Visão Center" },
  { t: "Encomenda coletada", s: "Foto registrada na coleta" },
  { t: "A caminho da entrega", s: "Levando até o destino" },
  { t: "Entregue", s: "Foto + assinatura do destinatário" },
];

// Rota aproximada (fallback) caso a Directions falhe.
export function buildRoute(o: Ponto, d: Ponto): LngLat[] {
  const wp: LngLat[] = [
    [o.lng, o.lat],
    [-48.336, -10.179],
    [-48.33, -10.185],
    [-48.327, -10.192],
    [-48.323, -10.197],
    [d.lng, d.lat],
  ];
  const pts: LngLat[] = [];
  for (let s = 0; s < wp.length - 1; s++) {
    const a = wp[s];
    const b = wp[s + 1];
    for (let i = 0; i < 24; i++) {
      const t = i / 24;
      pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  pts.push([d.lng, d.lat]);
  return pts;
}

// distância em metros entre 2 coords (haversine simplificado)
export function geoDist(a: LngLat, b: LngLat): number {
  const R = 6371000;
  const r = Math.PI / 180;
  const dLat = (b[1] - a[1]) * r;
  const dLng = (b[0] - a[0]) * r;
  const la = ((a[1] + b[1]) / 2) * r;
  const x = dLng * Math.cos(la);
  const y = dLat;
  return Math.sqrt(x * x + y * y) * R;
}

// Indexa a rota: distância acumulada por vértice (para posição sobre a linha).
export function indexRoute(route: LngLat[]): { cum: number[]; total: number } {
  const cum = [0];
  for (let i = 1; i < route.length; i++) cum.push(cum[i - 1] + geoDist(route[i - 1], route[i]));
  return { cum, total: cum[cum.length - 1] || 1 };
}

// Ponto exato sobre a linha na fração [0..1] — mantém o motoboy colado na rua.
export function posAt(route: LngLat[], cum: number[], total: number, frac: number): LngLat {
  const tg = total * Math.min(1, Math.max(0, frac));
  let i = 1;
  while (i < cum.length && cum[i] < tg) i++;
  const a = route[i - 1];
  const b = route[i] || a;
  const seg = cum[i] - cum[i - 1] || 1;
  const t = (tg - cum[i - 1]) / seg;
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

// Etapa da entrega em função da fração percorrida (mesmos limiares do protótipo).
export function stepAt(frac: number): number {
  if (frac >= 0.999) return 4;
  if (frac > 0.42) return 3;
  if (frac > 0.32) return 2;
  if (frac > 0.02) return 1;
  return 0;
}

// ETA restante a partir da fração percorrida.
export function etaFrom(frac: number, distKm: number, durMin: number) {
  const rest = 1 - Math.min(1, Math.max(0, frac));
  return { min: Math.max(0, Math.round(rest * durMin)), km: (rest * distKm).toFixed(1) };
}
