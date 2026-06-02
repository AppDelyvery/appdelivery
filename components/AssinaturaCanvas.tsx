"use client";

import { useEffect, useRef } from "react";
import { Icon } from "./Icons";

// Pad de assinatura (dedo/mouse). Emite o dataURL a cada traço; null ao limpar.
export default function AssinaturaCanvas({ onChange }: { onChange?: (dataUrl: string | null) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    c.width = c.offsetWidth;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0d1424";

    let drawing = false;
    const pos = (e: MouseEvent | TouchEvent): [number, number] => {
      const r = c.getBoundingClientRect();
      const t = "touches" in e ? e.touches[0] : e;
      return [t.clientX - r.left, t.clientY - r.top];
    };
    const down = (e: MouseEvent | TouchEvent) => {
      drawing = true;
      const [x, y] = pos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
      e.preventDefault();
    };
    const move = (e: MouseEvent | TouchEvent) => {
      if (!drawing) return;
      const [x, y] = pos(e);
      ctx.lineTo(x, y);
      ctx.stroke();
      e.preventDefault();
    };
    const up = () => {
      if (!drawing) return;
      drawing = false;
      onChange?.(c.toDataURL());
    };

    c.addEventListener("mousedown", down);
    c.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    c.addEventListener("touchstart", down, { passive: false });
    c.addEventListener("touchmove", move, { passive: false });
    c.addEventListener("touchend", up);
    return () => {
      c.removeEventListener("mousedown", down);
      c.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      c.removeEventListener("touchstart", down);
      c.removeEventListener("touchmove", move);
      c.removeEventListener("touchend", up);
    };
  }, [onChange]);

  const clear = (e: React.MouseEvent) => {
    e.preventDefault();
    const c = ref.current;
    const ctx = c?.getContext("2d");
    if (c && ctx) ctx.clearRect(0, 0, c.width, c.height);
    onChange?.(null);
  };

  return (
    <>
      <canvas ref={ref} className="sigpad" height={150} />
      <div className="sig-hint">
        <Icon name="pen" /> assine com o dedo ou o mouse ·{" "}
        <a href="#" onClick={clear} style={{ color: "var(--brand)", fontWeight: 700 }}>
          limpar
        </a>
      </div>
    </>
  );
}
