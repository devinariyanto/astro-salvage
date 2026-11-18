// Astro Salvage entry point (Node 22, standard library only).
//
// The game itself is plain static files under game/ — index.html plus ES
// modules, no libraries and no network calls — so a desktop browser can
// load it offline. This script is the handoff to the judge: it copies
// game/ and screenshots/ next to this file into the output directory
// (/output inside the grader, or $MAKEFUN_OUTPUT_DIR anywhere else) and
// writes /output/dossier.json, the summary the judge reads, using the
// vendored make.fun helper in ./vendor/makefun-game.ts.
//
// Run it locally with:
//   MAKEFUN_OUTPUT_DIR=/tmp/astro-out node main.ts
// Play the game locally with `node serve.ts` → http://localhost:8080.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The scorer's caps: at most 163840 bytes of text, at most 4 screenshots
// of at most 256 KiB each, at most 993 files totalling 48 MiB under game/,
// and no game/ path longer than 1000 bytes. An entry that breaks any of
// these is refused by the scorer, so refuse it here first.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
