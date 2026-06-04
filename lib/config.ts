import type { SupabaseClient } from "@supabase/supabase-js";
import type { TabelaPreco } from "./precos";

// Config = tabela de preço (por veículo) + raio de matching + PIN do supervisor.
export type Config = TabelaPreco & {
  raioM: number;
  pin: string | null;
};

export const CONFIG_DEFAULT: Config = {
  baseMoto: 8, perKmMoto: 1.5, minMoto: 10,
  baseCarro: 13, perKmCarro: 2.5, minCarro: 15,
  baseVan: 20, perKmVan: 3.0, minVan: 25,
  driverPct: 0.8,
  raioM: 5000,
  pin: null,
};

function num(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function mapRow(r: Record<string, unknown> | null): Config {
  if (!r) return CONFIG_DEFAULT;
  return {
    baseMoto: num(r.base_moto, CONFIG_DEFAULT.baseMoto),
    perKmMoto: num(r.per_km_moto, CONFIG_DEFAULT.perKmMoto),
    minMoto: num(r.min_moto, CONFIG_DEFAULT.minMoto),
    baseCarro: num(r.base_carro, CONFIG_DEFAULT.baseCarro),
    perKmCarro: num(r.per_km_carro, CONFIG_DEFAULT.perKmCarro),
    minCarro: num(r.min_carro, CONFIG_DEFAULT.minCarro),
    baseVan: num(r.base_van, CONFIG_DEFAULT.baseVan),
    perKmVan: num(r.per_km_van, CONFIG_DEFAULT.perKmVan),
    minVan: num(r.min_van, CONFIG_DEFAULT.minVan),
    driverPct: 1 - num(r.take_rate, 0.2),
    raioM: num(r.raio_m, CONFIG_DEFAULT.raioM),
    pin: (r.pin_supervisor as string | null) ?? null,
  };
}

// Lê a config (id=1). Aceita client de browser ou de server. Default se não houver.
export async function getConfig(sb: SupabaseClient | null): Promise<Config> {
  if (!sb) return CONFIG_DEFAULT;
  const { data } = await sb.from("config").select("*").eq("id", 1).single();
  return mapRow(data as Record<string, unknown> | null);
}
