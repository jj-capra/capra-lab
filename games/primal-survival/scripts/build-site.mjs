/* Assembles the static site Netlify publishes.
 *
 * The browser loads ES modules directly — no bundler — so the only job here is
 * to lay the files out so the relative imports still resolve. app.js asks for
 * ../shared/engine.js, so client/ and shared/ have to stay siblings under the
 * publish root, with index.html hoisted to the top so the site serves at /.
 *
 *   public/index.html      <- client/index.html, script src repointed
 *   public/client/*.js
 *   public/shared/*.js     <- byte-identical to what the function imports
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public');

async function copyJs(dir) {
  const from = path.join(ROOT, dir), to = path.join(OUT, dir);
  await fs.mkdir(to, { recursive: true });
  for (const f of await fs.readdir(from)) {
    if (f.endsWith('.js')) await fs.copyFile(path.join(from, f), path.join(to, f));
  }
}

/* A missing export/import pair works in the bundled single file and throws in
 * a browser, so the check runs before anything is published. Netlify runs this
 * script as its build command, which makes a broken module graph a failed
 * build rather than a broken site. */
await import('./check-modules.mjs');
await import('./check-deps.mjs');

await fs.rm(OUT, { recursive: true, force: true });
await fs.mkdir(OUT, { recursive: true });
await copyJs('client');
await copyJs('shared');

const html = await fs.readFile(path.join(ROOT, 'client', 'index.html'), 'utf8');
await fs.writeFile(path.join(OUT, 'index.html'),
  html.replace('src="./app.js"', 'src="./client/app.js"'));

/* a 404 that is the game, so a mistyped path still plays */
await fs.copyFile(path.join(OUT, 'index.html'), path.join(OUT, '404.html'));

const count = (await fs.readdir(path.join(OUT, 'client'))).length +
              (await fs.readdir(path.join(OUT, 'shared'))).length;
console.log('site built -> public/  (' + count + ' modules + index.html)');
