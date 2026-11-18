// Astro Salvage — boot and the one loop. Input is read every frame, the
// world advances in fixed 1/60 s steps, and ui.js paints the result.
// Screens: title → play → (draft between waves) → game over, plus pause.
// ?shot=start|play|draft|end&seed=N stages a deterministic scene for
// screenshots instead of running the loop.
import { readBest, saveBest, makeRng, FIELD_H, FIELD_W } from './storage.js';
import { createInput, moveAxis, firing, dashing, takeActions, takeDraftPick, ACT_CONFIRM, ACT_PAUSE, ACT_RESTART, ACT_MUTE } from './input.js';
import { createPlayer, resetPlayer, updatePlayer, aimAngle, canFire, noteFired } from './player.js';
import { createField, updateField, topUpField, firePulse, clearHazards, spawnCargo, spawnMine, spawnRock, EV_PICKUP, EV_HURT, EV_KILL, EV_CLEARED } from './field.js';
import { createFx, updateFx, burst, floatText, addShake, thruster } from './particles.js';
import { createAudio, unlockAudio, setMuted, sfx } from './audio.js';
import { startWave, waveClearBonus } from './waves.js';
import { rollDraft, applyUpgrade } from './upgrades.js';
import { drawScreen, fitCanvas } from './ui.js';
import { stageShot } from './shots.js';

export const STEP = 1 / 60;
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');
let ctx = fitCanvas(canvas);
window.addEventListener('resize', () => { ctx = fitCanvas(canvas); });

// ---- the whole game state in one object, so shots.js can drive it too ----
const g = {
  player: createPlayer(),
  field: createField(seed),
  fx: createFx(),
  audio: createAudio(),
  rng: makeRng(seed ^ 0x9e3779b9),
  screen: 'title',
  score: 0, best: readBest(), combo: 0, comboTimer: 0,
  wave: 1, waveTimer: 0, cargoGot: 0, muted: false,
  draft: [], draftRects: [], lastBonus: 0, lastUpgrade: '',
  time: 0,
};

function announce(msg) { statusEl.textContent = msg; }

g.resetGame = function resetGame() {
  resetPlayer(g.player);
  g.field = createField(seed);
  g.fx = createFx();
  g.score = 0; g.combo = 0; g.comboTimer = 0;
  g.wave = 1; g.cargoGot = 0; g.draft = []; g.lastBonus = 0; g.lastUpgrade = '';
  g.screen = 'play';
  startWave(g, 1);
  spawnCargo(g.field, g.player, 20);
  spawnCargo(g.field, g.player, 20);
  spawnMine(g.field, g.player);
};

g.stepTitle = function stepTitle(dt) {
  g.time += dt;
  const f = g.field;
  if (f.cargo.length < 4 && g.rng() < dt * 2) spawnCargo(f, g.player, g.rng() < 0.2 ? 50 : 20);
  if (f.mines.length < 3 && g.rng() < dt) spawnMine(f, g.player);
  if (f.rocks.length < 2 && g.rng() < dt * 0.6) spawnRock(f, g.player, 1);
  for (const c of f.cargo) c.bob += dt * 2;
  for (const m of f.mines) { m.a += m.spin * dt; m.x += m.vx * dt; m.y += m.vy * dt; }
  for (const r of f.rocks) { r.a += r.spin * dt; r.x += r.vx * dt; r.y += r.vy * dt; }
  updateFx(g.fx, dt);
};

g.openDraft = function openDraft() {
  g.lastBonus = waveClearBonus(g.wave);
  g.score += g.lastBonus;
  g.draft = rollDraft(g.rng, 3);
  g.screen = 'draft';
  clearHazards(g.field);
  sfx.draft(g.audio);
  announce(`Wave ${g.wave} cleared. Pick an upgrade.`);
};

g.closeDraft = function closeDraft(index) {
  const up = g.draft[index] ?? g.draft[0];
  if (up) {
    applyUpgrade(g, up);
    floatText(g.fx, g.player.x, g.player.y - 30, up.name, '#7ee7ff');
  }
  g.draft = [];
  startWave(g, g.wave + 1);
  g.screen = 'play';
  sfx.horn(g.audio);
  announce(`Wave ${g.wave}.`);
};

g.finishGame = function finishGame() {
  g.screen = 'over';
  if (g.score > g.best) { g.best = g.score; saveBest(g.best); }
  announce(`Game over. Score ${g.score}. Best ${g.best}.`);
};

// One fixed play step. Returns true when the run just ended.
g.stepPlay = function stepPlay(dt, ax, ay, wantFire, wantDash) {
  g.time += dt;
  g.waveTimer += dt;
  const p = g.player;
  if (g.comboTimer > 0) {
    g.comboTimer -= dt;
    if (g.comboTimer <= 0) g.combo = 0;
  }
  const aim = g._input ? aimAngle(p, g._input)
    : (Math.hypot(p.vx, p.vy) > 40 ? Math.atan2(p.vy, p.vx) : p.angle);
  const dashed = updatePlayer(p, dt, ax, ay, wantDash, aim);
  if (dashed) { sfx.dash(g.audio); burst(g.fx, p.x, p.y, '#7ee7ff', 10, 200, 0.4, 2); }
  if (Math.hypot(p.vx, p.vy) > 120) thruster(g.fx, p.x, p.y, p.angle);
  if (wantFire && canFire(p)) {
    noteFired(p);
    firePulse(g.field, p);
    sfx.shoot(g.audio);
  }
  const events = updateField(g.field, g, dt);
  if (events & EV_PICKUP) sfx.pickup(g.audio, g.combo);
  if (events & EV_KILL) sfx.zap(g.audio);
  if (events & EV_HURT) {
    sfx.hurt(g.audio);
    if (!p.alive) {
      burst(g.fx, p.x, p.y, '#ff5d5d', 30, 380);
      burst(g.fx, p.x, p.y, '#ffe9a3', 16, 260);
      addShake(g.fx, 16);
      sfx.boom(g.audio);
      g.finishGame();
      return true;
    }
  }
  if (events & EV_CLEARED) {
    g.openDraft();
    return false;
  }
  topUpField(g.field, g, dt);
  updateFx(g.fx, dt);
  return false;
};

// Probe hook: window.__astro exposes live state for automated checks.
window.__astro = g;

function runShot(name) {
  const screen = stageShot(name, g);
  let painted = 0;
  function paint() {
    drawScreen(ctx, g, screen, g.time + painted * 0.05);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  g._input = input;
  let accumulator = 0;
  let last = performance.now();

  function startGame() {
    unlockAudio(g.audio);
    g.resetGame();
    announce('Playing. Collect cargo, dodge mines.');
  }

  function handleActions() {
    const actions = takeActions(input);
    if (actions & ACT_MUTE) {
      g.muted = !g.muted;
      setMuted(g.audio, g.muted);
    }
    if (actions & ACT_RESTART && (g.screen === 'play' || g.screen === 'pause' || g.screen === 'over')) {
      startGame();
      return;
    }
    if (g.screen === 'draft') {
      const pick = takeDraftPick(input);
      if (pick >= 0 && pick < g.draft.length) { g.closeDraft(pick); return; }
      if (actions & ACT_CONFIRM) {
        // click on a card picks it; click elsewhere picks the middle card
        const r = g.draftRects;
        const mx = input.mouseX, my = input.mouseY;
        for (let i = 0; i < r.length; i += 1) {
          if (mx >= r[i].x && mx <= r[i].x + r[i].w && my >= r[i].y && my <= r[i].y + r[i].h) {
            g.closeDraft(i); return;
          }
        }
        g.closeDraft(1);
        return;
      }
      return;
    }
    if (actions & ACT_CONFIRM && (g.screen === 'title' || g.screen === 'over')) {
      unlockAudio(g.audio);
      startGame();
    } else if (actions & ACT_PAUSE && g.screen === 'play') {
      g.screen = 'pause';
      announce('Paused.');
    } else if (actions & (ACT_PAUSE | ACT_CONFIRM) && g.screen === 'pause') {
      g.screen = 'play';
      announce('Playing.');
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (g.screen === 'title') {
      while (accumulator >= STEP) { g.stepTitle(STEP); accumulator -= STEP; }
    } else if (g.screen === 'play') {
      const mv = moveAxis(input);
      while (accumulator >= STEP && g.screen === 'play') {
        g.stepPlay(STEP, mv.x, mv.y, firing(input), dashing(input));
        accumulator -= STEP;
      }
      if (g.screen !== 'play') accumulator = 0;
    } else {
      accumulator = 0;
      updateFx(g.fx, 1 / 60);
    }
    drawScreen(ctx, g, g.screen, g.time);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && g.screen === 'play') { g.screen = 'pause'; announce('Paused.'); }
  });

  announce('Astro Salvage. Press Space or click to launch.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
