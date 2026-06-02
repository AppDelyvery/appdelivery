"use client";

import { createContext, useContext, useState } from "react";
import { useSim, type Sim } from "../useSim";

export type EntregadorView =
  | "cadastro"
  | "verificando"
  | "disponivel"
  | "coleta"
  | "rota"
  | "finalizar"
  | "concluido";

type EntregadorCtx = {
  view: EntregadorView;
  setView: (v: EntregadorView) => void;
  cnhUp: boolean;
  crlvUp: boolean;
  selfieUp: boolean;
  setCnhUp: (b: boolean) => void;
  setCrlvUp: (b: boolean) => void;
  setSelfieUp: (b: boolean) => void;
  coletaFoto: boolean;
  setColetaFoto: (b: boolean) => void;
  sigData: string | null;
  setSigData: (s: string | null) => void;
} & Sim;

const Ctx = createContext<EntregadorCtx | null>(null);

export function useEntregador() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useEntregador precisa estar dentro de <EntregadorProvider>");
  return ctx;
}

export function EntregadorProvider({ children }: { children: React.ReactNode }) {
  const [view, setView] = useState<EntregadorView>("disponivel");
  const [cnhUp, setCnhUp] = useState(false);
  const [crlvUp, setCrlvUp] = useState(false);
  const [selfieUp, setSelfieUp] = useState(false);
  const [coletaFoto, setColetaFoto] = useState(false);
  const [sigData, setSigData] = useState<string | null>(null);
  const sim = useSim();

  return (
    <Ctx.Provider
      value={{
        view,
        setView,
        cnhUp,
        crlvUp,
        selfieUp,
        setCnhUp,
        setCrlvUp,
        setSelfieUp,
        coletaFoto,
        setColetaFoto,
        sigData,
        setSigData,
        ...sim,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
