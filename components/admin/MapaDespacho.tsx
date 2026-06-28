"use client";

import { useEffect, useRef } from "react";
import type { Map as MbMap, Marker as MbMarker } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MAPBOX_TOKEN, hasMapbox } from "@/lib/mapbox";
import { PALMAS } from "@/lib/rota";

export type EntregadorMapa = {
  id: string;
  nome: string;
  vehicle_type: string;
  status: string;
  lng: number;
  lat: number;
  em_corrida: boolean;
};
export type CorridaMapa = {
  id: string;
  status: string;
  coleta_endereco: string;
  coleta_lat: number;
  coleta_lng: number;
  entrega_endereco: string;
  entrega_lat: number;
  entrega_lng: number;
  entregador_nome: string | null;
  negocio: string | null;
  preco_total?: number | null;
  em_risco?: boolean;
  risco_motivo?: string | null;
};

const SVG_MOTO =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="17" r="3"/><circle cx="19" cy="17" r="3"/><path d="M8 17h6l3-5h-3.5l-2-3H7"/><path d="M14 7h3"/></svg>';
const SVG_PIN =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>';
const SVG_PKG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8l-9-5-9 5v8l9 5 9-5z"/><path d="M3.3 7L12 12l8.7-5M12 22V12"/></svg>';

export default function MapaDespacho({
  entregadores,
  corridas,
}: {
  entregadores: EntregadorMapa[];
  corridas: CorridaMapa[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MbMap | null>(null);
  const readyRef = useRef(false);
  const fitDoneRef = useRef(false);
  // chave -> marker; chave inclui o tipo p/ não colidir id de entregador com corrida
  const markersRef = useRef<Map<string, MbMarker>>(new Map());
  const mbglRef = useRef<typeof import("mapbox-gl")["default"] | null>(null);
  // snapshot dos dados pra sincronizar assim que o mapa terminar de carregar
  const dataRef = useRef({ entregadores, corridas });
  dataRef.current = { entregadores, corridas };

  useEffect(() => {
    if (!hasMapbox() || !containerRef.current) return;
    let cancelled = false;

    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (cancelled) return;
      mbglRef.current = mapboxgl;
      mapboxgl.accessToken = MAPBOX_TOKEN;
      const map = new mapboxgl.Map({
        container: containerRef.current!,
        style: "mapbox://styles/mapbox/streets-v12",
        center: PALMAS,
        zoom: 12,
      });
      mapRef.current = map;
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");
      map.on("load", () => {
        if (cancelled) return;
        readyRef.current = true;
        sync(dataRef.current.entregadores, dataRef.current.corridas);
      });
    })();

    return () => {
      cancelled = true;
      readyRef.current = false;
      fitDoneRef.current = false;
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sincroniza marcadores quando os dados mudam.
  useEffect(() => {
    if (!readyRef.current) return;
    sync(entregadores, corridas);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entregadores, corridas]);

  function sync(ents: EntregadorMapa[], cors: CorridaMapa[]) {
    const map = mapRef.current;
    const mapboxgl = mbglRef.current;
    if (!map || !mapboxgl) return;
    const markers = markersRef.current;
    const vivos = new Set<string>();

    const upsert = (key: string, lng: number, lat: number, cls: string, svg: string, popup: string) => {
      vivos.add(key);
      const existing = markers.get(key);
      if (existing) {
        existing.setLngLat([lng, lat]);
        return;
      }
      const el = document.createElement("div");
      el.className = cls;
      el.innerHTML = svg;
      const mk = new mapboxgl.Marker({ element: el, anchor: cls === "moto-marker" ? "center" : "bottom" })
        .setLngLat([lng, lat])
        .setPopup(new mapboxgl.Popup({ offset: 18 }).setHTML(popup))
        .addTo(map);
      markers.set(key, mk);
    };

    for (const e of ents) {
      if (e.lng == null || e.lat == null) continue;
      upsert(
        `e:${e.id}`,
        e.lng,
        e.lat,
        "moto-marker",
        SVG_MOTO,
        `<b>${esc(e.nome)}</b><br>${esc(e.vehicle_type)} · ${e.em_corrida ? "em corrida" : "livre"}`,
      );
    }
    for (const c of cors) {
      upsert(
        `co:${c.id}`,
        c.coleta_lng,
        c.coleta_lat,
        "pt-marker o",
        SVG_PIN,
        `<b>Coleta</b><br>${esc(c.coleta_endereco)}<br>${esc(c.negocio ?? "")}`,
      );
      upsert(
        `cd:${c.id}`,
        c.entrega_lng,
        c.entrega_lat,
        "pt-marker d",
        SVG_PKG,
        `<b>Entrega</b><br>${esc(c.entrega_endereco)}<br>${c.entregador_nome ? esc(c.entregador_nome) : "sem entregador"}`,
      );
    }

    // remove marcadores que sumiram
    for (const [key, mk] of markers) {
      if (!vivos.has(key)) {
        mk.remove();
        markers.delete(key);
      }
    }

    // enquadra uma vez quando há pontos
    if (!fitDoneRef.current && vivos.size > 0) {
      const b = new mapboxgl.LngLatBounds();
      ents.forEach((e) => e.lng != null && b.extend([e.lng, e.lat]));
      cors.forEach((c) => {
        b.extend([c.coleta_lng, c.coleta_lat]);
        b.extend([c.entrega_lng, c.entrega_lat]);
      });
      if (!b.isEmpty()) {
        map.fitBounds(b, { padding: 70, maxZoom: 14, duration: 600 });
        fitDoneRef.current = true;
      }
    }
  }

  if (!hasMapbox()) {
    return (
      <div id="despacho-map" style={{ height: 420 }}>
        <div className="map-placeholder">
          Mapa Mapbox — defina <code>NEXT_PUBLIC_MAPBOX_TOKEN</code> no <code>.env.local</code>.
        </div>
      </div>
    );
  }

  // id próprio (não "map"): o admin roda com .content.no-map, que esconde #map global
  return <div id="despacho-map" ref={containerRef} style={{ height: 420, borderRadius: 14 }} />;
}

const esc = (s: string) => (s ?? "").replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]!));
