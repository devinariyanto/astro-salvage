// Deterministic screenshot scenes for ?shot=start|play|draft|end&seed=N.
// Each one plays the real rules forward from a fresh game with a simple
// autopilot (steer to the nearest cargo, skirt mines, fire at what is
// ahead), so the frame is a genuine moment of play and the same seed
// always gives the same frame. After painting twice it sets
// window.__shotReady for the screenshot runner.
import { STEP } from './main.js';
import { rollDraft } from './upgrades.js';
import { waveClearBonus } from './waves.js';

const PLAY_SECONDS = 24;
const END_SECONDS = 240;

function autopilot(g, reckless) {
  const p = g.player;
  const f = g.field;
  let tx = p.x, ty = p.y;
  let best = Infinity;
  for (const c of f.cargo) {
    const d = (c.x - p.x) ** 2 + (c.y - p.y) ** 2;
    if (d < best) { best = d; tx = c.x; ty = c.y; }
  }
  // veer away from a close mine or rock
  for (const h of [...f.mines, ...f.rocks]) {
    const d = Math.hypot(h.x - p.x, h.y - p.y);
    if (d < (reckless ? 60 : 130)) {
      tx = p.x + (p.x - h.x);
      ty = p.y + (p.y - h.y);
    }
  }
  const dx = tx - p.x, dy = ty - p.y;
  const len = Math.hypot(dx, dy) || 1;
  const ax = Math.abs(dx / len) > 0.25 ? Math.sign(dx) : 0;
  const ay = Math.abs(dy / len) > 0.25 ? Math.sign(dy) : 0;
  // fire when a hazard sits roughly ahead of the drone
  let fire = false;
  for (const h of [...f.mines, ...f.rocks, ...f.drones]) {
    const hx = h.x - p.x, hy = h.y - p.y;
    const hd = Math.hypot(hx, hy) || 1;
    const dot = (hx / hd) * Math.cos(p.angle) + (hy / hd) * Math.sin(p.angle);
    if (hd < 320 && dot > 0.86) { fire = true; break; }
  }
  return { ax, ay, fire, dash: false };
}

export function stageShot(name, g) {
  g.resetGame();
  if (name === 'draft') {
    // play until the first wave clears, then open the draft
    for (let i = 0; i < 600 / STEP; i += 1) {
      const a = autopilot(g, false);
      if (g.stepPlay(STEP, a.ax, a.ay, a.fire, a.dash)) break;
      if (g.screen === 'draft') break;
    }
    if (g.screen !== 'draft') {
      // fallback: force the draft open so the shot always exists
      g.field.collected = g.field.quota;
      g.openDraft();
    }
    return 'draft';
  }
  if (name === 'play') {
    for (let i = 0; i < PLAY_SECONDS / STEP; i += 1) {
      const a = autopilot(g, false);
      if (g.stepPlay(STEP, a.ax, a.ay, a.fire, a.dash)) break;
      if (g.screen === 'draft') { g.closeDraft(0); }
    }
    return g.screen === 'over' ? 'over' : 'play';
  }
  if (name === 'end') {
    for (let i = 0; i < END_SECONDS / STEP; i += 1) {
      const a = autopilot(g, true);
      if (g.stepPlay(STEP, a.ax, a.ay, a.fire, a.dash)) break;
      if (g.screen === 'draft') { g.closeDraft(0); }
      if (g.screen === 'over') break;
    }
    if (g.screen !== 'over') {
      g.player.hull = 0;
      g.player.alive = false;
      g.finishGame();
    }
    return 'over';
  }
  // start (default): idle title over a live field for a few seconds
  g.screen = 'title';
  for (let i = 0; i < 5 / STEP; i += 1) g.stepTitle(STEP);
  return 'title';
}

export { rollDraft, waveClearBonus };
