// Tabela de preço real do APPDELYVERY (ajustável). Validar com o investidor.
// Bandeirada moto R$8 / carro R$13 · R$1,50/km · mínimo R$10 · entregador 80%.
export type Veiculo = "moto" | "carro" | "van";

export const PRICE = {
  baseMoto: 8.0,
  baseCarro: 13.0,
  baseVan: 20.0, // placeholder — validar valor da VAN com o investidor
  perKm: 1.5,
  min: 10.0,
  driverPct: 0.8,
} as const;

export const money = (v: number) => "R$ " + v.toFixed(2).replace(".", ",");

export type Preco = {
  base: number;
  dist: number;
  total: number;
  aplicouMin: boolean;
  driver: number;
  taxa: number;
};

export function priceCalc(veh: Veiculo, distKm: number): Preco {
  const base = veh === "moto" ? PRICE.baseMoto : veh === "carro" ? PRICE.baseCarro : PRICE.baseVan;
  const dist = +(distKm * PRICE.perKm).toFixed(2);
  let total = base + dist;
  const aplicouMin = total < PRICE.min;
  if (aplicouMin) total = PRICE.min;
  total = +total.toFixed(2);
  return {
    base,
    dist,
    total,
    aplicouMin,
    driver: +(total * PRICE.driverPct).toFixed(2),
    taxa: +(total * (1 - PRICE.driverPct)).toFixed(2),
  };
}
