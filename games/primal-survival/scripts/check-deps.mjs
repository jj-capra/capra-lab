/* Fails the build if the API function could not be bundled.
 *
 * This exists because of a genuinely nasty failure mode. The site build needs
 * no dependencies at all, so on a machine where `npm install` was never run the
 * build succeeds, the static site deploys, and the API function is quietly
 * dropped because esbuild cannot resolve its imports. The result is a site that
 * looks completely fine and answers 404 to every /api route — which the client
 * reports as "Offline", pointing nowhere near the real cause.
 *
 * So: resolve every bare import the function reaches, and stop the build with
 * instructions if any of them are missing.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = path.join(ROOT, 'netlify', 'functions', 'api.mjs');

/* walk the function's own module graph, collecting bare specifiers */
const seen = new Set();
const bare = new Map();
function walk(file) {
  if (seen.has(file) || !fs.existsSync(file)) return;
  seen.add(file);
  const src = fs.readFileSync(file, 'utf8');
  const re = /(?:^|[^\w.])(?:import|export)[\s\S]{0,200}?from\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  let m;
  while ((m = re.exec(src))) {
    const spec = m[1] || m[2];
    if (!spec) continue;
    if (spec.startsWith('.')) walk(path.resolve(path.dirname(file), spec));
    else if (!spec.startsWith('node:')) bare.set(spec, path.relative(ROOT, file));
  }
}
walk(ENTRY);

const missing = [];
for (const [spec, from] of bare) {
  try { import.meta.resolve(spec, pathToFileURL(ENTRY).href); }
  catch { missing.push({ spec, from }); }
}

if (missing.length) {
  console.error('\n  The API function cannot be bundled — these packages are not installed:\n');
  missing.forEach(m => console.error('      ' + m.spec + '   (needed by ' + m.from + ')'));
  console.error('\n  Run  npm install  and deploy again.\n');
  console.error('  Without this the site still deploys, but with no API at all:');
  console.error('  every /api route answers 404 and the game reports "Offline".\n');
  process.exit(1);
}
console.log('function deps: ' + (bare.size ? [...bare.keys()].join(', ') + ' resolve' : 'none needed'));
