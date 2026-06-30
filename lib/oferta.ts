"use client";

import { useCallback, useEffect, useState } from "react";
import { getBrowserSupabase } from "./supabase/browser";

// Oferta dirigida ativa do entregador (modelo B). Poll a cada 2,5s — fonte da
// verdade é o servidor (expira_at). O contador na tela é só cosmético.
export type OfertaAtual = {
  oferta_id: string;
  pedido_id: string;
  expira_at: string;
  segundos: number;
  preco_entregador: number | null;
  vehicle_type: string;
  coleta_endereco: string;
  coleta_lat: number | null;
  coleta_lng: number | null;
  entrega_endereco: string;
  entrega_lat: number | null;
  entrega_lng: number | null;
  distancia_km: number | null;
  duracao_min: number | null;
};

export function useMinhaOferta(online: boolean) {
  const [oferta, setOferta] = useState<OfertaAtual | null>(null);

  const carregar = useCallback(async () => {
    const sb = getBrowserSupabase();
    if (!sb) return;
    const { data } = await sb.rpc("minha_oferta_atual");
    setOferta((data ?? null) as OfertaAtual | null);
  }, []);

  useEffect(() => {
    if (!online) {
      setOferta(null);
      return;
    }
    carregar();
    const t = setInterval(carregar, 2500);
    return () => clearInterval(t);
  }, [online, carregar]);

  const aceitar = useCallback(
    async (id: string): Promise<string> => {
      const sb = getBrowserSupabase();
      if (!sb) return "sem-backend";
      const { data, error } = await sb.rpc("aceitar_oferta", { p_oferta_id: id });
      if (error) return error.message;
      await carregar();
      return (data as string) ?? "erro";
    },
    [carregar],
  );

  const recusar = useCallback(
    async (id: string) => {
      const sb = getBrowserSupabase();
      if (!sb) return;
      await sb.rpc("recusar_oferta", { p_oferta_id: id });
      await carregar();
    },
    [carregar],
  );

  return { oferta, aceitar, recusar };
}
