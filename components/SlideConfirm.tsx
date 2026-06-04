"use client";

import { useCallback, useRef, useState } from "react";
import { Icon, type IconName } from "./Icons";

// Deslizar-pra-confirmar (padrão 99, T24/T27). Evita toque acidental nas
// transições de estado do entregador. Touch + mouse via Pointer Events.
// Cor padrão = verde "go"; passe color="brand" pra índigo.
export default function SlideConfirm({
  label,
  onConfirm,
  icon = "arrow",
  color = "go",
  disabled = false,
  busy = false,
}: {
  label: string;
  onConfirm: () => void | Promise<void>;
  icon?: IconName;
  color?: "go" | "brand";
  disabled?: boolean;
  busy?: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [x, setX] = useState(0); // deslocamento atual do thumb (px)
  const [dragging, setDragging] = useState(false);
  const startRef = useRef(0);
  const maxRef = useRef(0);
  const firedRef = useRef(false);

  const THUMB = 52; // largura do thumb
  const PAD = 4;

  const limite = useCallback(() => {
    const w = trackRef.current?.clientWidth ?? 0;
    return Math.max(0, w - THUMB - PAD * 2);
  }, []);

  const onDown = (e: React.PointerEvent) => {
    if (disabled || busy) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    startRef.current = e.clientX - x;
    maxRef.current = limite();
    firedRef.current = false;
    setDragging(true);
  };

  const onMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const next = Math.min(maxRef.current, Math.max(0, e.clientX - startRef.current));
    setX(next);
    if (!firedRef.current && next >= maxRef.current * 0.96) {
      firedRef.current = true;
      setDragging(false);
      setX(maxRef.current);
      void onConfirm();
    }
  };

  const onUp = () => {
    if (!dragging) return;
    setDragging(false);
    if (!firedRef.current) setX(0); // não chegou no fim → volta
  };

  const prog = maxRef.current ? x / maxRef.current : 0;
  const bg = color === "brand" ? "var(--brand)" : "var(--go)";

  return (
    <div
      ref={trackRef}
      className="slide-confirm"
      style={{ opacity: disabled ? 0.5 : 1, ["--sc-bg" as string]: bg }}
    >
      <div className="sc-fill" style={{ width: x + THUMB + PAD, transition: dragging ? "none" : "width .2s" }} />
      <span className="sc-label" style={{ opacity: busy ? 0 : 1 - prog * 0.9 }}>{label}</span>
      {busy ? (
        <span className="sc-busy"><Icon name="spinner" /></span>
      ) : (
        <button
          type="button"
          className="sc-thumb"
          aria-label={label}
          disabled={disabled}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          style={{ transform: `translateX(${x}px)`, transition: dragging ? "none" : "transform .2s" }}
        >
          <Icon name={icon} />
        </button>
      )}
    </div>
  );
}
