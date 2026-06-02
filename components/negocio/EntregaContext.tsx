"use client";

import { createContext, useContext, useState } from "react";
import type { Veiculo } from "@/lib/precos";
import { useSim, type Sim } from "../useSim";

export type NegocioView = "form" | "matching" | "tracking" | "done";

type EntregaCtx = {
  veh: Veiculo;
  setVeh: (v: Veiculo) => void;
  view: NegocioView;
  setView: (v: NegocioView) => void;
} & Sim;

const Ctx = createContext<EntregaCtx | null>(null);

export function useEntrega() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useEntrega precisa estar dentro de <EntregaProvider>");
  return ctx;
}

export function EntregaProvider({ children }: { children: React.ReactNode }) {
  const [veh, setVeh] = useState<Veiculo>("moto");
  const [view, setView] = useState<NegocioView>("form");
  const sim = useSim();
  return <Ctx.Provider value={{ veh, setVeh, view, setView, ...sim }}>{children}</Ctx.Provider>;
}
