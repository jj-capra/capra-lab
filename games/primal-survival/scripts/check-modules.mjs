/* Finds identifiers a module uses but never declares or imports.
 *
 * The single-file bundler flattens every module into one scope, so a missing
 * export/import pair works there and throws `X is not defined` in a browser.
 * This catches that statically, before a build hides it.
 *
 *   node scripts/check-modules.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILES = ['client/app.js', 'client/render.js', 'client/format.js', 'client/shapes.js',
               'shared/engine.js', 'shared/grade.js', 'shared/roster.js', 'shared/constants.js',
               'server/api.js', 'server/stores.js', 'netlify/functions/api.mjs'];

const GLOBALS = new Set(('Math JSON Object Array String Number Boolean Date RegExp Map Set Promise ' +
  'Error TypeError Symbol BigInt Infinity NaN undefined null true false parseInt parseFloat isNaN ' +
  'console window document fetch setTimeout clearTimeout setInterval clearInterval requestAnimationFrame ' +
  'performance navigator location URL URLSearchParams Request Response Headers Blob TextEncoder TextDecoder ' +
  'process Buffer globalThis structuredClone atob btoa encodeURIComponent decodeURIComponent ' +
  'Uint8Array Uint32Array Uint16Array Int8Array Int32Array Float32Array Float64Array ' +
  'ArrayBuffer DataView WeakMap WeakSet Proxy Reflect Intl crypto ImageData Image Canvas ' +
  'this arguments import export default new typeof instanceof void delete in of return if else for while ' +
  'do switch case break continue function const let var class extends super try catch finally throw ' +
  'async await yield static get set true false null').split(/\s+/));

/* names a file brings into scope: imports, top-level declarations, and
   anything bound inside it (params, locals, destructuring) */
function boundNames(src) {
  const out = new Set();
  const add = re => { let m; while ((m = re.exec(src))) m[1].split(/[\s,{}:]+/).filter(Boolean).forEach(n => out.add(n)); };
  add(/import\s*\{([^}]+)\}\s*from/g);
  add(/import\s+(\w+)\s+from/g);
  add(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g);
  /* `const A = 1, B = 2, C = 3` binds every name, not just the first two.
     Pull the whole declaration and take each `name =` inside it. */
  let d;
  const decl = /(?:^|[^\w.])(?:const|let|var)\s+([^;\n]+)/g;
  while ((d = decl.exec(src))) {
    let n;
    const names = /(?:^|,)\s*([A-Za-z_$][\w$]*)\s*=/g;
    while ((n = names.exec(d[1]))) out.add(n[1]);
  }
  add(/(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/g);
  add(/(?:const|let|var)\s*\{([^}]+)\}/g);
  add(/(?:const|let|var)\s*\[([^\]]+)\]/g);
  add(/function[^(]*\(([^)]*)\)/g);
  add(/\(([^)]*)\)\s*=>/g);
  add(/([A-Za-z_$][\w$]*)\s*=>/g);
  add(/catch\s*\(\s*(\w+)\s*\)/g);
  add(/for\s*\(\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g);
  add(/\.forEach\(\s*(?:function\s*)?\(?\s*([A-Za-z_$][\w$]*)/g);
  return out;
}

let problems = 0;
for (const f of FILES) {
  const src = fs.readFileSync(path.join(ROOT, f), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')      // block comments
    .replace(/(^|[^:])\/\/.*$/gm, '$1')     // line comments
    .replace(/`(?:[^`\\]|\\.)*`/g, '``')    // template literals
    .replace(/\/(?![*/])(?:[^/\\\n]|\\.)+\/[gimsuy]*/g, '/RE/')  // regex literals
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")    // strings
    .replace(/"(?:[^"\\]|\\.)*"/g, '""');
  const bound = boundNames(src);
  /* only flag SCREAMING_CASE and CapWords — the shared constants and helpers
     that leak between modules. lowercase locals are too noisy to check this way. */
  const used = new Set();
  let m; const re = /(?<![.\w$])([A-Z][A-Z0-9_]{2,}|[A-Z][a-z]\w+)(?![\w$]*\s*:)/g;
  while ((m = re.exec(src))) used.add(m[1]);
  const missing = [...used].filter(n => !bound.has(n) && !GLOBALS.has(n));
  if (missing.length) {
    console.log('  ' + f);
    missing.forEach(n => console.log('      ' + n + '  — used but never declared or imported'));
    problems += missing.length;
  }
}
if (problems) {
  console.log('\n' + problems + ' unresolved reference(s) — this would throw in a browser\n');
  process.exit(1);
}
console.log('modules: every reference resolves');
