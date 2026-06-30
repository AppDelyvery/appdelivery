"use client";

import { useEffect, useRef } from "react";
import type { Map as MbMap, Marker as MbMarker } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MAPBOX_TOKEN, fetchDirections, hasMapbox } from "@/lib/mapbox";
import {
  buildRoute,
  DESTINO,
  indexRoute,
  ORIGEM,
  PALMAS,
  posAt,
  type LngLat,
} from "@/lib/rota";

type Ponto = { lng: number; lat: number } | null;

type Props = {
  frac: number;
  running: boolean;
  done: boolean;
  eta: { min: number; km: string };
  onRouteMeta?: (distKm: number, durMin: number) => void;
  /** Texto da pílula quando parado (ex.: "Rastreamento ao vivo · Palmas-TO"). */
  idleLabel?: string;
  /** Posição real [lng,lat] do entregador (GPS via Realtime). Sobrepõe a simulação quando presente. */
  posicaoReal?: [number, number] | null;
  /** Modo prévia: desenha a rota coleta→entrega REAL (sem motoboy animado), reagindo às escolhas. */
  preview?: boolean;
  /** Coleta (negócio) no modo prévia. */
  origem?: Ponto;
  /** Entrega (destino) no modo prévia. */
  destino?: Ponto;
};

// SVGs crus p/ os marcadores DOM do Mapbox (zero emoji).
const SVG_MOTO =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="17" r="3"/><circle cx="19" cy="17" r="3"/><path d="M8 17h6l3-5h-3.5l-2-3H7"/><path d="M14 7h3"/></svg>';
const SVG_PIN =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>';
const SVG_PKG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8l-9-5-9 5v8l9 5 9-5z"/><path d="M3.3 7L12 12l8.7-5M12 22V12"/></svg>';

export default function MapaAoVivo({
  frac,
  running,
  done,
  eta,
  onRouteMeta,
  idleLabel = "Rastreamento ao vivo · Palmas-TO",
  posicaoReal,
  preview = false,
  origem,
  destino,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MbMap | null>(null);
  const mbglRef = useRef<typeof import("mapbox-gl").default | null>(null);
  const motoRef = useRef<MbMarker | null>(null);
  const pinsRef = useRef<MbMarker[]>([]);
  const routeRef = useRef<{ coords: LngLat[]; cum: number[]; total: number } | null>(null);
  const readyRef = useRef(false);

  // Props sempre atuais p/ o desenho assíncrono, sem re-disparar o mount.
  const metaRef = useRef(onRouteMeta);
  const odRef = useRef({ preview, origem, destino });
  useEffect(() => {
    metaRef.current = onRouteMeta;
    odRef.current = { preview, origem, destino };
  });

  // (Re)desenha a rota e os pontos conforme o modo atual.
  async function desenhar() {
    const map = mapRef.current;
    const mbgl = mbglRef.current;
    if (!map || !mbgl) return;
    const { preview: pv, origem: o, destino: d } = odRef.current;
    const O: Ponto = pv ? o ?? null : { lng: ORIGEM.lng, lat: ORIGEM.lat };
    const D: Ponto = pv ? d ?? null : { lng: DESTINO.lng, lat: DESTINO.lat };

    // limpa pontos antigos (redesenho)
    pinsRef.current.forEach((m) => m.remove());
    pinsRef.current = [];

    let coords: LngLat[] = [];
    if (O && D) {
      const real = await fetchDirections([O.lng, O.lat], [D.lng, D.lat]);
      coords = real?.coords ?? (pv ? [[O.lng, O.lat], [D.lng, D.lat]] : buildRoute(ORIGEM, DESTINO));
      if (real && !pv) metaRef.current?.(real.distKm, real.durMin);
    } else if (O) {
      coords = [[O.lng, O.lat]];
    }

    // fonte/linha da rota (linha só com 2+ pontos)
    const lineData = {
      type: "Feature" as const,
      geometry: { type: "LineString" as const, coordinates: coords.length > 1 ? coords : [] },
      properties: {},
    };
    const src = map.getSource("route") as import("mapbox-gl").GeoJSONSource | undefined;
    if (src) {
      src.setData(lineData);
    } else {
      map.addSource("route", { type: "geojson", data: lineData });
      map.addLayer({
        id: "route-bg",
        type: "line",
        source: "route",
        paint: { "line-color": "#fff", "line-width": 10, "line-opacity": 0.95 },
        layout: { "line-cap": "round", "line-join": "round" },
      });
      map.addLayer({
        id: "route",
        type: "line",
        source: "route",
        paint: { "line-color": "#4f46e5", "line-width": 5 },
        layout: { "line-cap": "round", "line-join": "round" },
      });
    }

    const pin = (p: Ponto, cls: "o" | "d", svgInner: string, nome: string) => {
      if (!p) return;
      const el = document.createElement("div");
      el.className = "pt-marker " + cls;
      el.innerHTML = svgInner;
      pinsRef.current.push(
        new mbgl.Marker({ element: el, anchor: "bottom" })
          .setLngLat([p.lng, p.lat])
          .setPopup(new mbgl.Popup({ offset: 20 }).setText(nome))
          .addTo(map),
      );
    };
    pin(O, "o", SVG_PIN, pv ? "Coleta — seu negócio" : ORIGEM.nome);
    pin(D, "d", SVG_PKG, pv ? "Entrega" : DESTINO.nome);

    if (pv) {
      // prévia: sem motoboy animado
      motoRef.current?.remove();
      motoRef.current = null;
      routeRef.current = null;
    } else {
      const { cum, total } = indexRoute(coords);
      routeRef.current = { coords, cum, total };
      const el = document.createElement("div");
      el.className = "moto-marker";
      el.innerHTML = SVG_MOTO;
      motoRef.current = new mbgl.Marker({ element: el }).setLngLat(coords[0]).addTo(map);
    }

    // enquadra
    if (coords.length > 1) {
      const b = new mbgl.LngLatBounds();
      coords.forEach((c) => b.extend(c));
      map.fitBounds(b, { padding: 70, duration: 700 });
    } else if (O) {
      map.easeTo({ center: [O.lng, O.lat], zoom: 14, duration: 500 });
    }
    readyRef.current = true;
  }

  useEffect(() => {
    if (!hasMapbox() || !containerRef.current) return;
    let cancelled = false;

    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (cancelled) return;
      mbglRef.current = mapboxgl;
      mapboxgl.accessToken = MAPBOX_TOKEN;
      const start = odRef.current.preview && odRef.current.origem
        ? ([odRef.current.origem.lng, odRef.current.origem.lat] as [number, number])
        : PALMAS;
      const map = new mapboxgl.Map({
        container: containerRef.current!,
        style: "mapbox://styles/mapbox/streets-v12",
        center: start,
        zoom: 13.2,
      });
      mapRef.current = map;
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");
      map.on("load", () => {
        if (!cancelled) desenhar();
      });
    })();

    return () => {
      cancelled = true;
      readyRef.current = false;
      mapRef.current?.remove();
      mapRef.current = null;
      motoRef.current = null;
      pinsRef.current = [];
    };
  }, []);

  // Modo prévia: redesenha quando a coleta/entrega mudam.
  useEffect(() => {
    if (!preview || !readyRef.current) return;
    desenhar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview, origem?.lng, origem?.lat, destino?.lng, destino?.lat]);

  // Move o motoboy (só rastreamento): posição real (GPS) se houver; senão a simulação.
  useEffect(() => {
    if (preview) return;
    const r = routeRef.current;
    if (!readyRef.current || !r || !motoRef.current || !mapRef.current) return;
    const ll: LngLat = posicaoReal ?? posAt(r.coords, r.cum, r.total, frac);
    motoRef.current.setLngLat(ll);
    mapRef.current.easeTo({ center: ll, duration: 230 });
  }, [frac, posicaoReal, preview]);

  const badge = preview
    ? (origem && destino ? "Rota da entrega · Palmas-TO" : idleLabel)
    : done ? "Entrega concluída" : running ? `A caminho · ${eta.min} min` : idleLabel;

  return (
    <div id="map" ref={containerRef}>
      {hasMapbox() ? (
        <div className="map-badge">
          <span className="pulse-dot" /> <span>{badge}</span>
        </div>
      ) : (
        <div className="map-placeholder">
          Mapa Mapbox — defina <code>NEXT_PUBLIC_MAPBOX_TOKEN</code>
          <br />
          no <code>.env.local</code> para o rastreamento ao vivo.
        </div>
      )}
    </div>
  );
}
