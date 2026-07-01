"use client";

// Chime curto (uma vez, não loop) pro LOJISTA quando o status muda (aceito/coletado/
// entregue). Mesma técnica confiável do iOS: melodia renderizada num WAV e tocada por
// HTMLAudioElement. Destravar num gesto (liberarSomStatus() no "Solicitar entrega").

let el: HTMLAudioElement | null = null;
let preparando = false;

function agendar(c: BaseAudioContext, m: GainNode) {
  const nota = (t: number, freq: number, dur = 0.4, vol = 0.4) => {
    ([[freq, vol, "sine"], [freq * 2, vol * 0.2, "sine"]] as [number, number, OscillatorType][]).forEach(([f, v, type]) => {
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
  // ding-dong suave que sobe (sol → dó), sensação de "boa notícia"
  nota(0, 783.99, 0.34);
  nota(0.16, 1046.5, 0.42);
}

function wavDataUri(buf: AudioBuffer): string {
  const sr = buf.sampleRate, data = buf.getChannelData(0), n = data.length;
  const ab = new ArrayBuffer(44 + n * 2), view = new DataView(ab);
  const w = (off: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
  w(0, "RIFF"); view.setUint32(4, 36 + n * 2, true); w(8, "WAVE"); w(12, "fmt ");
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, sr, true); view.setUint32(28, sr * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  w(36, "data"); view.setUint32(40, n * 2, true);
  let off = 44;
  for (let i = 0; i < n; i++) { const s = Math.max(-1, Math.min(1, data[i])); view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true); off += 2; }
  const bytes = new Uint8Array(ab);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return "data:audio/wav;base64," + btoa(bin);
}

export async function prepararSomStatus() {
  if (el || preparando || typeof window === "undefined") return;
  preparando = true;
  try {
    const OAC = window.OfflineAudioContext || (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext;
    if (!OAC) return;
    const oac = new OAC(1, Math.ceil(44100 * 0.9), 44100);
    const master = oac.createGain();
    master.gain.value = 0.9;
    master.connect(oac.destination);
    agendar(oac, master);
    const a = new Audio(wavDataUri(await oac.startRendering()));
    a.preload = "auto";
    el = a;
  } catch {
    /* sem suporte */
  } finally {
    preparando = false;
  }
}

export function liberarSomStatus() {
  if (!el) { void prepararSomStatus(); return; }
  const v = el.volume;
  el.muted = true;
  el.play().then(() => { if (el) { el.pause(); el.currentTime = 0; el.muted = false; el.volume = v; } }).catch(() => { if (el) { el.muted = false; el.volume = v; } });
}

export function tocarSomStatus() {
  if (!el) { void prepararSomStatus(); return; }
  el.muted = false;
  el.currentTime = 0;
  void el.play().catch(() => {});
}
