// WebAudio synth: every sound is built from oscillators and noise, no
// audio files. A quiet ambient pad loops underneath while playing.
// AudioContext is created lazily on the first user gesture (browsers
// block sound before that), and M toggles mute.
export function createAudio() {
  return { ctx: null, muted: false, pad: null, padGain: null, master: null };
}

function ensure(a) {
  if (a.ctx) return a.ctx;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    a.ctx = new Ctx();
    a.master = a.ctx.createGain();
    a.master.gain.value = a.muted ? 0 : 0.5;
    a.master.connect(a.ctx.destination);
  } catch { return null; }
  return a.ctx;
}

export function unlockAudio(a) {
  const ctx = ensure(a);
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  startPad(a);
}

function tone(a, freq, dur, type, vol, slideTo) {
  const ctx = ensure(a);
  if (!ctx || a.muted) return;
  const t0 = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(g); g.connect(a.master);
  osc.start(t0); osc.stop(t0 + dur + 0.02);
}

function noiseBurst(a, dur, vol, lowpass) {
  const ctx = ensure(a);
  if (!ctx || a.muted) return;
  const t0 = ctx.currentTime;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filt = ctx.createBiquadFilter();
  filt.type = 'lowpass'; filt.frequency.value = lowpass;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  src.connect(filt); filt.connect(g); g.connect(a.master);
  src.start(t0);
}

export const sfx = {
  pickup(a, combo) { tone(a, 520 + Math.min(combo, 12) * 45, 0.14, 'sine', 0.22, 940 + Math.min(combo, 12) * 45); },
  shoot(a) { tone(a, 880, 0.09, 'square', 0.08, 240); },
  boom(a) { noiseBurst(a, 0.4, 0.5, 900); tone(a, 140, 0.35, 'sawtooth', 0.22, 38); },
  zap(a) { tone(a, 1600, 0.08, 'sawtooth', 0.1, 300); },
  hurt(a) { tone(a, 220, 0.3, 'sawtooth', 0.3, 60); noiseBurst(a, 0.25, 0.3, 600); },
  dash(a) { noiseBurst(a, 0.18, 0.2, 2400); },
  horn(a) { tone(a, 196, 0.5, 'triangle', 0.22, 196); tone(a, 294, 0.5, 'triangle', 0.16, 294); },
  draft(a) { tone(a, 660, 0.12, 'sine', 0.18, 990); tone(a, 990, 0.16, 'sine', 0.14, 1320); },
};

function startPad(a) {
  const ctx = ensure(a);
  if (!ctx || a.pad || a.muted) return;
  const g = ctx.createGain();
  g.gain.value = 0.045;
  g.connect(a.master);
  const o1 = ctx.createOscillator(); o1.type = 'sine'; o1.frequency.value = 55;
  const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = 82.4;
  const o3 = ctx.createOscillator(); o3.type = 'triangle'; o3.frequency.value = 110.3;
  const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
  const lfoGain = ctx.createGain(); lfoGain.gain.value = 0.02;
  lfo.connect(lfoGain); lfoGain.connect(g.gain);
  o1.connect(g); o2.connect(g); o3.connect(g);
  o1.start(); o2.start(); o3.start(); lfo.start();
  a.pad = [o1, o2, o3, lfo]; a.padGain = g;
}

export function setMuted(a, muted) {
  a.muted = muted;
  if (a.master) a.master.gain.value = muted ? 0 : 0.5;
}
