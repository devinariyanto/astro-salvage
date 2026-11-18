// Small helpers that every other module leans on: a seedable random
// generator so screenshots are repeatable, plus the best-score record
// kept in localStorage (with a quiet fallback when storage is blocked).
export const BEST_KEY = 'astro-salvage-best';
export const FIELD_W = 1280;
export const FIELD_H = 720;

// mulberry32: tiny, fast, deterministic for a given 32-bit seed.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function range(rng, lo, hi) { return lo + rng() * (hi - lo); }
export function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
export function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
export function dist2(ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }

export function readBest() {
  try { return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0; }
  catch { return 0; }
}

export function saveBest(value) {
  try { window.localStorage.setItem(BEST_KEY, String(value)); }
  catch { /* private window: best score lives for this visit only */ }
}
