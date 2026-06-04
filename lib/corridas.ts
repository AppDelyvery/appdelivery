"use client";

import { useCallback, useEffect, useState } from "react";
import { getBrowserSupabase } from "./supabase/browser";

export type CorridaDisponivel = {
  id: string;
  coleta_endereco: string;
  entrega_endereco: string;
  distancia_km: number | null;
  duracao_min: number | null;
  preco_entregador: number | null;
  vehicle_type: string;
  created_at: string;
};

// Entregador aprovado: lista as corridas disponíveis (polling) e aceita de forma atômica.
export function useCorridasDisponiveis() {
  const [corridas, setCorridas] = useState<CorridaDisponivel[]>([]);

  const carregar = useCallback(async () => {
    const sb = getBrowserSupabase();
    if (!sb) return;
    const { data } = await sb.rpc("listar_corridas_disponiveis");
    if (data) setCorridas(data as CorridaDisponivel[]);
  }, []);

  useEffect(() => {
    // polling: setState após o await (assíncrono) — padrão intencional
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregar();
    const t = setInterval(carregar, 5000);
    return () => clearInterval(t);
  }, [carregar]);

  const aceitar = useCallback(
    async (pedidoId: string): Promise<string> => {
      const sb = getBrowserSupabase();
      if (!sb) return "sem-backend";
      const { data, error } = await sb.rpc("aceitar_corrida", { p_pedido_id: pedidoId });
      if (error) return error.message;
      await carregar();
      return (data as string) ?? "erro";
    },
    [carregar],
  );

  return { corridas, aceitar };
}
