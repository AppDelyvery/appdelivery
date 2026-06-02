"use client";

import { useCallback, useEffect, useState } from "react";
import { getBrowserSupabase } from "./supabase/browser";

export type Msg = { autor_papel: string; texto: string; created_at: string };
export type Papel = "estabelecimento" | "entregador" | "cliente_final";

// Lojista/entregador (autenticado) — lê/escreve na thread do pedido (RLS de parte). Polling 4s.
export function useChatAuth(pedidoId: string | null, meuPapel: Papel) {
  const [msgs, setMsgs] = useState<Msg[]>([]);

  const carregar = useCallback(async () => {
    const sb = getBrowserSupabase();
    if (!sb || !pedidoId) return;
    const { data } = await sb
      .from("mensagens")
      .select("autor_papel,texto,created_at")
      .eq("pedido_id", pedidoId)
      .order("created_at");
    if (data) setMsgs(data as Msg[]);
  }, [pedidoId]);

  useEffect(() => {
    // polling: setState ocorre após o await do fetch (assíncrono, sem cascata) — padrão intencional
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregar();
    const t = setInterval(carregar, 4000);
    return () => clearInterval(t);
  }, [carregar]);

  const enviar = useCallback(
    async (texto: string) => {
      const sb = getBrowserSupabase();
      if (!sb || !pedidoId || !texto.trim()) return;
      await sb.from("mensagens").insert({ pedido_id: pedidoId, autor_papel: meuPapel, texto: texto.trim() });
      await carregar();
    },
    [pedidoId, meuPapel, carregar],
  );

  return { msgs, enviar, meuPapel };
}

// Cliente final (sem login) — lê/escreve pelo token do rastreio via funções SECURITY DEFINER. Polling 4s.
export function useChatPublico(token: string | null) {
  const [msgs, setMsgs] = useState<Msg[]>([]);

  const carregar = useCallback(async () => {
    const sb = getBrowserSupabase();
    if (!sb || !token) return;
    const { data } = await sb.rpc("ler_mensagens_rastreio", { p_token: token });
    if (data) setMsgs(data as Msg[]);
  }, [token]);

  useEffect(() => {
    // polling: setState ocorre após o await do fetch (assíncrono, sem cascata) — padrão intencional
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregar();
    const t = setInterval(carregar, 4000);
    return () => clearInterval(t);
  }, [carregar]);

  const enviar = useCallback(
    async (texto: string) => {
      const sb = getBrowserSupabase();
      if (!sb || !token || !texto.trim()) return;
      await sb.rpc("enviar_mensagem_rastreio", { p_token: token, p_texto: texto.trim() });
      await carregar();
    },
    [token, carregar],
  );

  return { msgs, enviar, meuPapel: "cliente_final" as Papel };
}
