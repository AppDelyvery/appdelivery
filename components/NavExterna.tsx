"use client";

import { Icon } from "./Icons";

// Abrir a rota no app de navegação do entregador (padrão 99 T32).
// Waze e Google Maps por deep-link/URL — funciona no celular e no desktop.
export default function NavExterna({ lat, lng, label = "Abrir no app de navegação" }: { lat: number | null; lng: number | null; label?: string }) {
  if (lat == null || lng == null) return null;
  const waze = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
  const gmaps = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 700, marginBottom: 7 }}>{label}</div>
      <div className="btn-row">
        <a className="btn btn-ghost" href={waze} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}><Icon name="pin" /> Waze</a>
        <a className="btn btn-ghost" href={gmaps} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}><Icon name="pin" /> Google Maps</a>
      </div>
    </div>
  );
}
