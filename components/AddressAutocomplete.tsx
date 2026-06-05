"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icons";
import { MAPBOX_TOKEN, hasMapbox } from "@/lib/mapbox";

export type Lugar = { endereco: string; lat: number; lng: number };

// Busca de endereço com autocomplete (Mapbox Geocoding), enviesada pra Palmas-TO.
// Devolve o lugar COM coordenadas — sem isso o pedido não tem lat/lng real.
export default function AddressAutocomplete({
  label,
  valor,
  onSelecionar,
  placeholder,
}: {
  label: string;
  valor: Lugar | null;
  onSelecionar: (l: Lugar | null) => void;
  placeholder?: string;
}) {
  const [texto, setTexto] = useState(valor?.endereco ?? "");
  const [sugestoes, setSugestoes] = useState<Lugar[]>([]);
  const [aberto, setAberto] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const tRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  // fecha ao clicar fora
  useEffect(() => {
    const fora = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setAberto(false); };
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, []);

  const buscar = (q: string) => {
    setTexto(q);
    onSelecionar(null); // mudou o texto → coords ainda não confirmadas
    if (tRef.current) clearTimeout(tRef.current);
    if (!hasMapbox() || q.trim().length < 3) { setSugestoes([]); setAberto(false); return; }
    setBuscando(true);
    tRef.current = setTimeout(async () => {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json` +
        `?access_token=${MAPBOX_TOKEN}&country=br&language=pt&limit=5&proximity=-48.3336,-10.1844`;
      try {
        const d = await (await fetch(url)).json();
        const sug: Lugar[] = (d.features || []).map((f: { place_name: string; center: [number, number] }) => ({
          endereco: f.place_name, lng: f.center[0], lat: f.center[1],
        }));
        setSugestoes(sug);
        setAberto(true);
      } catch {
        setSugestoes([]);
      } finally {
        setBuscando(false);
      }
    }, 350);
  };

  const escolher = (l: Lugar) => {
    setTexto(l.endereco);
    onSelecionar(l);
    setSugestoes([]);
    setAberto(false);
  };

  return (
    <div className="field" style={{ position: "relative" }} ref={boxRef}>
      <label>{label}</label>
      <div className="with-icon">
        <Icon name="pin" />
        <input
          className="input"
          value={texto}
          placeholder={placeholder ?? "Digite o endereço…"}
          autoComplete="off"
          onChange={(e) => buscar(e.target.value)}
          onFocus={() => sugestoes.length > 0 && setAberto(true)}
        />
      </div>
      {aberto && sugestoes.length > 0 && (
        <div className="ac-list">
          {sugestoes.map((s, i) => (
            <button key={i} type="button" className="ac-item" onClick={() => escolher(s)}>
              <Icon name="pin" />
              <span>{s.endereco}</span>
            </button>
          ))}
        </div>
      )}
      {valor ? (
        <div className="ac-ok"><Icon name="checkThin" /> Endereço localizado</div>
      ) : texto.trim().length >= 3 ? (
        <div className="ac-hint">{buscando ? "Buscando…" : "Selecione um endereço da lista pra confirmar o local."}</div>
      ) : null}
    </div>
  );
}
