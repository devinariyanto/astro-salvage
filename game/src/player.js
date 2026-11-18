// The salvage drone: a point with velocity, inertia, a short dash that
// grants brief invulnerability, and a pulse cannon with a cooldown.
// All numbers live here so tuning the feel means editing one file.
import { clamp, FIELD_H, FIELD_W } from './storage.js';

export const BASE = {
  accel: 1500, drag: 2.6, maxSpeed: 330,
  radius: 16, fireCooldown: 0.34, dashCooldown: 2.4,
  dashTime: 0.22, dashSpeed: 780, invulnTime: 1.1,
};

export function createPlayer() {
  return {
    x: FIELD_W / 2, y: FIELD_H / 2, vx: 0, vy: 0,
    angle: -Math.PI / 2, hull: 3, maxHull: 3, radius: BASE.radius,
    fireTimer: 0, dashTimer: 0, dashLeft: 0, invuln: 0,
    speedMul: 1, damage: 1, magnet: 110, cargoMul: 1,
    alive: true,
  };
}

export function resetPlayer(p) {
  const fresh = createPlayer();
  Object.assign(p, fresh);
}

// Aim follows the mouse when it has moved, otherwise the direction of travel.
export function aimAngle(p, input) {
  if (input.mouseSeen) return Math.atan2(input.mouseY - p.y, input.mouseX - p.x);
  if (Math.hypot(p.vx, p.vy) > 40) return Math.atan2(p.vy, p.vx);
  return p.angle;
}

export function updatePlayer(p, dt, ax, ay, wantDash, aim) {
  p.angle = aim;
  if (p.fireTimer > 0) p.fireTimer -= dt;
  if (p.dashLeft > 0) p.dashLeft -= dt;
  if (p.invuln > 0) p.invuln -= dt;

  if (wantDash && p.dashTimer <= 0 && (ax !== 0 || ay !== 0 || Math.hypot(p.vx, p.vy) > 60)) {
    p.dashTimer = BASE.dashCooldown * (p.dashMul ?? 1);
    p.dashLeft = BASE.dashTime;
    p.invuln = Math.max(p.invuln, BASE.dashTime + 0.25);
    const len = Math.hypot(ax, ay) || 1;
    const dx = ax !== 0 || ay !== 0 ? ax / len : Math.cos(p.angle);
    const dy = ax !== 0 || ay !== 0 ? ay / len : Math.sin(p.angle);
    p.vx = dx * BASE.dashSpeed;
    p.vy = dy * BASE.dashSpeed;
    return true; // dashed this frame
  }
  if (p.dashTimer > 0) p.dashTimer -= dt;

  if (p.dashLeft <= 0) {
    p.vx += ax * BASE.accel * p.speedMul * dt;
    p.vy += ay * BASE.accel * p.speedMul * dt;
    const damp = Math.exp(-BASE.drag * dt);
    p.vx *= damp; p.vy *= damp;
    const sp = Math.hypot(p.vx, p.vy);
    const cap = BASE.maxSpeed * p.speedMul;
    if (sp > cap) { p.vx = (p.vx / sp) * cap; p.vy = (p.vy / sp) * cap; }
  }
  p.x = clamp(p.x + p.vx * dt, 24, FIELD_W - 24);
  p.y = clamp(p.y + p.vy * dt, 24, FIELD_H - 24);
  if (p.x === 24 || p.x === FIELD_W - 24) p.vx = 0;
  if (p.y === 24 || p.y === FIELD_H - 24) p.vy = 0;
  return false;
}

export function canFire(p) { return p.fireTimer <= 0; }
export function noteFired(p) { p.fireTimer = BASE.fireCooldown; }
