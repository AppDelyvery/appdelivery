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

type Props = {
  frac: number;
  running: boolean;
  done: boolean;
  eta: { min: number; km: string };
  onRouteMeta?: (distKm: number, durMin: number) => void;
  /** Texto da pílula quando parado (ex.: "Rastreamento ao vivo · Palmas-TO"). */
  idleLabel?: string;
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
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MbMap | null>(null);
  const motoRef = useRef<MbMarker | null>(null);
  const routeRef = useRef<{ coords: LngLat[]; cum: number[]; total: number } | null>(null);
  const readyRef = useRef(false);

  // Mantém o callback de meta sempre atual sem re-disparar o effect de mount.
  const metaRef = useRef(onRouteMeta);
  useEffect(() => {
    metaRef.current = onRouteMeta;
  });

  useEffect(() => {
    if (!hasMapbox() || !containerRef.current) return;
    let cancelled = false;

    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      mapboxgl.accessToken = MAPBOX_TOKEN;
      const map = new mapboxgl.Map({
        container: containerRef.current!,
        style: "mapbox://styles/mapbox/streets-v12",
        center: PALMAS,
        zoom: 13.2,
      });
      mapRef.current = map;
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");

      map.on("load", async () => {
        if (cancelled) return;
        const real = await fetchDirections([ORIGEM.lng, ORIGEM.lat], [DESTINO.lng, DESTINO.lat]);
        const coords = real?.coords ?? buildRoute(ORIGEM, DESTINO);
        if (real) metaRef.current?.(real.distKm, real.durMin);
        const { cum, total } = indexRoute(coords);
        routeRef.current = { coords, cum, total };

        map.addSource("route", {
          type: "geojson",
          data: { type: "Feature", geometry: { type: "LineString", coordinates: coords }, properties: {} },
        });
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

        const pin = (p: typeof ORIGEM, cls: "o" | "d", svgInner: string) => {
          const el = document.createElement("div");
          el.className = "pt-marker " + cls;
          el.innerHTML = svgInner;
          new mapboxgl.Marker({ element: el, anchor: "bottom" })
            .setLngLat([p.lng, p.lat])
            .setPopup(new mapboxgl.Popup({ offset: 20 }).setText(p.nome))
            .addTo(map);
        };
        pin(ORIGEM, "o", SVG_PIN);
        pin(DESTINO, "d", SVG_PKG);

        const el = document.createElement("div");
        el.className = "moto-marker";
        el.innerHTML = SVG_MOTO;
        motoRef.current = new mapboxgl.Marker({ element: el }).setLngLat(coords[0]).addTo(map);

        const b = new mapboxgl.LngLatBounds();
        coords.forEach((c) => b.extend(c));
        map.fitBounds(b, { padding: 90, duration: 800 });
        readyRef.current = true;
      });
    })();

    return () => {
      cancelled = true;
      readyRef.current = false;
      mapRef.current?.remove();
      mapRef.current = null;
      motoRef.current = null;
    };
  }, []);

  // Move o motoboy conforme a fração da simulação.
  useEffect(() => {
    const r = routeRef.current;
    if (!readyRef.current || !r || !motoRef.current || !mapRef.current) return;
    const ll = posAt(r.coords, r.cum, r.total, frac);
    motoRef.current.setLngLat(ll);
    mapRef.current.easeTo({ center: ll, duration: 230 });
  }, [frac]);

  const badge = done ? "Entrega concluída" : running ? `A caminho · ${eta.min} min` : idleLabel;

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
