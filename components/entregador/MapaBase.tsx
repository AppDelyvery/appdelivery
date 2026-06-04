"use client";

import { useEffect, useRef } from "react";
import type { Map as MbMap, Marker as MbMarker } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MAPBOX_TOKEN, hasMapbox } from "@/lib/mapbox";
import { PALMAS } from "@/lib/rota";

export type TemaMapa = "auto" | "dia" | "noite";

const STYLE = {
  dia: "mapbox://styles/mapbox/streets-v12",
  noite: "mapbox://styles/mapbox/dark-v11",
};

// auto: dia entre 6h e 18h, senão noite (sem Date.now proibido em workflow — aqui é browser, ok)
function resolverTema(t: TemaMapa): "dia" | "noite" {
  if (t !== "auto") return t;
  const h = new Date().getHours();
  return h >= 6 && h < 18 ? "dia" : "noite";
}

// Mapa tela-cheia da home do entregador (padrão 99). Marcador da posição própria,
// troca de tema (dia/noite/auto) e recentralizar exposto via prop `recenterRef`.
export default function MapaBase({
  pos,
  tema,
  recenterRef,
}: {
  pos: [number, number] | null;
  tema: TemaMapa;
  recenterRef?: React.MutableRefObject<(() => void) | null>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MbMap | null>(null);
  const meRef = useRef<MbMarker | null>(null);
  const readyRef = useRef(false);
  const temaAplicado = useRef<string>("");

  useEffect(() => {
    if (!hasMapbox() || !containerRef.current) return;
    let cancelled = false;
    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (cancelled) return;
      mapboxgl.accessToken = MAPBOX_TOKEN;
      const efetivo = resolverTema(tema);
      temaAplicado.current = efetivo;
      const map = new mapboxgl.Map({
        container: containerRef.current!,
        style: STYLE[efetivo],
        center: pos ?? PALMAS,
        zoom: 14,
        attributionControl: false,
      });
      mapRef.current = map;
      map.on("load", () => {
        if (cancelled) return;
        readyRef.current = true;
        const el = document.createElement("div");
        el.className = "me-marker";
        meRef.current = new mapboxgl.Marker({ element: el }).setLngLat(pos ?? PALMAS).addTo(map);
      });
      if (recenterRef) {
        recenterRef.current = () => {
          const m = mapRef.current;
          const p = meRef.current?.getLngLat();
          if (m && p) m.easeTo({ center: p, zoom: 15, duration: 500 });
        };
      }
    })();
    return () => {
      cancelled = true;
      readyRef.current = false;
      mapRef.current?.remove();
      mapRef.current = null;
      meRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // move o marcador da posição própria
  useEffect(() => {
    if (!readyRef.current || !pos) return;
    meRef.current?.setLngLat(pos);
  }, [pos]);

  // troca de tema sem recriar o mapa
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !readyRef.current) return;
    const efetivo = resolverTema(tema);
    if (efetivo === temaAplicado.current) return;
    temaAplicado.current = efetivo;
    m.setStyle(STYLE[efetivo]);
  }, [tema]);

  if (!hasMapbox()) {
    return (
      <div className="map-placeholder" style={{ position: "absolute", inset: 0 }}>
        Mapa Mapbox — defina <code>NEXT_PUBLIC_MAPBOX_TOKEN</code>.
      </div>
    );
  }
  return <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />;
}
