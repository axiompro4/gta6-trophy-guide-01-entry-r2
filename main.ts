// Leonida Trophy Tracker — hand-in program (Node 22, standard library only).
// The guide is plain static files in app/ (index.html, style.css, app.js and
// data/trophies.json): no build step, no network at run time, progress saved in
// the browser's localStorage. This program copies app/ and screenshots/ from
// beside this file into the output directory and writes dossier.json — the
// summary the judge reads — with the vendored make.fun library, which must
// stay byte-for-byte as the kit shipped it.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outDir, { recursive: true });
cpSync(join(here, 'app'), join(outDir, 'app'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
}

// The caps mirror the scorer's: at most 4 screenshots, each at most 256 KiB;
// app/ at most 993 files and directories and 48 MiB in all; the dossier text
// at most 160 KiB.
writeFileSync(
  join(outDir, 'dossier.json'),
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  }),
);
