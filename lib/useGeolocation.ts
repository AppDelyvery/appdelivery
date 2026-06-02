"use client";

import { useEffect, useState } from "react";
import type { LngLat } from "./rota";

// GPS real do dispositivo (entregador). Alimenta o Broadcast de posição ao vivo.
// Sem permissão/suporte → pos fica null e quem consome cai no fallback (simulação).
export function useGeolocation(active: boolean) {
  const [pos, setPos] = useState<LngLat | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!active || typeof navigator === "undefined" || !navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (p) => setPos([p.coords.longitude, p.coords.latitude]),
      (e) => setErro(e.message),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [active]);

  return { pos, erro };
}
