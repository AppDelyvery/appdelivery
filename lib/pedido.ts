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
  retornar: boolean;
  status: string;
};

const COLS =
  "id,coleta_endereco,coleta_lat,coleta_lng,entrega_endereco,entrega_lat,entrega_lng,preco_entregador,distancia_km,duracao_min,descricao,valor_declarado,cliente_final_nome,cliente_final_telefone,vehicle_type,retornar,status";

export function usePedido(pedidoId: string | null) {
  const [pedido, setPedido] = useState<PedidoAtivo | null>(null);

  // acompanha o pedido ao vivo (poll 5s) — inclui o status, pra o app reagir a
  // cancelamento/reatribuição feito pelo negócio ou pelo admin.
  useEffect(() => {
    if (!pedidoId) {
      setPedido(null);
      return;
    }
    let vivo = true;
    const buscar = async () => {
      const sb = getBrowserSupabase();
      if (!sb) return;
      const { data } = await sb.from("pedidos").select(COLS).eq("id", pedidoId).maybeSingle();
      if (vivo) setPedido((data as PedidoAtivo) ?? null);
    };
    buscar();
    const t = setInterval(buscar, 5000);
    return () => { vivo = false; clearInterval(t); };
  }, [pedidoId]);

  return pedido;
}
