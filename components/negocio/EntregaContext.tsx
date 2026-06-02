"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { Veiculo } from "@/lib/precos";
import { etaFrom, stepAt } from "@/lib/rota";

export type NegocioView = "form" | "matching" | "tracking" | "done";

type EntregaCtx = {
  veh: Veiculo;
  setVeh: (v: Veiculo) => void;
  view: NegocioView;
  setView: (v: NegocioView) => void;
  frac: number;
  step: number;
  running: boolean;
  done: boolean;
  distKm: number;
  durMin: number;
  /** O mapa reporta a distância/duração reais após a Directions. */
  setRouteMeta: (distKm: number, durMin: number) => void;
  start: () => void;
  reset: () => void;
  eta: { min: number; km: string };
};

const Ctx = createContext<EntregaCtx | null>(null);

export function useEntrega() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useEntrega precisa estar dentro de <EntregaProvider>");
  return ctx;
}

export function EntregaProvider({ children }: { children: React.ReactNode }) {
  const [veh, setVeh] = useState<Veiculo>("moto");
  const [view, setView] = useState<NegocioView>("form");
  const [frac, setFrac] = useState(0);
  const [running, setRunning] = useState(false);
  const [distKm, setDistKm] = useState(6.3);
  const [durMin, setDurMin] = useState(10);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const clear = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };

  const start = useCallback(() => {
    if (running) return;
    setRunning(true);
    setFrac(0);
    clear();
    timer.current = setInterval(() => {
      setFrac((f) => {
        const nf = Math.min(1, f + 0.009);
        if (nf >= 1) {
          clear();
          setRunning(false);
        }
        return nf;
      });
    }, 150);
  }, [running]);

  const reset = useCallback(() => {
    clear();
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

  return (
    <Ctx.Provider
      value={{ veh, setVeh, view, setView, frac, step, running, done, distKm, durMin, setRouteMeta, start, reset, eta }}
    >
      {children}
    </Ctx.Provider>
  );
}
