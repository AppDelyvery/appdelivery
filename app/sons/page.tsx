"use client";

import { useRef, useState } from "react";

// Página de teste de toques de oferta. Abrir em appdelivery-psi.vercel.app/sons
// Agora são MELODIAS curtas (caixa de música/marimba): agradáveis, grudentas e que
// não cansam no repeat. Ouça, escolha o número e me fala — eu ligo no alerta.

type Preset = { nome: string; desc: string; notas: [number, number][] }; // [freq, offset(s)]

// notas (Hz)
const N = {
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880, B5: 987.77,
  C6: 1046.5, D6: 1174.66, E6: 1318.51, G4: 392, A4: 440, C4: 261.63, E4: 329.63,
};

// timbre macio de caixa de música: fundamental + oitava + harmônico, ataque rápido e
// cauda suave (sino/marimba). Volume moderado pra não cansar.
function nota(c: AudioContext, m: GainNode, t: number, freq: number, dur = 0.4, vol = 0.42) {
  ([[freq, vol, "sine"], [freq * 2, vol * 0.22, "sine"], [freq * 3, vol * 0.07, "triangle"]] as [number, number, OscillatorType][])
    .forEach(([f, v, type]) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(v, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(m);
      o.start(t);
      o.stop(t + dur + 0.05);
    });
}

const PRESETS: Preset[] = [
  { nome: "1 · Caixa de música ↑", desc: "do-mi-sol-do subindo, doce", notas: [[N.C5, 0], [N.E5, 0.12], [N.G5, 0.24], [N.C6, 0.36]] },
  { nome: "2 · Aconchego ↓", desc: "sol-mi-do descendo, calmo", notas: [[N.G5, 0], [N.E5, 0.13], [N.C5, 0.26]] },
  { nome: "3 · Pop hook", desc: "do-mi-sol-mi, saltitante", notas: [[N.C5, 0], [N.E5, 0.11], [N.G5, 0.22], [N.E5, 0.33]] },
  { nome: "4 · Plim alegre", desc: "mi-sol-do rápido e resolvido", notas: [[N.E5, 0], [N.G5, 0.1], [N.C6, 0.2]] },
  { nome: "5 · Sino doce", desc: "do-sol-mi-do, cauda macia", notas: [[N.C6, 0], [N.G5, 0.14], [N.E5, 0.28], [N.C5, 0.42]] },
  { nome: "6 · Carrossel", desc: "sol-do-mi-sol, bouncy", notas: [[N.G5, 0], [N.C6, 0.11], [N.E5, 0.22], [N.G5, 0.33]] },
  { nome: "7 · Boas-novas", desc: "sol-do-mi-sol, quente e otimista", notas: [[N.G4, 0], [N.C5, 0.12], [N.E5, 0.24], [N.G5, 0.36]] },
  { nome: "8 · Caixinha", desc: "mi-do-ré-sol, tema fofo", notas: [[N.E5, 0], [N.C5, 0.12], [N.D5, 0.24], [N.G5, 0.36]] },
  { nome: "9 · Maj7 sonhador", desc: "do-mi-sol-si, delicado", notas: [[N.C5, 0], [N.E5, 0.11], [N.G5, 0.22], [N.B5, 0.33]] },
  { nome: "10 · Hook 5 notas", desc: "do-mi-ré-sol-do, grudento", notas: [[N.C5, 0], [N.E5, 0.1], [N.D5, 0.2], [N.G5, 0.3], [N.C6, 0.42]] },
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
  const tocarUma = (c: AudioContext, p: Preset, base: number) => {
    const m = c.createGain();
    m.gain.value = 0.95;
    m.connect(c.destination);
    p.notas.forEach(([f, off]) => nota(c, m, base + off, f));
  };
  const play = (i: number, vezes = 1) => {
    const c = getCtx();
    setAtivo(i);
    const dur = PRESETS[i].notas[PRESETS[i].notas.length - 1][1] + 0.6;
    for (let k = 0; k < vezes; k++) tocarUma(c, PRESETS[i], c.currentTime + k * (dur + 0.25));
    setTimeout(() => setAtivo(null), vezes * (dur + 0.25) * 1000 + 300);
  };

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "24px 16px 60px" }}>
      <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.5px", margin: "0 0 4px" }}>Toques de oferta — melodias</h1>
      <p style={{ color: "var(--muted)", fontSize: 13.5, margin: "0 0 18px" }}>
        Melodinhas curtas e agradáveis. Ouça, escolha o número e me fala. Tire o celular do silencioso. (&ldquo;3×&rdquo; simula o toque repetido.)
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
