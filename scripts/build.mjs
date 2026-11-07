/* Capra Lab build: lays the native games out under public/ next to the hub.
 *
 * The hub (public/index.html, public/lab/, public/assets/) is committed as-is.
 * Each native game keeps its source in games/<game>/ and is copied to
 * public/<game>/ here. Primal Survival keeps the layout it had as its own site:
 *
 *   public/primal-survival/index.html      <- games/primal-survival/client/index.html
 *   public/primal-survival/client/*        <- browser modules and assets
 *   public/primal-survival/shared/*        <- byte-identical to what the API imports
 *
 * The game's own checks run first, so a broken module graph or a missing
 * dependency fails the deploy instead of shipping a broken game.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

async function copyDir(from, to) {
  await fs.mkdir(to, { recursive: true });
  for (const entry of await fs.readdir(from, { withFileTypes: true })) {
    if (entry.name === 'index.html') continue;
    const src = path.join(from, entry.name), dst = path.join(to, entry.name);
    if (entry.isDirectory()) await copyDir(src, dst);
    else await fs.copyFile(src, dst);
  }
}

async function buildPrimalSurvival() {
  const game = path.join(ROOT, 'games', 'primal-survival');
  await import(path.join(game, 'scripts', 'check-modules.mjs'));
  await import(path.join(game, 'scripts', 'check-deps.mjs'));

  const out = path.join(ROOT, 'public', 'primal-survival');
  await fs.rm(out, { recursive: true, force: true });
  await copyDir(path.join(game, 'client'), path.join(out, 'client'));
  await copyDir(path.join(game, 'shared'), path.join(out, 'shared'));
  const html = await fs.readFile(path.join(game, 'client', 'index.html'), 'utf8');
  if (!html.includes('src="./app.js"')) throw new Error('primal-survival: index.html no longer loads ./app.js');
  await fs.writeFile(path.join(out, 'index.html'), html.replace('src="./app.js"', 'src="./client/app.js"'));
  console.log('built public/primal-survival/');
}

/* Par-Tee Time is one self-contained page */
async function buildParTeeTime() {
  const out = path.join(ROOT, 'public', 'par-tee-time');
  await fs.rm(out, { recursive: true, force: true });
  await fs.mkdir(out, { recursive: true });
  await fs.copyFile(path.join(ROOT, 'games', 'par-tee-time', 'index.html'), path.join(out, 'index.html'));
  console.log('built public/par-tee-time/');
}

/* Swerve Planet: one page and its icon; its leaderboard is netlify/functions/swerve-planet.mjs */
async function buildSwervePlanet() {
  const game = path.join(ROOT, 'games', 'swerve-planet'), out = path.join(ROOT, 'public', 'swerve-planet');
  await fs.rm(out, { recursive: true, force: true });
  await fs.mkdir(out, { recursive: true });
  for (const f of ['index.html', 'apple-touch-icon.png']) await fs.copyFile(path.join(game, f), path.join(out, f));
  console.log('built public/swerve-planet/');
}

/* Don't Look!: a page and three modules, no server (no leaderboard on purpose) */
async function buildDontLook() {
  const game = path.join(ROOT, 'games', 'dont-look'), out = path.join(ROOT, 'public', 'dont-look');
  await fs.rm(out, { recursive: true, force: true });
  await fs.mkdir(out, { recursive: true });
  for (const f of ['index.html', 'game.js', 'logic.js', 'words.js']) await fs.copyFile(path.join(game, f), path.join(out, f));
  console.log('built public/dont-look/');
}

/* Mind Heist: its own build validates the decks and bundles the app and the function;
   here it writes them into public/mind-heist/ and netlify/functions/mind-heist.mjs */
async function buildMindHeist() {
  const { execFileSync } = await import('node:child_process');
  const out = path.join(ROOT, 'public', 'mind-heist');
  await fs.rm(out, { recursive: true, force: true });
  execFileSync(process.execPath, [path.join(ROOT, 'games', 'mind-heist', 'build.mjs')], {
    stdio: 'inherit',
    env: { ...process.env, MH_PUBLIC: out, MH_FUNCTION: path.join(ROOT, 'netlify', 'functions', 'mind-heist.mjs') },
  });
  console.log('built public/mind-heist/');
}

await buildPrimalSurvival();
await buildMindHeist();
await buildParTeeTime();
await buildSwervePlanet();
await buildDontLook();
