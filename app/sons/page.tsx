"use client";

import { useRef, useState } from "react";

// Página de teste de toques de oferta. Abrir em appdelivery-psi.vercel.app/sons
// Ouça os 10, escolha o número e me fala — eu ligo o escolhido no alerta da oferta.

type Preset = { nome: string; desc: string; tocar: (c: AudioContext, m: GainNode) => void };

function tom(
  c: AudioContext, m: GainNode, t: number, dur: number, freq: number,
  type: OscillatorType, vol: number, sweepTo?: number,
) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (sweepTo) o.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(m);
  o.start(t);
  o.stop(t + dur + 0.04);
}

const PRESETS: Preset[] = [
  {
    nome: "1 · Ding-dong",
    desc: "dois tons claros, suave",
    tocar: (c, m) => { const t = c.currentTime; tom(c, m, t, 0.28, 880, "triangle", 0.6); tom(c, m, t + 0.16, 0.3, 1320, "triangle", 0.6); },
  },
  {
    nome: "2 · Ring que sobe (atual)",
    desc: "acorde grave + brilho, sobe",
    tocar: (c, m) => {
      const t = c.currentTime;
      [196, 392, 588].forEach((f, i) => tom(c, m, t, 0.24, f, i === 1 ? "sawtooth" : "sine", i === 0 ? 0.34 : 0.2));
      [261, 523, 784, 1046].forEach((f, i) => tom(c, m, t + 0.3, 0.34, f, i === 1 ? "sawtooth" : "triangle", i === 0 ? 0.34 : 0.2));
    },
  },
  {
    nome: "3 · Tri-tone",
    desc: "três notinhas subindo (estilo msg)",
    tocar: (c, m) => { const t = c.currentTime; [660, 880, 1175].forEach((f, i) => tom(c, m, t + i * 0.12, 0.16, f, "sine", 0.55)); },
  },
  {
    nome: "4 · Marimba",
    desc: "batida de madeira, dois toques",
    tocar: (c, m) => { const t = c.currentTime; [0, 0.22].forEach((off) => { tom(c, m, t + off, 0.18, 1046, "sine", 0.5); tom(c, m, t + off, 0.18, 1568, "sine", 0.22); }); },
  },
  {
    nome: "5 · Alarme",
    desc: "bipes rápidos e estridentes",
    tocar: (c, m) => { const t = c.currentTime; [0, 0.14, 0.28, 0.42].forEach((off) => tom(c, m, t + off, 0.1, 1000, "square", 0.4)); },
  },
  {
    nome: "6 · Sino",
    desc: "badalada com cauda longa",
    tocar: (c, m) => { const t = c.currentTime; tom(c, m, t, 0.9, 784, "sine", 0.5); tom(c, m, t, 0.7, 1568, "sine", 0.22); tom(c, m, t, 0.5, 2350, "triangle", 0.12); },
  },
  {
    nome: "7 · Sonar (ping + eco)",
    desc: "um toque com eco",
    tocar: (c, m) => { const t = c.currentTime; tom(c, m, t, 0.7, 1320, "sine", 0.55); tom(c, m, t + 0.32, 0.55, 1320, "sine", 0.25); },
  },
  {
    nome: "8 · Buzina",
    desc: "grave e encorpada, duas vezes",
    tocar: (c, m) => { const t = c.currentTime; [0, 0.3].forEach((off) => { tom(c, m, t + off, 0.24, 220, "sawtooth", 0.4); tom(c, m, t + off, 0.24, 330, "sawtooth", 0.22); }); },
  },
  {
    nome: "9 · Sweep (sobe rápido)",
    desc: "varredura ascendente, futurista",
    tocar: (c, m) => { const t = c.currentTime; tom(c, m, t, 0.45, 400, "sawtooth", 0.45, 1600); },
  },
  {
    nome: "10 · Chime 4 notas",
    desc: "carrilhão agradável que sobe",
    tocar: (c, m) => { const t = c.currentTime; [523, 659, 784, 1046].forEach((f, i) => tom(c, m, t + i * 0.13, 0.3, f, "triangle", 0.45)); },
  },
];

export default function SonsPage() {
  const ctxRef = useRef<AudioContext | null>(null);
  const [ativo, setAtivo] = useState<number | null>(null);

  const getCtx = () => {
    if (!ctxRef.current) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctxRef.current = new AC();
    }
    if (ctxRef.current.state === "suspended") ctxRef.current.resume();
    return ctxRef.current;
  };
  const play = (i: number, vezes = 1) => {
    const c = getCtx();
    setAtivo(i);
    for (let k = 0; k < vezes; k++) {
      const m = c.createGain();
      m.gain.value = 0.95;
      m.connect(c.destination);
      setTimeout(() => PRESETS[i].tocar(c, m), k * 1100);
    }
    setTimeout(() => setAtivo(null), vezes * 1100 + 400);
  };

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "24px 16px 60px" }}>
      <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.5px", margin: "0 0 4px" }}>Toques de oferta</h1>
      <p style={{ color: "var(--muted)", fontSize: 13.5, margin: "0 0 18px" }}>
        Ouça os 10, escolha o número e me fala. Tire o celular do silencioso. (&ldquo;3×&rdquo; simula o toque repetido da chamada.)
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {PRESETS.map((p, i) => (
          <div
            key={i}
            className="card"
            style={{ display: "flex", alignItems: "center", gap: 12, padding: 14, borderColor: ativo === i ? "var(--brand)" : undefined }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 14.5 }}>{p.nome}</div>
              <div style={{ color: "var(--muted)", fontSize: 12 }}>{p.desc}</div>
            </div>
            <button className="btn btn-primary" style={{ width: "auto", padding: "9px 16px", fontSize: 13 }} onClick={() => play(i)}>Tocar</button>
            <button className="btn btn-ghost" style={{ width: "auto", padding: "9px 13px", fontSize: 13 }} onClick={() => play(i, 3)}>3×</button>
          </div>
        ))}
      </div>
    </div>
  );
}
