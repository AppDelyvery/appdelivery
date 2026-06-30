"use client";

// Toque de oferta via ARQUIVO de áudio (HTMLAudioElement), não Web Audio — no iOS PWA
// o Web Audio teima em não tocar; playback de mídia é confiável. A melodia "caixa de
// música" (do-mi-ré-sol-do) é renderizada uma vez num WAV (OfflineAudioContext) e tocada
// em loop. Precisa ser destravada num gesto do usuário (liberarAudio() no tap de Conectar).

let audioEl: HTMLAudioElement | null = null;
let preparando = false;

// agenda a melodia num contexto (offline) — mesmo timbre de antes
function agendarMelodia(c: BaseAudioContext, m: GainNode) {
  const nota = (t: number, freq: number, dur = 0.42, vol = 0.42) => {
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
  };
  const C5 = 523.25, E5 = 659.25, D5 = 587.33, G5 = 783.99, C6 = 1046.5, C7 = 2093;
  nota(0, C5);
  nota(0.11, E5);
  nota(0.22, D5);
  nota(0.33, G5);
  nota(0.46, C6, 0.52);
  nota(0.46, C7, 0.52, 0.12);
}

function wavDataUri(buf: AudioBuffer): string {
  const sr = buf.sampleRate;
  const data = buf.getChannelData(0);
  const n = data.length;
  const ab = new ArrayBuffer(44 + n * 2);
  const view = new DataView(ab);
  const wstr = (off: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
  wstr(0, "RIFF"); view.setUint32(4, 36 + n * 2, true); wstr(8, "WAVE");
  wstr(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, sr, true); view.setUint32(28, sr * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  wstr(36, "data"); view.setUint32(40, n * 2, true);
  let off = 44;
  for (let i = 0; i < n; i++) { const s = Math.max(-1, Math.min(1, data[i])); view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true); off += 2; }
  const bytes = new Uint8Array(ab);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return "data:audio/wav;base64," + btoa(bin);
}

// Renderiza o WAV e monta o <audio> em loop. Chamar cedo (no mount) pra estar pronto
// quando o usuário tocar Conectar (o unlock precisa ser síncrono no gesto).
export async function prepararAudio() {
  if (audioEl || preparando || typeof window === "undefined") return;
  preparando = true;
  try {
    const OAC = window.OfflineAudioContext || (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext;
    if (!OAC) return;
    const SR = 44100, DUR = 1.7; // 1 ciclo: melodia + respiro
    const oac = new OAC(1, Math.ceil(SR * DUR), SR);
    const master = oac.createGain();
    master.gain.value = 0.95;
    master.connect(oac.destination);
    agendarMelodia(oac, master);
    const rendered = await oac.startRendering();
    const a = new Audio(wavDataUri(rendered));
    a.loop = true;
    a.preload = "auto";
    audioEl = a;
  } catch {
    /* sem suporte — segue sem som no app (push do SO ainda chega) */
  } finally {
    preparando = false;
  }
}

// Destrava no gesto (tap em Conectar): toca mudo e pausa — libera o <audio> no iOS.
export function liberarAudio() {
  if (!audioEl) { void prepararAudio(); return; }
  const v = audioEl.volume;
  audioEl.muted = true;
  audioEl.play().then(() => {
    if (!audioEl) return;
    audioEl.pause();
    audioEl.currentTime = 0;
    audioEl.muted = false;
    audioEl.volume = v;
  }).catch(() => { if (audioEl) { audioEl.muted = false; audioEl.volume = v; } });
}

export function tocarAlerta() {
  if (!audioEl) { void prepararAudio(); return; }
  audioEl.muted = false;
  audioEl.volume = 1;
  audioEl.currentTime = 0;
  void audioEl.play().catch(() => {});
}

export function pararAlerta() {
  if (audioEl) {
    audioEl.pause();
    audioEl.currentTime = 0;
  }
}
