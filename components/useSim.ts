"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { etaFrom, stepAt } from "@/lib/rota";

// Simulação da entrega (GPS suave) — reutilizada por negócio, entregador e rastreio.
// A posição ao vivo real virá do Supabase Realtime Broadcast; isto é o motor de demo.
export type Sim = ReturnType<typeof useSim>;

export function useSim() {
  const [frac, setFrac] = useState(0);
  const [running, setRunning] = useState(false);
  const [distKm, setDistKm] = useState(6.3);
  const [durMin, setDurMin] = useState(10);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const runningRef = useRef(false);

  const clear = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };

  const start = useCallback(() => {
    if (runningRef.current) return;
    runningRef.current = true;
    setRunning(true);
    setFrac(0);
    clear();
    timer.current = setInterval(() => {
      setFrac((f) => {
        const nf = Math.min(1, f + 0.009);
        if (nf >= 1) {
          clear();
          runningRef.current = false;
          setRunning(false);
        }
        return nf;
      });
    }, 150);
  }, []);

  const reset = useCallback(() => {
    clear();
    runningRef.current = false;
    setRunning(false);
    setFrac(0);
  }, []);

  const setRouteMeta = useCallback((d: number, m: number) => {
    setDistKm(d);
    setDurMin(m);
  }, []);

  useEffect(() => () => clear(), []);

  const step = stepAt(frac);
  const done = step >= 4;
  const eta = done ? { min: 0, km: "0.0" } : etaFrom(frac, distKm, durMin);

  return { frac, step, running, done, distKm, durMin, start, reset, setRouteMeta, eta };
}
