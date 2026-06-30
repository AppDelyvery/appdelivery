"use client";

// Toque de nova oferta estilo 99/iFood: bipe alto e REPETIDO enquanto a oferta está
// na tela. O push do SO dá só um "pluc" único; com o app aberto, tocamos no próprio app.
// iOS exige que o áudio seja liberado num gesto do usuário (chamar liberarAudio() no tap
// de "Conectar"). Sem AudioContext, no-op silencioso.

let ctx: AudioContext | null = null;
let loop: ReturnType<typeof setInterval> | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  return ctx;
}

// Chamar dentro de um gesto do usuário (tap em "Conectar") pra destravar o som no iOS.
export function liberarAudio() {
  const c = getCtx();
  if (c && c.state === "suspended") c.resume().catch(() => {});
}

function bipe() {
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") c.resume().catch(() => {});
  const t0 = c.currentTime;
  // dois tons (ding-dong) curtos, bem audíveis
  [[880, 0], [1320, 0.16]].forEach(([freq, off]) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(freq, t0 + off);
    g.gain.setValueAtTime(0.0001, t0 + off);
    g.gain.exponentialRampToValueAtTime(0.6, t0 + off + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + off + 0.28);
    o.connect(g);
    g.connect(c.destination);
    o.start(t0 + off);
    o.stop(t0 + off + 0.3);
  });
}

// Começa o toque repetido (idempotente).
export function tocarAlerta() {
  if (loop) return;
  bipe();
  loop = setInterval(bipe, 1100);
}

export function pararAlerta() {
  if (loop) {
    clearInterval(loop);
    loop = null;
  }
}
