// Particles and floating score text: purely cosmetic, spawned by the
// rules modules and advanced/drawn here. A shake value drives the
// screen-shake offset the renderer applies each frame.
export function createFx() {
  return { parts: [], texts: [], shake: 0, shakeX: 0, shakeY: 0 };
}

export function burst(fx, x, y, color, n, speed, life = 0.6, size = 3) {
  for (let i = 0; i < n; i += 1) {
    const a = Math.random() * Math.PI * 2;
    const s = speed * (0.3 + Math.random() * 0.7);
    fx.parts.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life: life * (0.6 + Math.random() * 0.6), maxLife: life,
      size: size * (0.6 + Math.random() * 0.8), color,
    });
  }
}

export function thruster(fx, x, y, angle) {
  fx.parts.push({
    x: x - Math.cos(angle) * 18, y: y - Math.sin(angle) * 18,
    vx: -Math.cos(angle) * 90 + (Math.random() - 0.5) * 40,
    vy: -Math.sin(angle) * 90 + (Math.random() - 0.5) * 40,
    life: 0.28, maxLife: 0.28, size: 2.5, color: '#ffb347',
  });
}

export function floatText(fx, x, y, text, color = '#ffe9a3') {
  fx.texts.push({ x, y, text, color, life: 0.9, maxLife: 0.9 });
}

export function addShake(fx, amount) {
  fx.shake = Math.min(18, fx.shake + amount);
}

export function updateFx(fx, dt) {
  for (let i = fx.parts.length - 1; i >= 0; i -= 1) {
    const p = fx.parts[i];
    p.life -= dt;
    if (p.life <= 0) { fx.parts.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vx *= Math.exp(-2 * dt); p.vy *= Math.exp(-2 * dt);
  }
  for (let i = fx.texts.length - 1; i >= 0; i -= 1) {
    const t = fx.texts[i];
    t.life -= dt; t.y -= 34 * dt;
    if (t.life <= 0) fx.texts.splice(i, 1);
  }
  if (fx.shake > 0) {
    fx.shake = Math.max(0, fx.shake - 42 * dt);
    fx.shakeX = (Math.random() - 0.5) * fx.shake;
    fx.shakeY = (Math.random() - 0.5) * fx.shake;
  } else { fx.shakeX = 0; fx.shakeY = 0; }
}

export function drawFx(ctx, fx) {
  for (const p of fx.parts) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center';
  ctx.font = 'bold 17px system-ui, sans-serif';
  for (const t of fx.texts) {
    ctx.globalAlpha = Math.max(0, t.life / t.maxLife);
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.globalAlpha = 1;
}
