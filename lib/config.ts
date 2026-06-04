import type { SupabaseClient } from "@supabase/supabase-js";

export type Config = {
  baseMoto: number;
  baseCarro: number;
  baseVan: number;
  perKm: number;
  min: number;
  driverPct: number;
  raioM: number;
  pin: string | null;
};

export const CONFIG_DEFAULT: Config = {
  baseMoto: 8,
  baseCarro: 13,
  baseVan: 20,
  perKm: 1.5,
  min: 10,
  driverPct: 0.8,
  raioM: 5000,
  pin: null,
};

function mapRow(r: Record<string, unknown> | null): Config {
  if (!r) return CONFIG_DEFAULT;
  return {
    baseMoto: Number(r.base_moto),
    baseCarro: Number(r.base_carro),
    baseVan: Number(r.base_van),
    perKm: Number(r.per_km),
    min: Number(r.minimo),
    driverPct: 1 - Number(r.take_rate),
    raioM: Number(r.raio_m),
    pin: (r.pin_supervisor as string | null) ?? null,
  };
}

// Lê a config (id=1). Aceita client de browser ou de server. Default se não houver.
export async function getConfig(sb: SupabaseClient | null): Promise<Config> {
  if (!sb) return CONFIG_DEFAULT;
  const { data } = await sb.from("config").select("*").eq("id", 1).single();
  return mapRow(data as Record<string, unknown> | null);
}
