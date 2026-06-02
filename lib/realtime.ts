"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getBrowserSupabase } from "./supabase/browser";
import type { LngLat } from "./rota";

// CAMADA DE COMUNICAÇÃO AO VIVO (Supabase Realtime).
// Sem Supabase conectado, todos os hooks viram no-op → a UI cai no fallback de simulação.
// Vira real e testável no instante que NEXT_PUBLIC_SUPABASE_URL/ANON_KEY existirem.

// Entregador: emite a própria posição no canal pedido:{id} (Broadcast efêmero — não grava ping).
export function useEnviarPosicao(pedidoId: string | null) {
  const chRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const sb = getBrowserSupabase();
    if (!sb || !pedidoId) return;
    const ch = sb.channel(`pedido:${pedidoId}`, { config: { broadcast: { self: false } } });
    ch.subscribe();
    chRef.current = ch;
    return () => {
      sb.removeChannel(ch);
      chRef.current = null;
    };
  }, [pedidoId]);

  return useCallback((p: LngLat) => {
    chRef.current?.send({ type: "broadcast", event: "pos", payload: { lng: p[0], lat: p[1] } });
  }, []);
}

// Lojista / cliente final: recebe a posição ao vivo do entregador.
export function usePosicaoAoVivo(pedidoId: string | null): LngLat | null {
  const [pos, setPos] = useState<LngLat | null>(null);

  useEffect(() => {
    const sb = getBrowserSupabase();
    if (!sb || !pedidoId) return;
    const ch = sb
      .channel(`pedido:${pedidoId}`)
      .on("broadcast", { event: "pos" }, (msg) => {
        const p = msg.payload as { lng?: number; lat?: number };
        if (typeof p?.lng === "number" && typeof p?.lat === "number") setPos([p.lng, p.lat]);
      })
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
  }, [pedidoId]);

  return pos;
}

// Status do pedido em tempo real (Postgres Changes) + leitura inicial (read-after-write friendly).
export function useStatusPedido(pedidoId: string | null): string | null {
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const sb = getBrowserSupabase();
    if (!sb || !pedidoId) return;

    sb.from("pedidos")
      .select("status")
      .eq("id", pedidoId)
      .single()
      .then(({ data }) => {
        const row = data as { status?: string } | null;
        if (row?.status) setStatus(row.status);
      });

    const ch = sb
      .channel(`status:${pedidoId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "pedidos", filter: `id=eq.${pedidoId}` },
        (payload) => {
          const novo = payload.new as { status?: string };
          if (novo?.status) setStatus(novo.status);
        },
      )
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
  }, [pedidoId]);

  return status;
}
