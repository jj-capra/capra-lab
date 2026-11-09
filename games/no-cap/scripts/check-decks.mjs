// node games/no-cap/scripts/check-decks.mjs [file.json ...]   (no files: every deck)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDecks, problems, duplicates } from '../server/load.mjs';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = process.argv.slice(2);
const decks = files.length
  ? files.map(f => ({ ...JSON.parse(fs.readFileSync(f, 'utf8')), file: f }))
  : loadDecks(ROOT);
let bad = 0;
if (!files.length) for (const x of duplicates(decks)) { bad++; console.log('  ' + x); }
for (const d of decks) {
  const p = problems(d);
  if (p.length) { bad += p.length; console.log(p.map(x => '  ' + x).join('\n')); }
  else console.log(`ok  ${d.id} (${d.cards.length} cards)`);
}
if (bad) { console.log(`${bad} problem(s)`); process.exit(1); }
