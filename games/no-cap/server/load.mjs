// No Cap's decks: read them and check them. The build refuses a deck that fails problems().
import fs from 'node:fs';
import path from 'node:path';
import { SHELVES, claims, SAY_MAX, CLAIM_MIN, CLAIM_MAX, REAL_MAX, ABOUT_MAX } from '../shared/rules.mjs';

const SHELF_IDS = SHELVES.map(s => s.id);

// Deck ids must be unique across every shelf (the server finds decks by id).
export function duplicates(decks) {
  const seen = new Map(), out = [];
  for (const d of decks) { if (seen.has(d.id)) out.push(`${d.file}: deck id "${d.id}" is already used by ${seen.get(d.id)}`); else seen.set(d.id, d.file); }
  return out;
}

export function loadDecks(root) {
  const decks = [];
  for (const shelf of SHELF_IDS) {
    const dir = path.join(root, 'decks', shelf);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort()) {
      const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      decks.push({ ...d, shelf: d.shelf || shelf, file: shelf + '/' + f });
    }
  }
  return decks;
}

// Everything wrong with a deck, as readable lines. An empty list means it ships.
export function problems(d) {
  const out = [];
  const where = (c, i) => `${d.id || d.file} card ${c && c.id ? c.id : i + 1}`;
  if (!d.id || !/^[a-z0-9-]+$/.test(d.id)) out.push(`${d.file}: id must be lower-case-with-dashes`);
  if (!d.title || d.title.length > 32) out.push(`${d.id}: title missing or over 32 characters`);
  if (!SHELF_IDS.includes(d.shelf)) out.push(`${d.id}: shelf must be one of ${SHELF_IDS.join(', ')}`);
  if (!d.blurb || d.blurb.length > 90) out.push(`${d.id}: blurb missing or over 90 characters`);
  if (!Array.isArray(d.cards) || d.cards.length < 10) out.push(`${d.id}: needs at least 10 cards`);
  const seen = new Set(), caps = [0, 0, 0, 0];
  (d.cards || []).forEach((c, i) => {
    const w = where(c, i);
    if (!c.id) out.push(`${w}: no id`);
    if (seen.has(c.id)) out.push(`${w}: duplicate id`);
    seen.add(c.id);
    // JC, Nov 9 2026: every claim on a card is about one subject (a president, a place, an invention...)
    if (!c.about || c.about.length > ABOUT_MAX) out.push(`${w}: about (the card's one subject) missing or over ${ABOUT_MAX} characters`);
    const cl = claims(c.say || '');
    if (cl.length !== 4) out.push(`${w}: needs exactly four [bracketed] claims, has ${cl.length}`);
    if ((c.say || '').length > SAY_MAX) out.push(`${w}: say is ${c.say.length} characters (max ${SAY_MAX})`);
    if (/\[[^\]]*\[|\][^[]*\]/.test(c.say || '')) out.push(`${w}: brackets are nested or unbalanced`);
    cl.forEach((t, k) => {
      if (t.length < CLAIM_MIN || t.length > CLAIM_MAX) out.push(`${w}: claim ${k + 1} is ${t.length} characters (${CLAIM_MIN}-${CLAIM_MAX})`);
    });
    if (!Number.isInteger(c.cap) || c.cap < 0 || c.cap > 3) out.push(`${w}: cap must be 0, 1, 2 or 3`);
    else caps[c.cap] += 1;
    if (!c.real || c.real.length > REAL_MAX) out.push(`${w}: real missing or over ${REAL_MAX} characters`);
    if (!Array.isArray(c.src) || c.src.length < 4) out.push(`${w}: src needs a source for each claim`);
  });
  const n = (d.cards || []).length;
  if (n >= 8 && caps.some(x => x < Math.floor(n / 4) - 1)) out.push(`${d.id}: caps bunch up (${caps.join('/')} at positions 1-4); spread them out`);
  return out;
}
