"use client";

import { useEffect } from "react";

type Sentinela = { release: () => Promise<void>; addEventListener: (t: "release", cb: () => void) => void };
type NavWL = Navigator & { wakeLock?: { request: (t: "screen") => Promise<Sentinela> } };

// Mantém a tela acesa (Screen Wake Lock API) enquanto `ativo`. Reativa ao voltar o foco —
// o SO libera o lock quando o app/aba sai de vista. Suportado no PWA instalado (iOS 16.4+);
// no-op silencioso onde não há suporte ou a permissão é negada.
export function useWakeLock(ativo: boolean) {
  useEffect(() => {
    if (!ativo || typeof navigator === "undefined") return;
    const nav = navigator as NavWL;
    if (!nav.wakeLock) return;
    let sentinela: Sentinela | null = null;
    let vivo = true;

    const pedir = async () => {
      if (!vivo || sentinela || (typeof document !== "undefined" && document.visibilityState !== "visible")) return;
      try {
        sentinela = await nav.wakeLock!.request("screen");
        sentinela.addEventListener("release", () => { sentinela = null; });
      } catch {
        /* negado / sem suporte / pouca energia — segue sem travar a tela */
      }
    };
    const aoVoltar = () => { if (document.visibilityState === "visible") pedir(); };

    pedir();
    document.addEventListener("visibilitychange", aoVoltar);
    // heartbeat: o iOS solta o lock sozinho (tempo / pouca energia) mesmo com a página
    // visível — sem isso a tela voltava a apagar. Repõe enquanto estiver ativo.
    const hb = setInterval(pedir, 10000);
    return () => {
      vivo = false;
      clearInterval(hb);
      document.removeEventListener("visibilitychange", aoVoltar);
      sentinela?.release().catch(() => {});
      sentinela = null;
    };
  }, [ativo]);
}
