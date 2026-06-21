// Tabela de preço do APPDELYVERY — UMA FAIXA POR VEÍCULO (bandeirada + por-km +
// mínimo próprios). Valores são default editável (o dono ajusta no painel).
// Validar com o investidor. Entregador recebe 80% (take rate 20%).
export type Veiculo = "moto" | "carro" | "van";

export type TabelaPreco = {
  baseMoto: number; perKmMoto: number; minMoto: number;
  baseCarro: number; perKmCarro: number; minCarro: number;
  baseVan: number; perKmVan: number; minVan: number;
  driverPct: number;
  valorParadaExtra: number; valorEsperaBloco: number; esperaBlocoMin: number;
};

export const PRICE: TabelaPreco = {
  baseMoto: 8.0, perKmMoto: 1.5, minMoto: 10.0,
  baseCarro: 13.0, perKmCarro: 2.5, minCarro: 15.0,
  baseVan: 20.0, perKmVan: 3.0, minVan: 25.0,
  driverPct: 0.8,
  valorParadaExtra: 3.0, valorEsperaBloco: 4.0, esperaBlocoMin: 10,
};

// rótulo e ordem de exibição das categorias
export const VEICULOS: { id: Veiculo; nome: string; desc: string }[] = [
  { id: "moto", nome: "Moto", desc: "Envelopes e caixas pequenas" },
  { id: "carro", nome: "Carro", desc: "Volumes médios" },
  { id: "van", nome: "Van", desc: "Cargas grandes e volumosas" },
];

export const money = (v: number) => "R$ " + v.toFixed(2).replace(".", ",");

export type Preco = {
  base: number;
  dist: number;
  total: number;
  aplicouMin: boolean;
  extras: number;
  driver: number;
  taxa: number;
};

export type Extras = { paradasExtras?: number; minutosEspera?: number };

// faixa (bandeirada/por-km/mínimo) do veículo escolhido
export function faixaDoVeiculo(veh: Veiculo, cfg: TabelaPreco = PRICE) {
  if (veh === "moto") return { base: cfg.baseMoto, perKm: cfg.perKmMoto, min: cfg.minMoto };
  if (veh === "carro") return { base: cfg.baseCarro, perKm: cfg.perKmCarro, min: cfg.minCarro };
  return { base: cfg.baseVan, perKm: cfg.perKmVan, min: cfg.minVan };
}

export function priceCalc(veh: Veiculo, distKm: number, cfg: TabelaPreco = PRICE, extras?: Extras): Preco {
  const f = faixaDoVeiculo(veh, cfg);
  const dist = +(distKm * f.perKm).toFixed(2);
  let total = f.base + dist;
  const aplicouMin = total < f.min;
  if (aplicouMin) total = f.min;
  // extras (espera + paradas) entram POR CIMA do mínimo
  const paradas = Math.max(0, Math.floor(extras?.paradasExtras ?? 0));
  const espera = Math.max(0, Math.floor(extras?.minutosEspera ?? 0));
  const extrasTotal = +(
    paradas * cfg.valorParadaExtra +
    Math.ceil(espera / (cfg.esperaBlocoMin || 10)) * cfg.valorEsperaBloco
  ).toFixed(2);
  total = +(total + extrasTotal).toFixed(2);
  return {
    base: f.base,
    dist,
    total,
    aplicouMin,
    extras: extrasTotal,
    driver: +(total * cfg.driverPct).toFixed(2),
    taxa: +(total * (1 - cfg.driverPct)).toFixed(2),
  };
}
