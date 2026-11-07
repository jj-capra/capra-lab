/* Inlines the display face into the stylesheet as base64.
 *
 * The whole look rests on one condensed display face, so it cannot be a
 * network request that might not arrive: the offline single-file build has no
 * network at all, and a webfont that silently falls back to Arial takes the
 * design with it. Anton's latin subset is 18 KB, which is a fair price for the
 * page looking the same everywhere, forever.
 *
 *   node scripts/embed-font.mjs     (rerun if the font is ever changed)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'node_modules/@fontsource/anton/files/anton-latin-400-normal.woff2');
const HTML = path.join(ROOT, 'client', 'index.html');
const MARK_A = '/* <<anton>> */', MARK_B = '/* <</anton>> */';

if (!fs.existsSync(SRC)) {
  console.error('\n  @fontsource/anton is not installed. run:  npm install\n');
  process.exit(1);
}
const b64 = fs.readFileSync(SRC).toString('base64');
const face = MARK_A + `
  @font-face{
    font-family:"Anton";
    font-style:normal;
    font-weight:400;
    font-display:block;
    src:url(data:font/woff2;base64,${b64}) format("woff2");
  }
  ` + MARK_B;

let html = fs.readFileSync(HTML, 'utf8');
const a = html.indexOf(MARK_A), b = html.indexOf(MARK_B);
if (a !== -1 && b !== -1) html = html.slice(0, a) + face + html.slice(b + MARK_B.length);
else html = html.replace('<style>', '<style>\n  ' + face);
fs.writeFileSync(HTML, html);
console.log('display face embedded (' + Math.round(b64.length / 1024) + 'kb base64)');
