"use client";

import { useEffect, useRef } from "react";
import type { Map as MbMap, Marker as MbMarker, GeoJSONSource } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MAPBOX_TOKEN, fetchDirections, hasMapbox } from "@/lib/mapbox";
import { PALMAS } from "@/lib/rota";

export type TemaMapa = "auto" | "dia" | "noite";

// rota da oferta a desenhar (coleta + entrega opcional)
export type RotaOferta = {
  coletaLat: number;
  coletaLng: number;
  entregaLat: number | null;
  entregaLng: number | null;
} | null;

const STYLE = {
  dia: "mapbox://styles/mapbox/streets-v12",
  noite: "mapbox://styles/mapbox/dark-v11",
};

const SVG_PIN =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>';
const SVG_PKG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8l-9-5-9 5v8l9 5 9-5z"/><path d="M3.3 7L12 12l8.7-5M12 22V12"/></svg>';

// auto: dia entre 6h e 18h, senão noite (sem Date.now proibido em workflow — aqui é browser, ok)
function resolverTema(t: TemaMapa): "dia" | "noite" {
  if (t !== "auto") return t;
  const h = new Date().getHours();
  return h >= 6 && h < 18 ? "dia" : "noite";
}

// Mapa tela-cheia da home do entregador (padrão 99). Marcador da posição própria,
// troca de tema (dia/noite/auto), recentralizar via prop, e a rota da oferta quando há uma.
export default function MapaBase({
  pos,
  tema,
  recenterRef,
  oferta = null,
}: {
  pos: [number, number] | null;
  tema: TemaMapa;
  recenterRef?: React.MutableRefObject<(() => void) | null>;
  oferta?: RotaOferta;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MbMap | null>(null);
  const mbglRef = useRef<typeof import("mapbox-gl").default | null>(null);
  const meRef = useRef<MbMarker | null>(null);
  const ofMarkersRef = useRef<MbMarker[]>([]);
  const readyRef = useRef(false);
  const temaAplicado = useRef<string>("");
  const posRef = useRef(pos);
  useEffect(() => { posRef.current = pos; });

  useEffect(() => {
    if (!hasMapbox() || !containerRef.current) return;
    let cancelled = false;
    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (cancelled) return;
      mbglRef.current = mapboxgl;
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
      ofMarkersRef.current = [];
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

  // rota da oferta: minha posição -> coleta (pontilhado) + coleta -> entrega (verde)
  useEffect(() => {
    const map = mapRef.current;
    const mbgl = mbglRef.current;
    if (!map || !mbgl || !readyRef.current) return;
    let cancelado = false;

    const setLinha = (id: string, coords: [number, number][], cor: string, tracejado: boolean) => {
      const data = { type: "Feature" as const, geometry: { type: "LineString" as const, coordinates: coords }, properties: {} };
      const src = map.getSource(id) as GeoJSONSource | undefined;
      if (src) { src.setData(data); return; }
      map.addSource(id, { type: "geojson", data });
      map.addLayer({ id: id + "-bg", type: "line", source: id, paint: { "line-color": "#fff", "line-width": 8, "line-opacity": 0.85 }, layout: { "line-cap": "round", "line-join": "round" } });
      map.addLayer({ id, type: "line", source: id, paint: { "line-color": cor, "line-width": 5, ...(tracejado ? { "line-dasharray": [1.4, 1.1] } : {}) }, layout: { "line-cap": "round", "line-join": "round" } });
    };
    const limpar = () => {
      ofMarkersRef.current.forEach((m) => m.remove());
      ofMarkersRef.current = [];
      for (const id of ["of-busca", "of-entrega"]) {
        const src = map.getSource(id) as GeoJSONSource | undefined;
        if (src) src.setData({ type: "Feature", geometry: { type: "LineString", coordinates: [] }, properties: {} });
      }
    };

    if (!oferta) { limpar(); return; }

    (async () => {
      const cl: [number, number] = [oferta.coletaLng, oferta.coletaLat];
      const en: [number, number] | null =
        oferta.entregaLat != null && oferta.entregaLng != null ? [oferta.entregaLng, oferta.entregaLat] : null;
      const meu = posRef.current;

      let busca: [number, number][] = meu ? [meu, cl] : [];
      if (meu) { const r = await fetchDirections(meu, cl); if (r?.coords) busca = r.coords; }
      let entrega: [number, number][] = en ? [cl, en] : [];
      if (en) { const r = await fetchDirections(cl, en); if (r?.coords) entrega = r.coords; }
      if (cancelado) return;

      limpar();
      if (busca.length > 1) setLinha("of-busca", busca, "#4f46e5", true);
      if (entrega.length > 1) setLinha("of-entrega", entrega, "#059669", false);

      const pin = (p: [number, number], cls: "o" | "d", svg: string) => {
        const el = document.createElement("div");
        el.className = "pt-marker " + cls;
        el.innerHTML = svg;
        ofMarkersRef.current.push(new mbgl.Marker({ element: el, anchor: "bottom" }).setLngLat(p).addTo(map));
      };
      pin(cl, "o", SVG_PIN);
      if (en) pin(en, "d", SVG_PKG);

      const b = new mbgl.LngLatBounds();
      if (meu) b.extend(meu);
      b.extend(cl);
      if (en) b.extend(en);
      map.fitBounds(b, { padding: 70, duration: 600, maxZoom: 15 });
    })();

    return () => { cancelado = true; };
  }, [oferta?.coletaLat, oferta?.coletaLng, oferta?.entregaLat, oferta?.entregaLng]);

  if (!hasMapbox()) {
    return (
      <div className="map-placeholder" style={{ position: "absolute", inset: 0 }}>
        Mapa Mapbox — defina <code>NEXT_PUBLIC_MAPBOX_TOKEN</code>.
      </div>
    );
  }
  return <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />;
}
