"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MbMap } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Icon } from "./Icons";
import { MAPBOX_TOKEN, hasMapbox } from "@/lib/mapbox";
import { PALMAS } from "@/lib/rota";

export type PontoMapa = { lat: number; lng: number; endereco: string };

// Seletor de ponto no mapa (rede de segurança quando a busca não acha o endereço).
// Padrão iFood/Uber: pino FIXO no centro, o usuário move o mapa por baixo.
export default function MapaPinPicker({
  inicial,
  onConfirmar,
  onFechar,
}: {
  inicial: { lat: number; lng: number } | null;
  onConfirmar: (p: PontoMapa) => void;
  onFechar: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MbMap | null>(null);
  const centroRef = useRef<{ lat: number; lng: number }>(inicial ?? { lng: PALMAS[0], lat: PALMAS[1] });
  const [endereco, setEndereco] = useState("Arraste o mapa pra marcar o ponto");
  const [busy, setBusy] = useState(false);
  const tRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reverse = (lng: number, lat: number) => {
    if (tRef.current) clearTimeout(tRef.current);
    setBusy(true);
    tRef.current = setTimeout(async () => {
      try {
        const u = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&language=pt&limit=1`;
        const d = await (await fetch(u)).json();
        setEndereco(d?.features?.[0]?.place_name ?? `Ponto no mapa (${lat.toFixed(5)}, ${lng.toFixed(5)})`);
      } catch {
        setEndereco(`Ponto no mapa (${lat.toFixed(5)}, ${lng.toFixed(5)})`);
      } finally {
        setBusy(false);
      }
    }, 400);
  };

  useEffect(() => {
    if (!hasMapbox() || !containerRef.current) return;
    let cancel = false;
    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (cancel) return;
      mapboxgl.accessToken = MAPBOX_TOKEN;
      const c = centroRef.current;
      const map = new mapboxgl.Map({ container: containerRef.current!, style: "mapbox://styles/mapbox/streets-v12", center: [c.lng, c.lat], zoom: 15, attributionControl: false });
      mapRef.current = map;
      map.on("load", () => reverse(c.lng, c.lat));
      map.on("moveend", () => {
        const ce = map.getCenter();
        centroRef.current = { lat: ce.lat, lng: ce.lng };
        reverse(ce.lng, ce.lat);
      });
    })();
    return () => { cancel = true; mapRef.current?.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div onClick={onFechar} style={{ position: "fixed", inset: 0, background: "rgba(13,20,36,.5)", zIndex: 400 }} />
      <div style={{ position: "fixed", left: 12, right: 12, top: 12, bottom: 12, maxWidth: 520, margin: "0 auto", background: "#fff", borderRadius: 18, overflow: "hidden", zIndex: 401, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)" }}>
          <div style={{ fontSize: 15, fontWeight: 800 }}>Marcar no mapa</div>
          <button className="btn btn-ghost" style={{ width: "auto", padding: "6px 11px" }} onClick={onFechar}><Icon name="stop" /></button>
        </div>
        <div style={{ position: "relative", flex: 1 }}>
          {hasMapbox() ? <div ref={containerRef} style={{ position: "absolute", inset: 0 }} /> : <div className="map-placeholder" style={{ position: "absolute", inset: 0 }}>Mapbox não configurado.</div>}
          {/* pino fixo no centro */}
          <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-100%)", zIndex: 2, color: "var(--brand)", pointerEvents: "none", filter: "drop-shadow(0 3px 4px rgba(0,0,0,.35))" }}>
            <Icon name="pin" width={40} height={40} />
          </div>
        </div>
        <div style={{ padding: 14, borderTop: "1px solid var(--line)" }}>
          <div style={{ fontSize: 12.5, color: "var(--ink-2)", minHeight: 34, marginBottom: 10, display: "flex", alignItems: "center", gap: 7 }}>
            <Icon name="pin" /> <span>{busy ? "Localizando…" : endereco}</span>
          </div>
          <button className="btn btn-primary" onClick={() => onConfirmar({ ...centroRef.current, endereco })}>Confirmar este ponto</button>
        </div>
      </div>
    </>
  );
}
