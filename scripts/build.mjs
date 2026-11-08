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

/* Goat Getaway: a page, its art and the puzzle rules (the same file the server checks solves
   with), plus the practice pens as JSON; its server is netlify/functions/goat-getaway.mjs */
async function buildGoatGetaway() {
  const game = path.join(ROOT, 'games', 'goat-getaway'), out = path.join(ROOT, 'public', 'goat-getaway');
  await fs.rm(out, { recursive: true, force: true });
  await fs.mkdir(path.join(out, 'shared'), { recursive: true });
  for (const f of ['index.html', 'game.js', 'art.js']) await fs.copyFile(path.join(game, f), path.join(out, f));
  await fs.copyFile(path.join(game, 'shared', 'puzzle.mjs'), path.join(out, 'shared', 'puzzle.mjs'));
  const { practicePens } = await import(path.join(game, 'server', 'daily.js'));
  await fs.writeFile(path.join(out, 'practice.json'), JSON.stringify(practicePens()));
  console.log('built public/goat-getaway/');
}

/* Punchline: a page, its art and the clock and scoring rules (the same file the server keeps time
   with). The decks are checked, then baked into games/punchline/server/decks.gen.mjs for its
   function (netlify/functions/punchline.mjs); answers never go into public/. */
async function buildPunchline() {
  const game = path.join(ROOT, 'games', 'punchline'), out = path.join(ROOT, 'public', 'punchline');
  const { loadDecks, problems } = await import(path.join(game, 'server', 'load.mjs'));
  const decks = loadDecks();
  const bad = problems(decks);
  if (bad.length) throw new Error('punchline decks:\n  ' + bad.join('\n  '));
  await fs.writeFile(path.join(game, 'server', 'decks.gen.mjs'),
    `// Built by scripts/build.mjs from games/punchline/decks/. Edit the decks, not this file.\nexport const DECKS = ${JSON.stringify(decks)};\n`);
  await fs.rm(out, { recursive: true, force: true });
  await fs.mkdir(path.join(out, 'shared'), { recursive: true });
  for (const f of ['index.html', 'game.js', 'art.js']) await fs.copyFile(path.join(game, f), path.join(out, f));
  await fs.copyFile(path.join(game, 'shared', 'rules.mjs'), path.join(out, 'shared', 'rules.mjs'));
  console.log(`built public/punchline/ (${decks.length} decks, ${decks.reduce((n, d) => n + d.cards.length, 0)} cards)`);
}

/* Classified: a page, its script and the shared rules and avatars (the share page uses the same
   art). The missions, questions and awards are checked, then baked into
   games/classified/server/content.gen.mjs for its function (netlify/functions/classified.mjs). */
async function buildClassified() {
  const game = path.join(ROOT, 'games', 'classified'), out = path.join(ROOT, 'public', 'classified');
  const { loadContent, problems } = await import(path.join(game, 'server', 'content.mjs'));
  const content = loadContent();
  const bad = problems(content);
  if (bad.length) throw new Error('classified content:\n  ' + bad.join('\n  '));
  await fs.writeFile(path.join(game, 'server', 'content.gen.mjs'),
    `// Built by scripts/build.mjs from games/classified/content/. Edit those files, not this one.\nexport const CONTENT = ${JSON.stringify(content)};\n`);
  await fs.rm(out, { recursive: true, force: true });
  await fs.mkdir(path.join(out, 'shared'), { recursive: true });
  for (const f of ['index.html', 'game.js']) await fs.copyFile(path.join(game, f), path.join(out, f));
  for (const f of ['rules.mjs', 'avatar.mjs']) await fs.copyFile(path.join(game, 'shared', f), path.join(out, 'shared', f));
  console.log(`built public/classified/ (${content.missions.length} missions, ${content.prompts.length} questions, ${content.awards.length} awards)`);
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
await buildGoatGetaway();
await buildPunchline();
await buildClassified();
