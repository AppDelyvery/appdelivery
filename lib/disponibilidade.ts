"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getBrowserSupabase } from "./supabase/browser";
import type { LngLat } from "./rota";

// Estado Online/Offline do entregador (Conectar/Desconectar, padrão 99).
// Reflete entregadores.is_online; liga/desliga via RPC definir_disponibilidade.
export function useDisponibilidade() {
  const [online, setOnline] = useState(false);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // lê o estado atual ao montar
  useEffect(() => {
    (async () => {
      const sb = getBrowserSupabase();
      if (!sb) return;
      const { data } = await sb.from("entregadores").select("is_online").limit(1).maybeSingle();
      if (data) setOnline(!!(data as { is_online?: boolean }).is_online);
    })();
  }, []);

  const alternar = useCallback(async (proximo: boolean, pos: LngLat | null) => {
    const sb = getBrowserSupabase();
    if (!sb) return;
    setBusy(true);
    setErro(null);
    const { error } = await sb.rpc("definir_disponibilidade", {
      p_online: proximo,
      p_lng: pos?.[0] ?? null,
      p_lat: pos?.[1] ?? null,
    });
    setBusy(false);
    if (error) {
      setErro(error.message.includes("aprovado") ? "Seu cadastro ainda não foi aprovado." : error.message);
      return;
    }
    setOnline(proximo);
  }, []);

  return { online, busy, erro, alternar };
}

// Envia posição enquanto online (best-effort, ignora erro).
export function useAtualizarPosicao(online: boolean, pos: LngLat | null) {
  // 1) ao MUDAR a posição (entregador em movimento)
  useEffect(() => {
    if (!online || !pos) return;
    const sb = getBrowserSupabase();
    if (!sb) return;
    void sb.rpc("atualizar_minha_posicao", { p_lng: pos[0], p_lat: pos[1] });
  }, [online, pos]);

  // 2) HEARTBEAT: reenvia a última posição a cada 45s mesmo PARADO. Sem isso, quando o
  // entregador não se move o GPS do navegador não dispara nova leitura, ultima_posicao_at
  // envelhece e o filtro de frescor do despacho (3 min) o derruba indevidamente.
  const posRef = useRef(pos);
  useEffect(() => { posRef.current = pos; });
  useEffect(() => {
    if (!online) return;
    const sb = getBrowserSupabase();
    if (!sb) return;
    const t = setInterval(() => {
      const p = posRef.current;
      if (p) void sb.rpc("atualizar_minha_posicao", { p_lng: p[0], p_lat: p[1] });
    }, 45000);
    return () => clearInterval(t);
  }, [online]);
}
