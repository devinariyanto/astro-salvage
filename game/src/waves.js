// Wave pacing: each wave asks the pilot to salvage a quota of cargo
// pods. Clearing a wave banks a bonus, raises the next quota and the
// hazard density, and opens the upgrade draft.
export function waveQuota(wave) { return 5 + wave; }

export function startWave(g, wave) {
  g.wave = wave;
  g.field.quota = waveQuota(wave);
  g.field.collected = 0;
  g.field.spawnedCargo = 0;
  g.field.cargo.length = 0;
  g.waveTimer = 0;
}

export function waveClearBonus(wave) { return 100 + wave * 50; }
