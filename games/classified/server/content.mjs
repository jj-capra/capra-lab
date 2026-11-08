// Reads Classified's missions, Who Said It questions and Yearbook awards (games/classified/content/,
// format in docs/CONTENT_SPEC.md). The build writes them to server/content.gen.mjs for the Netlify
// function; tests and the dev server call loadContent().
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'content');
const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));

export function loadContent(root = ROOT) {
  return {
    missions: read(path.join(root, 'missions.json')),
    prompts: read(path.join(root, 'prompts.json')),
    awards: read(path.join(root, 'yearbook.json')),
  };
}

// The structural checks the build and the tests run (the words themselves are checked by someone
// who didn't write them).
export function problems({ missions, prompts, awards }) {
  const out = [];
  const each = (list, name, prefix, max, extra) => {
    const ids = new Set();
    if (!Array.isArray(list)) { out.push(`${name}: not a list`); return; }
    for (const it of list) {
      if (!it || typeof it.text !== 'string' || !it.text.trim()) { out.push(`${name}: an item has no text`); continue; }
      if (!new RegExp(`^${prefix}\\d{3}$`).test(it.id || '')) out.push(`${name}: bad id ${it.id}`);
      if (ids.has(it.id)) out.push(`${name}: duplicate id ${it.id}`);
      ids.add(it.id);
      if (it.text.length > max) out.push(`${it.id}: over ${max} characters`);
      if (extra) extra(it);
    }
  };
  each(missions, 'missions', 'm', 110, (m) => {
    const n = (m.text.match(/\{target\}/g) || []).length;
    if (m.target === true && n !== 1) out.push(`${m.id}: target missions use {target} exactly once`);
    if (m.target !== true && n) out.push(`${m.id}: uses {target} but "target" isn't true`);
  });
  each(prompts, 'prompts', 'p', 90);
  each(awards, 'yearbook', 'y', 60);
  if ((missions || []).filter((m) => m.target).length < 20) out.push('missions: need at least 20 with a {target}');
  if ((missions || []).filter((m) => !m.target).length < 20) out.push('missions: need at least 20 without a {target}');
  if ((prompts || []).length < 12) out.push('prompts: need at least 12');
  if ((awards || []).length < 12) out.push('yearbook: need at least 12');
  return out;
}
