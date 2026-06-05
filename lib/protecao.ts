"use client";

import { useEffect, useState } from "react";
import { getBrowserSupabase } from "./supabase/browser";

// Teto de ressarcimento da proteção de carga (config). Default 300 (igual Bee).
export function useTetoProtecao() {
  const [teto, setTeto] = useState(300);
  useEffect(() => {
    (async () => {
      const sb = getBrowserSupabase();
      if (!sb) return;
      const { data } = await sb.from("config").select("protecao_teto").eq("id", 1).single();
      const v = Number((data as { protecao_teto?: number } | null)?.protecao_teto);
      if (Number.isFinite(v) && v > 0) setTeto(v);
    })();
  }, []);
  return teto;
}

// Cobertura efetiva de um pedido = menor entre o teto e o valor declarado.
export function cobertura(valorDeclarado: number | null | undefined, teto: number): number {
  if (valorDeclarado == null || valorDeclarado <= 0) return teto;
  return Math.min(teto, valorDeclarado);
}
