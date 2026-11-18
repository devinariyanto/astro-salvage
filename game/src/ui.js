// All canvas drawing: parallax starfield + nebula backdrop, the drone
// and every entity drawn procedurally, the HUD, and the five screens
// (title, play, draft, pause, game over). Nothing here changes game
// state; it only paints what main.js hands it.
import { FIELD_H, FIELD_W, makeRng, range } from './storage.js';
import { drawFx } from './particles.js';

const STARS = [];
{
  const rng = makeRng(1337);
  for (let i = 0; i < 170; i += 1) {
    STARS.push({ x: rng() * FIELD_W, y: rng() * FIELD_H, z: 0.25 + rng() * 0.75, r: 0.6 + rng() * 1.6, tw: rng() * Math.PI * 2 });
  }
}
const NEBULAE = [];
{
  const rng = makeRng(4242);
  const cols = ['#1b2a5e', '#3a1b5e', '#0e3a4a', '#4a1b2e'];
  for (let i = 0; i < 7; i += 1) {
    NEBULAE.push({ x: rng() * FIELD_W, y: rng() * FIELD_H, r: 160 + rng() * 220, c: cols[i % cols.length] });
  }
}

function poly(ctx, x, y, r, points, rot) {
  ctx.beginPath();
  for (let i = 0; i < points; i += 1) {
    const a = rot + (i / points) * Math.PI * 2;
    const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawBackground(ctx, t, px, py) {
  ctx.fillStyle = '#05070f';
  ctx.fillRect(0, 0, FIELD_W, FIELD_H);
  for (const n of NEBULAE) {
    const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
    g.addColorStop(0, n.c);
    g.addColorStop(1, 'rgba(5,7,15,0)');
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = g;
    ctx.fillRect(n.x - n.r, n.y - n.r, n.r * 2, n.r * 2);
  }
  ctx.globalAlpha = 1;
  for (const s of STARS) {
    const ox = ((s.x - px * 0.03 * s.z) % FIELD_W + FIELD_W) % FIELD_W;
    const oy = ((s.y - py * 0.03 * s.z) % FIELD_H + FIELD_H) % FIELD_H;
    ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.8 + s.tw));
    ctx.fillStyle = '#dfe9ff';
    ctx.beginPath();
    ctx.arc(ox, oy, s.r * s.z, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawDrone(ctx, p, t) {
  ctx.save();
  ctx.translate(p.x, p.y);
  if (p.invuln > 0 && Math.floor(t * 14) % 2 === 0) ctx.globalAlpha = 0.45;
  // thruster flame
  const flame = 10 + Math.sin(t * 30) * 4 + Math.hypot(p.vx, p.vy) * 0.012;
  ctx.rotate(p.angle);
  ctx.fillStyle = '#ffb347';
  ctx.beginPath();
  ctx.moveTo(-14, 5); ctx.lineTo(-14 - flame, 0); ctx.lineTo(-14, -5);
  ctx.closePath(); ctx.fill();
  // hull: arrow-shaped drone
  ctx.fillStyle = '#37c8e8';
  ctx.strokeStyle = '#bff3ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(20, 0); ctx.lineTo(-12, 12); ctx.lineTo(-6, 0); ctx.lineTo(-12, -12);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // cockpit
  ctx.fillStyle = '#ffe9a3';
  ctx.beginPath(); ctx.arc(5, 0, 4.5, 0, Math.PI * 2); ctx.fill();
  // dash-ready ring
  if (p.dashTimer <= 0) {
    ctx.strokeStyle = 'rgba(126,231,255,0.7)';
    ctx.beginPath(); ctx.arc(0, 0, 22 + Math.sin(t * 4) * 1.5, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

function drawEntities(ctx, g, t) {
  const f = g.field;
  // cargo pods: glowing hexagons, gold ones are worth more
  for (const c of f.cargo) {
    const bob = Math.sin(c.bob) * 3;
    ctx.save();
    ctx.translate(c.x, c.y + bob);
    ctx.shadowColor = c.hue; ctx.shadowBlur = 12;
    ctx.fillStyle = c.hue;
    poly(ctx, 0, 0, c.r, 6, t * 0.4);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#0a1420';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(c.value >= 50 ? '$' : '+', 0, 1);
    ctx.restore();
  }
  // mines: spiky red circles
  for (const m of f.mines) {
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.rotate(m.a);
    ctx.fillStyle = '#ff5d5d';
    ctx.strokeStyle = '#ffb0b0';
    ctx.lineWidth = 1.5;
    poly(ctx, 0, 0, m.r, 8, 0);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2a0505';
    ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff5d5d';
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * (m.r + 3), Math.sin(a) * (m.r + 3), 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  // asteroids: grey-brown jagged rocks
  for (const r of f.rocks) {
    ctx.save();
    ctx.translate(r.x, r.y);
    ctx.rotate(r.a);
    ctx.fillStyle = '#8d7b68';
    ctx.strokeStyle = '#c9b49a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < r.verts.length; i += 1) {
      const a = (i / r.verts.length) * Math.PI * 2;
      const px = Math.cos(a) * r.r * r.verts[i], py = Math.sin(a) * r.r * r.verts[i];
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.arc(-r.r * 0.25, r.r * 0.1, r.r * 0.22, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  // enemy drones: magenta darts
  for (const d of f.drones) {
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate(Math.atan2(g.player.y - d.y, g.player.x - d.x));
    ctx.fillStyle = '#ff7ad9';
    ctx.strokeStyle = '#ffc2ec';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(18, 0); ctx.lineTo(-10, 10); ctx.lineTo(-4, 0); ctx.lineTo(-10, -10);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2a0518';
    ctx.beginPath(); ctx.arc(2, 0, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  // pulses
  for (const pu of f.pulses) {
    ctx.save();
    ctx.translate(pu.x, pu.y);
    ctx.shadowColor = '#7ee7ff'; ctx.shadowBlur = 14;
    ctx.fillStyle = '#bff3ff';
    ctx.beginPath(); ctx.arc(0, 0, pu.r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

function hullHearts(ctx, hull, maxHull) {
  ctx.font = '20px system-ui, sans-serif';
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  let s = '';
  for (let i = 0; i < maxHull; i += 1) s += i < hull ? '♥' : '♡';
  ctx.fillStyle = hull <= 1 ? '#ff5d5d' : '#ff7ad9';
  ctx.fillText(s, 16, 58);
}

function drawHud(ctx, g) {
  const p = g.player;
  ctx.fillStyle = 'rgba(5,10,20,0.55)';
  ctx.fillRect(0, 0, FIELD_W, 64);
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`SCORE ${g.score}`, 16, 30);
  hullHearts(ctx, p.hull, p.maxHull);
  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.fillStyle = '#ffe9a3';
  ctx.fillText(`WAVE ${g.wave}   CARGO ${Math.min(g.field.collected, g.field.quota)}/${g.field.quota}`, 330, 30);
  if (g.combo > 1) {
    ctx.fillStyle = '#7ee7ff';
    ctx.fillText(`COMBO x${Math.min(3, 1 + (g.combo - 1) * 0.25).toFixed(2)} (${g.combo})`, 330, 56);
  }
  ctx.textAlign = 'right';
  ctx.fillStyle = '#9fb4d8';
  ctx.fillText(`BEST ${g.best}`, FIELD_W - 16, 30);
  const dashReady = p.dashTimer <= 0;
  ctx.fillStyle = dashReady ? '#7ee7ff' : '#5a6b85';
  ctx.fillText(dashReady ? 'DASH READY [SHIFT]' : `DASH ${p.dashTimer.toFixed(1)}s`, FIELD_W - 16, 56);
  if (g.muted) {
    ctx.fillStyle = '#9fb4d8';
    ctx.textAlign = 'center';
    ctx.fillText('MUTED (M)', FIELD_W / 2, 30);
  }
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(6,12,26,0.82)';
  ctx.strokeStyle = 'rgba(126,231,255,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 14);
  ctx.fill(); ctx.stroke();
}

function centerText(ctx, text, y, size, color, bold = true) {
  ctx.fillStyle = color;
  ctx.font = `${bold ? 'bold ' : ''}${size}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(text, FIELD_W / 2, y);
}

export function drawScreen(ctx, g, screen, t) {
  const p = g.player;
  ctx.save();
  ctx.translate(g.fx.shakeX, g.fx.shakeY);
  drawBackground(ctx, t, p.x, p.y);
  if (screen === 'title') {
    drawEntities(ctx, g, t);
    drawDrone(ctx, p, t);
    ctx.fillStyle = 'rgba(5,7,15,0.45)';
    ctx.fillRect(0, 0, FIELD_W, FIELD_H);
    centerText(ctx, 'ASTRO SALVAGE', 168, 64, '#7ee7ff');
    centerText(ctx, 'Salvage the debris field. Dodge the mines. Get rich.', 214, 22, '#dfe9ff', false);
    centerText(ctx, `BEST SCORE  ${g.best}`, 258, 20, '#ffe9a3', false);
    const lines = [
      'WASD / ARROWS — fly    SPACE / CLICK — fire pulse',
      'SHIFT — dash (brief shield)    P — pause    R — restart    M — mute',
      'Collect cargo pods to clear each wave, then draft an upgrade.',
      'Mines and asteroids hurt. Enemy drones hunt you from wave 3.',
    ];
    lines.forEach((ln, i) => centerText(ctx, ln, 320 + i * 30, 19, '#b9c8e2', false));
    centerText(ctx, 'PRESS SPACE OR CLICK TO LAUNCH', 520, 26, '#ffffff');
    if (Math.floor(t * 2) % 2 === 0) centerText(ctx, '▼', 556, 22, '#7ee7ff');
  } else if (screen === 'play' || screen === 'pause') {
    drawEntities(ctx, g, t);
    drawDrone(ctx, p, t);
    drawFx(ctx, g.fx);
    drawHud(ctx, g);
    if (screen === 'pause') {
      ctx.fillStyle = 'rgba(5,7,15,0.6)';
      ctx.fillRect(0, 0, FIELD_W, FIELD_H);
      centerText(ctx, 'PAUSED', 300, 56, '#ffffff');
      centerText(ctx, 'P or SPACE to resume — R to restart', 350, 22, '#b9c8e2', false);
    }
  } else if (screen === 'draft') {
    drawEntities(ctx, g, t);
    drawDrone(ctx, p, t);
    drawFx(ctx, g.fx);
    drawHud(ctx, g);
    ctx.fillStyle = 'rgba(5,7,15,0.62)';
    ctx.fillRect(0, 0, FIELD_W, FIELD_H);
    centerText(ctx, `WAVE ${g.wave} CLEARED!`, 130, 44, '#7ee7ff');
    centerText(ctx, `Bonus +${g.lastBonus}   —   pick one upgrade (1 / 2 / 3 or click)`, 172, 20, '#ffe9a3', false);
    g.draftRects = [];
    const cw = 300, ch = 170, gap = 30;
    const total = cw * 3 + gap * 2;
    const x0 = (FIELD_W - total) / 2;
    g.draft.forEach((up, i) => {
      const x = x0 + i * (cw + gap), y = 230;
      g.draftRects.push({ x, y, w: cw, h: ch, index: i });
      panel(ctx, x, y, cw, ch);
      ctx.fillStyle = '#7ee7ff';
      ctx.font = '40px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(up.icon, x + cw / 2, y + 58);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 19px system-ui, sans-serif';
      ctx.fillText(up.name, x + cw / 2, y + 96);
      ctx.fillStyle = '#b9c8e2';
      ctx.font = '16px system-ui, sans-serif';
      wrapText(ctx, up.desc, x + cw / 2, y + 126, cw - 28, 21);
      ctx.fillStyle = '#5a6b85';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.fillText(`[${i + 1}]`, x + cw / 2, y + ch - 14);
    });
  } else if (screen === 'over') {
    drawEntities(ctx, g, t);
    drawFx(ctx, g.fx);
    ctx.fillStyle = 'rgba(10,4,8,0.6)';
    ctx.fillRect(0, 0, FIELD_W, FIELD_H);
    centerText(ctx, 'DRONE LOST', 240, 60, '#ff5d5d');
    centerText(ctx, `SCORE  ${g.score}`, 320, 34, '#ffffff');
    centerText(ctx, `BEST  ${g.best}      WAVE  ${g.wave}      CARGO  ${g.cargoGot}`, 368, 22, '#ffe9a3', false);
    if (g.score >= g.best && g.score > 0) centerText(ctx, 'NEW BEST!', 414, 24, '#7ee7ff');
    centerText(ctx, 'PRESS R OR SPACE TO FLY AGAIN', 480, 24, '#ffffff');
  }
  ctx.restore();
}

function wrapText(ctx, text, cx, y, maxW, lh) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, cx, yy);
      line = w; yy += lh;
    } else line = test;
  }
  ctx.fillText(line, cx, yy);
}

export function fitCanvas(canvas) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = window.innerWidth, h = window.innerHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform((canvas.width / FIELD_W), 0, 0, (canvas.height / FIELD_H), 0, 0);
  return ctx;
}
