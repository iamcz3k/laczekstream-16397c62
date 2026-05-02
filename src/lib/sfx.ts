// Lightweight Web Audio synthesized sound effects (no audio files / no API needed).
// Each function plays a ~1-2s effect. Safe to call repeatedly.

let ctx: AudioContext | null = null;
function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

function envGain(start: number, peak: number, end: number, attack = 0.02, release = 0.3) {
  const a = ac()!;
  const g = a.createGain();
  const t = a.currentTime;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + release);
  return g;
}

/** Referee whistle (football). */
export function playWhistle() {
  const a = ac(); if (!a) return;
  const t0 = a.currentTime;
  for (let i = 0; i < 2; i++) {
    const start = t0 + i * 0.6;
    const osc = a.createOscillator();
    osc.type = "square";
    osc.frequency.setValueAtTime(2400, start);
    osc.frequency.linearRampToValueAtTime(2700, start + 0.15);
    const lfo = a.createOscillator();
    lfo.frequency.value = 25;
    const lfoGain = a.createGain();
    lfoGain.gain.value = 80;
    lfo.connect(lfoGain).connect(osc.frequency);
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(0.4, start + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, start + 0.45);
    osc.connect(g).connect(a.destination);
    osc.start(start); lfo.start(start);
    osc.stop(start + 0.5); lfo.stop(start + 0.5);
  }
}

/** Popcorn — random popping bursts (movies). */
export function playPopcorn() {
  const a = ac(); if (!a) return;
  const t0 = a.currentTime;
  for (let i = 0; i < 16; i++) {
    const start = t0 + Math.random() * 1.6;
    const osc = a.createOscillator();
    osc.type = "square";
    const f = 800 + Math.random() * 1400;
    osc.frequency.setValueAtTime(f, start);
    osc.frequency.exponentialRampToValueAtTime(f * 0.4, start + 0.05);
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(0.25, start + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, start + 0.08);
    osc.connect(g).connect(a.destination);
    osc.start(start);
    osc.stop(start + 0.1);
  }
}

/** TV no-signal static. */
export function playStatic() {
  const a = ac(); if (!a) return;
  const buffer = a.createBuffer(1, a.sampleRate * 1.6, a.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
  const src = a.createBufferSource();
  src.buffer = buffer;
  const g = a.createGain();
  g.gain.value = 0.18;
  src.connect(g).connect(a.destination);
  src.start();
}

/** YouTube-y cheerful ding (random short jingle). */
export function playJingle() {
  const a = ac(); if (!a) return;
  const notes = [523.25, 659.25, 783.99, 1046.5];
  const t0 = a.currentTime;
  notes.forEach((freq, i) => {
    const start = t0 + i * 0.12;
    const osc = a.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = freq;
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(0.3, start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);
    osc.connect(g).connect(a.destination);
    osc.start(start); osc.stop(start + 0.4);
  });
}

/** CCTV / surveillance beep loop. */
export function playCctvBeep() {
  const a = ac(); if (!a) return;
  const t0 = a.currentTime;
  for (let i = 0; i < 4; i++) {
    const start = t0 + i * 0.45;
    const osc = a.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 1200;
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(0.25, start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);
    osc.connect(g).connect(a.destination);
    osc.start(start); osc.stop(start + 0.2);
  }
}

export function playForTab(tab: string) {
  switch (tab) {
    case "movies": return playPopcorn();
    case "football": return playWhistle();
    case "tv": return playStatic();
    case "youtube": return playJingle();
    case "cctv": return playCctvBeep();
    default: return playJingle();
  }
}