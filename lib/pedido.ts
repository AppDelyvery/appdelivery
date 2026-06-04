"use client";

import { useEffect, useState } from "react";
import { getBrowserSupabase } from "./supabase/browser";

// Pedido real que o entregador está executando (pós-aceite). RLS pedidos_party_sel
// libera leitura pro entregador designado. Conteúdo (descricao/valor) só é lido
// aqui, depois de aceitar — decisão de segurança.
export type PedidoAtivo = {
  id: string;
  coleta_endereco: string;
  coleta_lat: number | null;
  coleta_lng: number | null;
  entrega_endereco: string;
  entrega_lat: number | null;
  entrega_lng: number | null;
  preco_entregador: number | null;
  distancia_km: number | null;
  duracao_min: number | null;
  descricao: string | null;
  valor_declarado: number | null;
  cliente_final_nome: string | null;
  cliente_final_telefone: string | null;
  vehicle_type: string;
};

const COLS =
  "id,coleta_endereco,coleta_lat,coleta_lng,entrega_endereco,entrega_lat,entrega_lng,preco_entregador,distancia_km,duracao_min,descricao,valor_declarado,cliente_final_nome,cliente_final_telefone,vehicle_type";

export function usePedido(pedidoId: string | null) {
  const [pedido, setPedido] = useState<PedidoAtivo | null>(null);

  useEffect(() => {
    if (!pedidoId) {
      setPedido(null);
      return;
    }
    (async () => {
      const sb = getBrowserSupabase();
      if (!sb) return;
      const { data } = await sb.from("pedidos").select(COLS).eq("id", pedidoId).single();
      if (data) setPedido(data as PedidoAtivo);
    })();
  }, [pedidoId]);

  return pedido;
}
