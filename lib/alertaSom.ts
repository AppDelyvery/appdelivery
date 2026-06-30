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
  const master = c.createGain();
  master.gain.value = 0.95;
  master.connect(c.destination);

  // cada nota é um acorde: grave (corpo/presença) + fundamental brilhante + harmônico
  const nota = (start: number, dur: number, freqs: number[]) => {
    freqs.forEach((f, i) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = i === 0 ? "sine" : i === 1 ? "sawtooth" : "triangle";
      o.frequency.setValueAtTime(f, start);
      const vol = i === 0 ? 0.34 : 0.2; // grave mais forte = presença
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(vol, start + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      o.connect(g);
      g.connect(master);
      o.start(start);
      o.stop(start + dur + 0.03);
    });
  };
  // "ring-ring" que sobe — chamada, com grave de corpo
  nota(t0, 0.24, [196, 392, 588]);
  nota(t0 + 0.3, 0.34, [261, 523, 784, 1046]);
}

// Começa o toque repetido (idempotente).
export function tocarAlerta() {
  if (loop) return;
  bipe();
  loop = setInterval(bipe, 1300);
}

export function pararAlerta() {
  if (loop) {
    clearInterval(loop);
    loop = null;
  }
}
