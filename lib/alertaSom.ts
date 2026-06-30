"use client";

// Toque de nova oferta: melodia "Hook 5 notas" (do-mi-ré-sol-do) em timbre de caixa
// de música — agradável, grudenta e que resolve na tônica (não cansa no repeat).
// O push do SO dá só um "pluc" único; com o app aberto tocamos no próprio app.
// iOS exige liberar o áudio num gesto do usuário (liberarAudio() no tap de "Conectar").

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

// timbre caixa de música: fundamental + oitava + harmônico, ataque rápido e cauda macia
function nota(c: AudioContext, m: GainNode, t: number, freq: number, dur = 0.42, vol = 0.42) {
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

// Melodia #10 — ~10% mais lenta, com brilho (oitava suave) na última nota.
function melodia() {
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") c.resume().catch(() => {});
  const m = c.createGain();
  m.gain.value = 0.95;
  m.connect(c.destination);
  const t = c.currentTime;
  const C5 = 523.25, E5 = 659.25, D5 = 587.33, G5 = 783.99, C6 = 1046.5, C7 = 2093;
  nota(c, m, t + 0.0, C5);
  nota(c, m, t + 0.11, E5);
  nota(c, m, t + 0.22, D5);
  nota(c, m, t + 0.33, G5);
  nota(c, m, t + 0.46, C6, 0.52);       // última nota, um tico mais longa
  nota(c, m, t + 0.46, C7, 0.52, 0.12); // brilho: oitava suave por cima
}

// Começa o toque repetido (idempotente). Intervalo dá um respiro entre as repetições.
export function tocarAlerta() {
  if (loop) return;
  melodia();
  loop = setInterval(melodia, 1700);
}

export function pararAlerta() {
  if (loop) {
    clearInterval(loop);
    loop = null;
  }
}
