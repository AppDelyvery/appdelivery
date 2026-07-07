"use client";

import { useEffect, useRef } from "react";
import type { Map as MbMap, Marker as MbMarker, GeoJSONSource } from "mapbox-gl";
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
  /** Corrida do entregador: desenha 2 pernas (busca→coleta e coleta→entrega) e alterna
   *  o destaque por fase. "busca" = indo pegar; "entrega" = já coletou, indo entregar. */
  fase?: "busca" | "entrega";
};

// SVGs crus p/ os marcadores DOM do Mapbox (zero emoji).
const SVG_MOTO =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="17" r="3"/><circle cx="19" cy="17" r="3"/><path d="M8 17h6l3-5h-3.5l-2-3H7"/><path d="M14 7h3"/></svg>';
const SVG_PIN =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>';
const SVG_PKG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8l-9-5-9 5v8l9 5 9-5z"/><path d="M3.3 7L12 12l8.7-5M12 22V12"/></svg>';

// distância em metros entre 2 pontos [lng,lat] — pra throttle da rota de busca
function distM(a: [number, number], b: [number, number]): number {
  const R = 6371000, rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b[1] - a[1]), dLng = rad(b[0] - a[0]);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

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
  fase,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MbMap | null>(null);
  const mbglRef = useRef<typeof import("mapbox-gl").default | null>(null);
  const motoRef = useRef<MbMarker | null>(null);
  const pinsRef = useRef<MbMarker[]>([]);
  const routeRef = useRef<{ coords: LngLat[]; cum: number[]; total: number } | null>(null);
  const readyRef = useRef(false);
  const buscaFetchRef = useRef<[number, number] | null>(null); // última posição usada na rota de busca
  const buscaBusyRef = useRef(false);

  // Props sempre atuais p/ o desenho assíncrono, sem re-disparar o mount.
  const metaRef = useRef(onRouteMeta);
  const odRef = useRef({ preview, origem, destino, fase });
  const posRealRef = useRef(posicaoReal);
  useEffect(() => {
    metaRef.current = onRouteMeta;
    odRef.current = { preview, origem, destino, fase };
    posRealRef.current = posicaoReal;
  });

  // Corrida do entregador: 2 pernas (busca = motoboy→coleta, entrega = coleta→destino),
  // com o destaque alternando por fase. Isolado — só roda quando `fase` está setada.
  async function desenharFases() {
    const map = mapRef.current;
    const mbgl = mbglRef.current;
    if (!map || !mbgl) return;
    const { origem: o, destino: d, fase: f } = odRef.current;
    if (!o || !d) return;
    const meu = posRealRef.current;

    pinsRef.current.forEach((m) => m.remove());
    pinsRef.current = [];
    // limpa a rota do modo não-fase, se existir (evita linha sobrando)
    const rsrc = map.getSource("route") as GeoJSONSource | undefined;
    if (rsrc) rsrc.setData({ type: "Feature", geometry: { type: "LineString", coordinates: [] }, properties: {} });

    const real = await fetchDirections([o.lng, o.lat], [d.lng, d.lat]);
    const entregaCoords: LngLat[] = real?.coords ?? [[o.lng, o.lat], [d.lng, d.lat]];
    if (real) metaRef.current?.(real.distKm, real.durMin);
    let buscaCoords: LngLat[] = [];
    if (meu) {
      const rb = await fetchDirections(meu, [o.lng, o.lat]);
      buscaCoords = rb?.coords ?? [meu, [o.lng, o.lat]];
      buscaFetchRef.current = meu;
    }
    const ehBusca = f === "busca";

    const setLeg = (id: string, coords: LngLat[], cor: string, largura: number, op: number, visivel: boolean) => {
      const data = { type: "Feature" as const, geometry: { type: "LineString" as const, coordinates: visivel && coords.length > 1 ? coords : [] }, properties: {} };
      const src = map.getSource(id) as GeoJSONSource | undefined;
      if (src) src.setData(data);
      else map.addSource(id, { type: "geojson", data });
      if (!map.getLayer(id)) {
        map.addLayer({ id, type: "line", source: id, paint: { "line-color": cor, "line-width": largura, "line-opacity": op }, layout: { "line-cap": "round", "line-join": "round" } });
      } else {
        map.setPaintProperty(id, "line-color", cor);
        map.setPaintProperty(id, "line-width", largura);
        map.setPaintProperty(id, "line-opacity", op);
      }
    };
    // entrega entra primeiro (fica embaixo); busca por cima. Destaque alterna por fase.
    setLeg("leg-entrega", entregaCoords, ehBusca ? "#9aa3b2" : "#059669", ehBusca ? 4 : 6, ehBusca ? 0.85 : 1, true);
    setLeg("leg-busca", buscaCoords, "#4f46e5", 6, 1, ehBusca);

    const fpin = (p: { lng: number; lat: number }, cls: "o" | "d", svg: string, nome: string) => {
      const el = document.createElement("div");
      el.className = "pt-marker " + cls;
      el.innerHTML = svg;
      pinsRef.current.push(new mbgl.Marker({ element: el, anchor: "bottom" }).setLngLat([p.lng, p.lat]).setPopup(new mbgl.Popup({ offset: 20 }).setText(nome)).addTo(map));
    };
    fpin(o, "o", SVG_PIN, "Coleta");
    fpin(d, "d", SVG_PKG, "Entrega");

    routeRef.current = null;
    const b = new mbgl.LngLatBounds();
    if (meu) b.extend(meu);
    b.extend([o.lng, o.lat]);
    b.extend([d.lng, d.lat]);
    map.fitBounds(b, { padding: 70, duration: 600, maxZoom: 15 });
    readyRef.current = true;
  }

  // (Re)desenha a rota e os pontos conforme o modo atual.
  async function desenhar() {
    const map = mapRef.current;
    const mbgl = mbglRef.current;
    if (!map || !mbgl) return;
    if (odRef.current.fase) { await desenharFases(); return; }
    // saiu do modo corrida (ou nunca entrou): limpa as pernas de fase pra não sobrar rota fantasma
    for (const id of ["leg-busca", "leg-entrega"]) {
      const s = map.getSource(id) as GeoJSONSource | undefined;
      if (s) s.setData({ type: "Feature", geometry: { type: "LineString", coordinates: [] }, properties: {} });
    }
    const { preview: pv, origem: o, destino: d } = odRef.current;
    const provided = !!(o || d); // coords reais do pedido vieram por prop
    const O: Ponto = o ?? (pv ? null : { lng: ORIGEM.lng, lat: ORIGEM.lat });
    const D: Ponto = d ?? (pv ? null : { lng: DESTINO.lng, lat: DESTINO.lat });

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

    if (!pv && !provided) {
      // demo puro: motoboy animado por frac ao longo da rota fixa
      const { cum, total } = indexRoute(coords);
      routeRef.current = { coords, cum, total };
      const el = document.createElement("div");
      el.className = "moto-marker";
      el.innerHTML = SVG_MOTO;
      motoRef.current = new mbgl.Marker({ element: el }).setLngLat(coords[0]).addTo(map);
    } else {
      // prévia ou rastreamento REAL: sem motoboy simulado (o real entra via posicaoReal)
      if (pv) { motoRef.current?.remove(); motoRef.current = null; }
      routeRef.current = null;
    }

    // enquadra
    if (coords.length > 1) {
      const b = new mbgl.LngLatBounds();
      coords.forEach((c) => b.extend(c));
      map.fitBounds(b, { padding: 70, duration: 700 });
    } else if (O) {
      map.easeTo({ center: [O.lng, O.lat], zoom: 15.5, duration: 500 });
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

  // Prévia ou corrida (fase): redesenha quando coleta/entrega/fase mudam.
  useEffect(() => {
    if ((!preview && !fase) || !readyRef.current) return;
    desenhar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview, fase, origem?.lng, origem?.lat, destino?.lng, destino?.lat]);

  // Move o motoboy. Rastreamento REAL (origem/destino do pedido): motoboy só com GPS real.
  // Demo puro (sem coords): segue a simulação por frac.
  useEffect(() => {
    if (preview) return;
    const map = mapRef.current;
    const mbgl = mbglRef.current;
    if (!readyRef.current || !map) return;
    const real = !!(origem || destino);
    if (real) {
      if (posicaoReal) {
        if (!motoRef.current && mbgl) {
          const el = document.createElement("div");
          el.className = "moto-marker";
          el.innerHTML = SVG_MOTO;
          motoRef.current = new mbgl.Marker({ element: el }).setLngLat(posicaoReal).addTo(map);
        } else {
          motoRef.current?.setLngLat(posicaoReal);
        }
        map.easeTo({ center: posicaoReal, duration: 230 });
      } else if (motoRef.current) {
        motoRef.current.remove();
        motoRef.current = null;
      }
      // fase de busca: mantém a ROTA REAL até a coleta, refazendo só se andou bastante (>120m)
      if (odRef.current.fase === "busca" && posicaoReal && origem) {
        const last = buscaFetchRef.current;
        if ((!last || distM(last, posicaoReal) > 120) && !buscaBusyRef.current) {
          buscaBusyRef.current = true;
          buscaFetchRef.current = posicaoReal;
          const alvo: [number, number] = [origem.lng, origem.lat];
          const de = posicaoReal;
          fetchDirections(de, alvo)
            .then((rb) => {
              const src = map.getSource("leg-busca") as GeoJSONSource | undefined;
              if (src) src.setData({ type: "Feature", geometry: { type: "LineString", coordinates: rb?.coords ?? [de, alvo] }, properties: {} });
            })
            .catch(() => {})
            .finally(() => { buscaBusyRef.current = false; });
        }
      }
      return;
    }
    const r = routeRef.current;
    if (!r || !motoRef.current) return;
    const ll: LngLat = posicaoReal ?? posAt(r.coords, r.cum, r.total, frac);
    motoRef.current.setLngLat(ll);
    map.easeTo({ center: ll, duration: 230 });
  }, [frac, posicaoReal, preview, origem, destino]);

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
