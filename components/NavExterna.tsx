"use client";

import { useEffect, useState } from "react";
import { Icon } from "./Icons";

// Abrir a rota no app de navegação do entregador (padrão 99 T32).
// Mostra Waze e Google Maps, mas destaca o preferido (Configurações do entregador).
export default function NavExterna({ lat, lng, label = "Abrir no app de navegação" }: { lat: number | null; lng: number | null; label?: string }) {
  const [pref, setPref] = useState<"waze" | "google">("google");
  useEffect(() => {
    const n = localStorage.getItem("nav_pref");
    if (n === "waze" || n === "google") setPref(n);
  }, []);

  if (lat == null || lng == null) return null;
  const waze = { l: "Waze", href: `https://waze.com/ul?ll=${lat},${lng}&navigate=yes` };
  const gmaps = { l: "Google Maps", href: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}` };
  const apps = pref === "waze" ? [waze, gmaps] : [gmaps, waze];

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 700, marginBottom: 7 }}>{label}</div>
      <div className="btn-row">
        {apps.map((a, i) => (
          <a key={a.l} className={`btn ${i === 0 ? "btn-primary" : "btn-ghost"}`} href={a.href} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
            <Icon name="pin" /> {a.l}
          </a>
        ))}
      </div>
    </div>
  );
}
