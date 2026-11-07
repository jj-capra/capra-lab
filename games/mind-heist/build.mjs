// Build Mind Heist.
//   node build.mjs          validate decks, bundle the function and the app into public/ and netlify/functions/
//   node build.mjs --force  build even if deck validation reports errors (testing only)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const r = (...p) => path.join(HERE, ...p);
// Mind Heist is built by Capra Lab's build (scripts/build.mjs), which points these at the lab's
// public/mind-heist/ and netlify/functions/mind-heist.mjs. Run on its own, it builds in place.
const PUB = process.env.MH_PUBLIC ? path.resolve(process.env.MH_PUBLIC) : r('public');
const FN = process.env.MH_FUNCTION ? path.resolve(process.env.MH_FUNCTION) : r('netlify/functions/api.mjs');
const pub = (...p) => path.join(PUB, ...p);
const LIMITS = { q: 110, opt: 30, fact: 140, cat: 20, blurb: 80 };

/* ---------- decks ---------- */
const plan = JSON.parse(fs.readFileSync(r('deck_plan.json'), 'utf8'));
const planById = Object.fromEntries(plan.map(p => [p.id, p]));
const raw = fs.readdirSync(r('decks')).filter(f => f.endsWith('.json')).sort()
  .flatMap(f => JSON.parse(fs.readFileSync(r('decks', f), 'utf8')));
const errors = [], warns = [];
const norm = s => s.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[.!?]$/, '');
const seenQ = new Map();
const merged = [];
for (const d of raw) {
  const p = planById[d.id];
  if (!p) { warns.push(`${d.id}: not in the calendar, skipped`); continue; }
  if ((d.categories || []).length !== 3) errors.push(`${d.id}: ${d.categories?.length} categories`);
  for (const c of d.categories) {
    if (c.name.length > LIMITS.cat) warns.push(`${d.id}/${c.name}: category name long`);
    const vals = c.questions.map(q => q.value).join(',');
    if (vals !== '100,200,300,400') errors.push(`${d.id}/${c.name}: values ${vals}`);
    for (const q of c.questions) {
      const tag = `${d.id}/${c.name}/${q.value}`;
      if (q.options.length !== 4) errors.push(`${tag}: ${q.options.length} options`);
      if (!(q.answer >= 0 && q.answer < 4)) errors.push(`${tag}: bad answer`);
      if (new Set(q.options.map(norm)).size !== 4) errors.push(`${tag}: duplicate options`);
      if (q.q.length > LIMITS.q) warns.push(`${tag}: question ${q.q.length} chars`);
      q.options.forEach(o => { if (o.length > LIMITS.opt) warns.push(`${tag}: option '${o}' long`); });
      if ((q.fact || '').length > LIMITS.fact) warns.push(`${tag}: fact long`);
      const k = q.q.toLowerCase().replace(/\W+/g, '');
      if (seenQ.has(k)) errors.push(`repeated question in ${d.id} and ${seenQ.get(k)}`);
      seenQ.set(k, d.id);
    }
  }
  merged.push({ id: d.id, date: p.date, title: p.title, shelf: p.shelf, kind: p.kind || null, blurb: d.blurb || '',
    categories: d.categories.map(c => ({ name: c.name, questions: c.questions.map(({ value, q, options, answer, fact }) => ({ value, q, options, answer, fact })) })) });
}
for (const p of plan) if (!merged.some(d => d.id === p.id)) errors.push(`missing deck ${p.id}`);
warns.forEach(w => console.log('WARN ', w));
errors.forEach(e => console.log('ERROR', e));
if (errors.length && !process.argv.includes('--force')) { console.error(`${errors.length} errors; not built`); process.exit(1); }
merged.sort((a, b) => ((a.date || '0') < (b.date || '0') ? -1 : 1));
fs.writeFileSync(r('src/server/decks.gen.json'), JSON.stringify(merged));

/* ---------- server function ---------- */
fs.mkdirSync(path.dirname(FN), { recursive: true });
await esbuild.build({
  entryPoints: [r('src/netlify-entry.mjs')], bundle: true, platform: 'node', format: 'esm', target: 'node18',
  outfile: FN, minify: false, legalComments: 'none', logLevel: 'warning',
  banner: { js: '// Built by build.mjs. Edit src/server/*, not this file.' },
});

/* ---------- client ---------- */
fs.mkdirSync(PUB, { recursive: true });
const BUILD = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
await esbuild.build({
  entryPoints: [r('src/client/main.js')], bundle: true, format: 'iife', target: 'es2020',
  outfile: pub('app.js'), minify: true, legalComments: 'none', logLevel: 'warning', define: { __BUILD__: JSON.stringify(BUILD) },
});
await esbuild.build({ entryPoints: [r('src/client/styles.css')], bundle: true, external: ['./fonts/*'], outfile: pub('app.css'), minify: true, logLevel: 'warning' });
let html = fs.readFileSync(r('src/client/index.html'), 'utf8').replaceAll('__BUILD__', BUILD);
fs.writeFileSync(pub('index.html'), html);
for (const f of ['menu-theme.mp3', 'theme.mp3', 'icon.svg', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png', 'manifest.webmanifest']) {
  const src = r('assets', f);
  if (fs.existsSync(src)) fs.copyFileSync(src, pub(f));
}
fs.mkdirSync(pub('fonts'), { recursive: true });
for (const f of fs.readdirSync(r('assets/fonts'))) fs.copyFileSync(r('assets/fonts', f), pub('fonts', f));
const size = (f) => (fs.statSync(f).size / 1024).toFixed(0) + ' KB';
console.log(`built ${merged.length} decks · function ${size(FN)} · app ${size(pub('app.js'))} · css ${size(pub('app.css'))}`);
