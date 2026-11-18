// The between-wave draft: three distinct upgrades, each one a real
// change to the drone's numbers. The pilot picks with 1/2/3 or a click;
// the draft pauses the field while it is open.
export const POOL = [
  { id: 'hull', name: 'REINFORCED HULL', desc: '+1 max hull, repair 1 hull', icon: '▣' },
  { id: 'speed', name: 'ION THRUSTERS', desc: '+18% speed & acceleration', icon: '»' },
  { id: 'magnet', name: 'TRACTOR ARRAY', desc: '+60% cargo magnet radius', icon: '◎' },
  { id: 'damage', name: 'HEAVY PULSE', desc: '+1 pulse damage', icon: '✦' },
  { id: 'life', name: 'SPARE DRONE', desc: '+1 hull right now (max 5)', icon: '♥' },
  { id: 'value', name: 'REFINED CARGO', desc: 'cargo worth 2x from now on', icon: '◆' },
  { id: 'dash', name: 'PHASE DASH', desc: 'dash cooldown halved', icon: '↯' },
];

export function rollDraft(rng, count = 3) {
  const bag = [...POOL];
  const out = [];
  while (out.length < count && bag.length > 0) {
    out.push(bag.splice(Math.floor(rng() * bag.length), 1)[0]);
  }
  return out;
}

export function applyUpgrade(g, up) {
  const p = g.player;
  switch (up.id) {
    case 'hull':
      p.maxHull = Math.min(6, p.maxHull + 1);
      p.hull = Math.min(p.maxHull, p.hull + 1);
      break;
    case 'speed': p.speedMul = Math.min(2, p.speedMul * 1.18); break;
    case 'magnet': p.magnet = Math.min(320, p.magnet * 1.6); break;
    case 'damage': p.damage += 1; break;
    case 'life':
      p.maxHull = Math.min(6, p.maxHull + 1);
      p.hull = Math.min(p.maxHull, p.hull + 1);
      break;
    case 'value': p.cargoMul *= 2; break;
    case 'dash': p.dashMul = (p.dashMul ?? 1) * 0.5; break;
    default: break;
  }
  g.lastUpgrade = up.name;
}
