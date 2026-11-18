// The field: cargo pods, mines, asteroids, enemy drones and player
// pulses. Spawning keeps a minimum distance from the drone; movement,
// magnet pull, pulse hits and contact damage are all resolved here.
// Returns event flags the main loop turns into sound, particles and score.
import { FIELD_H, FIELD_W, clamp, dist2, makeRng, range } from './storage.js';
import { addShake, burst, floatText } from './particles.js';

export const EV_PICKUP = 1;
export const EV_HURT = 2;
export const EV_KILL = 4;
export const EV_CLEARED = 8;

export function createField(seed) {
  return {
    rng: makeRng(seed),
    cargo: [], mines: [], rocks: [], drones: [], pulses: [],
    collected: 0, quota: 6, spawnedCargo: 0,
  };
}

function farFromPlayer(rng, p, minD) {
  for (let tries = 0; tries < 12; tries += 1) {
    const x = range(rng, 60, FIELD_W - 60);
    const y = range(rng, 60, FIELD_H - 60);
    if (dist2(x, y, p.x, p.y) > minD * minD) return { x, y };
  }
  return { x: range(rng, 60, FIELD_W - 60), y: range(rng, 60, FIELD_H - 60) };
}

export function spawnCargo(f, p, value) {
  const pos = farFromPlayer(f.rng, p, 200);
  f.cargo.push({ x: pos.x, y: pos.y, r: 13, value, hue: value >= 50 ? '#ffd24d' : '#7ee7ff', bob: f.rng() * Math.PI * 2 });
  f.spawnedCargo += 1;
}

export function spawnMine(f, p) {
  const pos = farFromPlayer(f.rng, p, 260);
  f.mines.push({ x: pos.x, y: pos.y, r: 15, vx: range(f.rng, -14, 14), vy: range(f.rng, -14, 14), spin: range(f.rng, -1.4, 1.4), a: 0 });
}

export function spawnRock(f, p, wave) {
  const pos = farFromPlayer(f.rng, p, 300);
  const edge = Math.floor(f.rng() * 4);
  let x = pos.x, y = pos.y, vx = 0, vy = 0;
  const sp = 40 + wave * 7 + f.rng() * 30;
  if (edge === 0) { x = -30; y = range(f.rng, 0, FIELD_H); vx = sp; vy = range(f.rng, -30, 30); }
  if (edge === 1) { x = FIELD_W + 30; y = range(f.rng, 0, FIELD_H); vx = -sp; vy = range(f.rng, -30, 30); }
  if (edge === 2) { y = -30; x = range(f.rng, 0, FIELD_W); vy = sp; vx = range(f.rng, -30, 30); }
  if (edge === 3) { y = FIELD_H + 30; x = range(f.rng, 0, FIELD_W); vy = -sp; vx = range(f.rng, -30, 30); }
  const verts = [];
  const n = 7 + Math.floor(f.rng() * 3);
  for (let i = 0; i < n; i += 1) verts.push(0.72 + f.rng() * 0.5);
  f.rocks.push({ x, y, vx, vy, r: 18 + f.rng() * 14, hp: 2, spin: range(f.rng, -1, 1), a: f.rng() * Math.PI * 2, verts });
}

export function spawnDrone(f, p) {
  const pos = farFromPlayer(f.rng, p, 340);
  f.drones.push({ x: pos.x, y: pos.y, vx: 0, vy: 0, r: 15, hp: 2, wob: f.rng() * Math.PI * 2 });
}

export function firePulse(f, p) {
  f.pulses.push({
    x: p.x + Math.cos(p.angle) * 22, y: p.y + Math.sin(p.angle) * 22,
    vx: Math.cos(p.angle) * 620 + p.vx * 0.4, vy: Math.sin(p.angle) * 620 + p.vy * 0.4,
    r: 6, life: 0.8, damage: p.damage,
  });
}

// One fixed step of the field. `g` is the whole game state (score, combo,
// hull, fx, wave) so collisions can award points and hurt the drone.
export function updateField(f, g, dt) {
  const p = g.player;
  let events = 0;
  const rng = f.rng;

  // --- pulses ---
  for (let i = f.pulses.length - 1; i >= 0; i -= 1) {
    const pu = f.pulses[i];
    pu.life -= dt;
    pu.x += pu.vx * dt; pu.y += pu.vy * dt;
    if (pu.life <= 0 || pu.x < -20 || pu.x > FIELD_W + 20 || pu.y < -20 || pu.y > FIELD_H + 20) {
      f.pulses.splice(i, 1); continue;
    }
    let consumed = false;
    for (const list of [f.mines, f.rocks, f.drones]) {
      for (let j = list.length - 1; j >= 0; j -= 1) {
        const e = list[j];
        const rr = pu.r + e.r;
        if (dist2(pu.x, pu.y, e.x, e.y) < rr * rr) {
          consumed = true;
          if (e.hp !== undefined) {
            e.hp -= pu.damage;
            if (e.hp <= 0) {
              burst(g.fx, e.x, e.y, list === f.mines ? '#ff5d5d' : '#ffb347', 16, 260);
              list.splice(j, 1);
              events |= EV_KILL;
              g.score += 25;
              floatText(g.fx, e.x, e.y, '+25', '#ffb347');
            } else {
              burst(g.fx, e.x, e.y, '#ffffff', 4, 120, 0.3, 2);
            }
          } else {
            burst(g.fx, e.x, e.y, '#ff5d5d', 18, 300);
            list.splice(j, 1);
            events |= EV_KILL;
            g.score += 25;
            floatText(g.fx, e.x, e.y, '+25', '#ffb347');
          }
          break;
        }
      }
      if (consumed) break;
    }
    if (consumed) f.pulses.splice(i, 1);
  }

  // --- cargo: magnet pull + pickup ---
  for (let i = f.cargo.length - 1; i >= 0; i -= 1) {
    const c = f.cargo[i];
    c.bob += dt * 2;
    const d2 = dist2(c.x, c.y, p.x, p.y);
    if (d2 < p.magnet * p.magnet) {
      const d = Math.sqrt(d2) || 1;
      const pull = 420 * (1 - d / p.magnet);
      c.x += ((p.x - c.x) / d) * pull * dt;
      c.y += ((p.y - c.y) / d) * pull * dt;
    }
    if (d2 < (p.radius + c.r + 4) * (p.radius + c.r + 4)) {
      f.cargo.splice(i, 1);
      f.collected += 1;
      g.combo += 1;
      g.comboTimer = 2.5;
      const mult = Math.min(3, 1 + (g.combo - 1) * 0.25);
      const pts = Math.round(c.value * mult * p.cargoMul);
      g.score += pts;
      g.cargoGot += 1;
      burst(g.fx, c.x, c.y, c.hue, 12, 200);
      floatText(g.fx, c.x, c.y - 10, `+${pts}`, '#ffe9a3');
      events |= EV_PICKUP;
    }
  }

  // --- mines drift and explode on contact ---
  for (let i = f.mines.length - 1; i >= 0; i -= 1) {
    const m = f.mines[i];
    m.a += m.spin * dt;
    m.x = clamp(m.x + m.vx * dt, 20, FIELD_W - 20);
    m.y = clamp(m.y + m.vy * dt, 20, FIELD_H - 20);
    if (p.invuln <= 0 && dist2(m.x, m.y, p.x, p.y) < (m.r + p.radius) * (m.r + p.radius)) {
      f.mines.splice(i, 1);
      burst(g.fx, m.x, m.y, '#ff5d5d', 22, 320);
      addShake(g.fx, 12);
      events |= EV_HURT;
      hurtPlayer(g);
    }
  }

  // --- asteroids drift across; hurt on contact, bounce off walls ---
  for (let i = f.rocks.length - 1; i >= 0; i -= 1) {
    const r = f.rocks[i];
    r.a += r.spin * dt;
    r.x += r.vx * dt; r.y += r.vy * dt;
    if (r.x < -60 || r.x > FIELD_W + 60 || r.y < -60 || r.y > FIELD_H + 60) { f.rocks.splice(i, 1); continue; }
    if (p.invuln <= 0 && dist2(r.x, r.y, p.x, p.y) < (r.r + p.radius - 4) * (r.r + p.radius - 4)) {
      f.rocks.splice(i, 1);
      burst(g.fx, r.x, r.y, '#c9a37e', 20, 300);
      addShake(g.fx, 10);
      events |= EV_HURT;
      hurtPlayer(g);
    }
  }

  // --- enemy drones chase the player ---
  for (let i = f.drones.length - 1; i >= 0; i -= 1) {
    const d = f.drones[i];
    d.wob += dt * 3;
    const dx = p.x - d.x, dy = p.y - d.y;
    const len = Math.hypot(dx, dy) || 1;
    const chase = 95 + g.wave * 6;
    d.vx += (dx / len) * chase * dt;
    d.vy += (dy / len) * chase * dt;
    d.vx *= Math.exp(-1.4 * dt); d.vy *= Math.exp(-1.4 * dt);
    d.x += d.vx * dt + Math.cos(d.wob) * 12 * dt;
    d.y += d.vy * dt + Math.sin(d.wob) * 12 * dt;
    if (p.invuln <= 0 && dist2(d.x, d.y, p.x, p.y) < (d.r + p.radius) * (d.r + p.radius)) {
      f.drones.splice(i, 1);
      burst(g.fx, d.x, d.y, '#ff7ad9', 20, 300);
      addShake(g.fx, 10);
      events |= EV_HURT;
      hurtPlayer(g);
    }
  }

  if (f.collected >= f.quota && f.cargo.length === 0) events |= EV_CLEARED;
  return events;
}

function hurtPlayer(g) {
  const p = g.player;
  p.hull -= 1;
  p.invuln = 1.1;
  g.combo = 0;
  g.comboTimer = 0;
  p.vx *= -0.4; p.vy *= -0.4;
  if (p.hull <= 0) p.alive = false;
}

// Keep the field populated during a wave: cargo up to a small live
// count, plus hazards scaled by wave number.
export function topUpField(f, g, dt) {
  f.spawnAcc = (f.spawnAcc ?? 0) + dt;
  const liveCargo = f.cargo.length;
  const wantCargo = Math.min(5, f.quota - f.collected + 1);
  if (liveCargo < wantCargo && f.spawnAcc > 0.5) {
    spawnCargo(f, g.player, f.rng() < 0.18 ? 50 : 20);
    f.spawnAcc = 0;
  }
  const wantMines = 2 + Math.min(5, g.wave);
  if (f.mines.length < wantMines && f.rng() < dt * 0.5) spawnMine(f, g.player);
  const wantRocks = 1 + Math.min(4, Math.floor(g.wave / 2));
  if (f.rocks.length < wantRocks && f.rng() < dt * 0.6) spawnRock(f, g.player, g.wave);
  if (g.wave >= 3) {
    const wantDrones = Math.min(3, g.wave - 2);
    if (f.drones.length < wantDrones && f.rng() < dt * 0.35) spawnDrone(f, g.player);
  }
}

export function clearHazards(f) {
  f.mines.length = 0; f.rocks.length = 0; f.drones.length = 0; f.pulses.length = 0;
}
