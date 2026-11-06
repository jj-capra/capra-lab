/* Bundles the module tree back into one self-contained index.html.
 *
 * The single file is still a first-class output: it is how the game is handed
 * to someone offline, dropped on a static host, or opened straight off a USB
 * stick. It has no network layer, so it always plays the procedural season. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'dist', 'primal-survival.html');

const seen = new Set();
function inline(file) {
  const abs = path.resolve(file);
  if (seen.has(abs)) return '';
  seen.add(abs);
  let src = fs.readFileSync(abs, 'utf8');
  let out = '';
  src = src.replace(/^\s*import\s+[^'"]*from\s+['"]([^'"]+)['"];?\s*$/gm, (_, spec) => {
    out += inline(path.join(path.dirname(abs), spec));
    return '';
  });
  /* `async` sits between `export` and `function`, and missing it leaves a bare
     `export` in a plain <script>, which is a parse error that kills the entire
     bundle — the page then renders its static HTML and does nothing at all. */
  src = src.replace(/^\s*export\s+(default\s+)?(async\s+)?(const|function|class|let|var)\s/gm,
                    (m, _d, asyncKw, kind) => (asyncKw || '') + kind + ' ');
  src = src.replace(/^\s*export\s*\{[^}]*\};?\s*$/gm, '');
  return out + '\n/* ---- ' + path.relative(ROOT, abs) + ' ---- */\n' + src;
}

const html = fs.readFileSync(path.join(ROOT, 'client', 'index.html'), 'utf8');
let js = inline(path.join(ROOT, 'client', 'app.js'));

/* the offline build has no server to talk to */
js = js.replace(/^connect\(\)\.then\(loadBoard\);$/m,
  "NET.online = false;\n$('netLine').textContent = 'Offline build \\u00b7 wild packs only';\n$('submitBtn').closest('.submitbox').style.display = 'none';");

/* Nothing may survive into a plain <script>. Catching it here beats shipping a
   file that looks fine and is inert. */
const leftovers = js.split('\n')
  .map((line, i) => ({ line: line.trim(), n: i + 1 }))
  .filter(l => /^export[\s{]/.test(l.line) || /^import[\s{]/.test(l.line));
if (leftovers.length) {
  console.error('\n  The bundle still contains module syntax, which will not parse:\n');
  leftovers.slice(0, 8).forEach(l => console.error('      line ' + l.n + ': ' + l.line.slice(0, 90)));
  console.error('\n  Teach scripts/build-single.mjs to strip that form.\n');
  process.exit(1);
}

const bundled = html.replace('<script type="module" src="./app.js"></script>',
  '<script>\n' + js + '\n</script>');
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, bundled);
console.log('built', path.relative(ROOT, OUT), (bundled.length / 1024).toFixed(0) + 'kb',
  '/ from', seen.size, 'modules');
