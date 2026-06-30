"use client";

import { useEffect, useState } from "react";
import { getBrowserSupabase } from "./supabase/browser";

// Detector de status REAL do entregador: não é só o toggle "online", é se o sistema
// está de fato recebendo — rede (navigator.onLine) + backend alcançável (heartbeat) +
// GPS fresco + disponibilidade. Assim o entregador sabe se vai receber corrida mesmo.
export type NivelStatus = "conectado" | "instavel" | "offline";
export type StatusSistema = { nivel: NivelStatus; texto: string; detalhe: string };

const GPS_MAX_S = 90; // GPS mais velho que isso = instável

export function useStatusSistema(online: boolean, gps: [number, number] | null): StatusSistema {
  const [rede, setRede] = useState(true);
  const [backendOk, setBackendOk] = useState(true);
  const [gpsAt, setGpsAt] = useState<number | null>(null);
  const [, tick] = useState(0);

  useEffect(() => { setRede(typeof navigator !== "undefined" ? navigator.onLine : true); }, []);

  // rede do navegador
  useEffect(() => {
    const on = () => setRede(true);
    const off = () => setRede(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  // marca quando o GPS chegou (frescor)
  useEffect(() => { if (gps) setGpsAt(Date.now()); }, [gps?.[0], gps?.[1]]);

  // heartbeat: confirma que o backend responde (e a sessão é válida). Tick recalcula idade do GPS.
  useEffect(() => {
    let vivo = true;
    const ping = async () => {
      const sb = getBrowserSupabase();
      if (!sb) return;
      try {
        const { error } = await sb.from("entregadores").select("id").limit(1);
        if (vivo) setBackendOk(!error);
      } catch {
        if (vivo) setBackendOk(false);
      }
    };
    ping();
    const t = setInterval(() => { ping(); tick((x) => x + 1); }, 8000);
    return () => { vivo = false; clearInterval(t); };
  }, []);

  const gpsIdade = gpsAt ? (Date.now() - gpsAt) / 1000 : Infinity;

  if (!online) return { nivel: "offline", texto: "Você está offline", detalhe: "Toque em Conectar pra receber corridas." };
  if (!rede || !backendOk) return { nivel: "offline", texto: "Sem conexão", detalhe: "Sua internet caiu — você não vai receber corridas." };
  if (gpsIdade > GPS_MAX_S) return { nivel: "instavel", texto: "GPS desatualizado", detalhe: "Reative a localização — as corridas usam sua posição." };
  return { nivel: "conectado", texto: "Sistema online", detalhe: "Conectado e recebendo corridas da sua região." };
}
