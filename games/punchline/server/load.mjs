// Reads Punchline's decks from their JSON files into one shape. The build writes the result to
// server/decks.gen.mjs for the Netlify function; tests and the dev server call loadDecks().
//
//   Wrong Signs decks   decks/signs/<id>.json   (format: docs/DECK_SPEC.md)
//   Ugly Ts decks       decks/tees/<id>.json    (the same format, every scene 'tee'; Nov 8 2026)
//   Joke decks          decks/jokes/J*.json + plan.json (moved from Mind Heist, Nov 7 2026)
//
// A deck: { id, title, type: 'signs' | 'tees' | 'jokes', shelf: 'family' | 'late', blurb, cards }
// A sign card: { id, type: 'sign', scene, where, kind, sign, ask?, options, answer, caption,
//                art?, arc?, back? }   (a shirt is a 'sign' card whose scene is 'tee')
// A joke card: { id, type: 'joke', setup, options, answer, caption }
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'decks');
const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));

export const SCENES = ['neon', 'marquee', 'storefront', 'billboard', 'road', 'banner', 'plaque', 'trail', 'chalk', 'yard', 'restroom', 'tee'];
export const KINDS = ['misprint', 'lights', 'design', 'peeled', 'back'];
// The clip-art stamps an Ugly T can wear (drawn in art.js).
export const STAMPS = ['wolf', 'moon', 'dolphin', 'eagle', 'lightning', 'flame', 'taco', 'cat', 'pizza', 'cactus', 'duck', 'star', 'heart', 'arrow-up', 'arrow-down'];

export function loadDecks(root = ROOT) {
  const decks = [];
  for (const type of ['signs', 'tees']) {
    const dir = path.join(root, type);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.json')).sort()) {
      const d = read(path.join(dir, f));
      decks.push({
        id: d.id, title: d.title, type, shelf: d.shelf === 'late' ? 'late' : 'family', blurb: d.blurb || '',
        ...(d.brew ? { brew: true } : {}),
        cards: d.cards.map((c) => ({
          id: `${d.id}/${c.id}`, type: 'sign', scene: c.scene, where: c.where || '', kind: c.kind,
          sign: c.sign, ...(c.ask ? { ask: c.ask } : {}), options: c.options, answer: c.answer, caption: c.caption,
          ...(c.art && c.art.length ? { art: c.art } : {}), ...(c.arc ? { arc: true } : {}), ...(c.back ? { back: c.back } : {}),
        })),
      });
    }
  }
  const jokeDir = path.join(root, 'jokes');
  if (fs.existsSync(path.join(jokeDir, 'plan.json'))) {
    const plan = Object.fromEntries(read(path.join(jokeDir, 'plan.json')).map((p) => [p.id, p]));
    const files = fs.readdirSync(jokeDir).filter((n) => /^J\d+\.json$/.test(n)).sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)));
    for (const f of files) {
      for (const d of read(path.join(jokeDir, f))) {
        const p = plan[d.id] || {};
        const qs = d.categories.flatMap((c) => c.questions);
        decks.push({
          id: d.id, title: p.title || d.id, type: 'jokes', shelf: p.late ? 'late' : 'family', blurb: d.blurb || p.scope || '',
          ...(p.brew ? { brew: true } : {}),
          cards: qs.map((q, k) => ({
            id: `${d.id}/${k + 1}`, type: 'joke', setup: q.q, options: q.options, answer: q.answer,
            caption: String(q.fact || '').replace(/^Bonus:\s*/, ''),
          })),
        });
      }
    }
  }
  return decks;
}

// The checks the build and the tests run on every deck (structure only; the jokes and signs
// themselves are checked by a person or an agent who didn't write them).
export function problems(decks) {
  const out = [], ids = new Set();
  for (const d of decks) {
    if (ids.has(d.id)) out.push(`${d.id}: duplicate deck id`);
    ids.add(d.id);
    if (!d.title) out.push(`${d.id}: no title`);
    if (d.cards.length < 10) out.push(`${d.id}: ${d.cards.length} cards (needs at least 10)`);
    const seen = new Set();
    for (const c of d.cards) {
      const where = `${c.id}`;
      if (seen.has(c.id)) out.push(`${where}: duplicate card id`);
      seen.add(c.id);
      if (!Array.isArray(c.options) || c.options.length !== 4) out.push(`${where}: needs 4 options`);
      else if (new Set(c.options.map((o) => o.trim().toLowerCase())).size !== 4) out.push(`${where}: two options are the same`);
      if (!(c.answer >= 0 && c.answer <= 3)) out.push(`${where}: answer must be 0-3`);
      if (c.type === 'sign') {
        if (!SCENES.includes(c.scene)) out.push(`${where}: unknown scene ${c.scene}`);
        if (!KINDS.includes(c.kind)) out.push(`${where}: unknown kind ${c.kind}`);
        if (!Array.isArray(c.sign) || !c.sign.length || c.sign.length > 4) out.push(`${where}: sign needs 1-4 lines`);
        else for (const l of c.sign) if (l.replace(/~/g, '').length > 20) out.push(`${where}: sign line over 20 characters: ${l}`);
        if (c.where && c.where.length > 18) out.push(`${where}: where over 18 characters`);
        for (const o of c.options || []) if (o.length > 34) out.push(`${where}: option over 34 characters: ${o}`);
        if (!c.caption || c.caption.length > 90) out.push(`${where}: caption missing or over 90 characters`);
        if (c.ask && c.ask.length > 40) out.push(`${where}: ask over 40 characters`);
        if ((c.kind === 'lights' || c.kind === 'peeled') && Array.isArray(c.sign)) {
          if (!c.sign.some((l) => l.includes('~'))) out.push(`${where}: ${c.kind} card with no dark letter`);
          // unless the card asks something else, the right answer is the sign as it reads now
          else if (!c.ask && Array.isArray(c.options)) {
            const norm = (s) => s.replace(/\s+/g, ' ').trim().toUpperCase();
            const reads = norm(c.sign.map(litText).join(' '));
            if (norm(c.options[c.answer] || '') !== reads) out.push(`${where}: the right answer should read "${reads}"`);
            if (c.options.filter((o) => norm(o) === reads).length > 1) out.push(`${where}: two options read the same as the sign`);
          }
        }
        if (c.scene === 'tee' && d.type !== 'tees') out.push(`${where}: a shirt card belongs in an Ugly Ts deck`);
        if (d.type === 'tees' && c.scene !== 'tee') out.push(`${where}: Ugly Ts cards need scene "tee"`);
        if ((c.kind === 'peeled' || c.kind === 'back') && c.scene !== 'tee') out.push(`${where}: ${c.kind} is for shirts`);
        if (c.kind === 'back') {
          if (!Array.isArray(c.back) || !c.back.length || c.back.length > 4) out.push(`${where}: back card needs 1-4 back lines`);
          else for (const l of c.back) if (l.length > 20) out.push(`${where}: back line over 20 characters: ${l}`);
        }
        for (const a of c.art || []) if (!STAMPS.includes(a)) out.push(`${where}: unknown clip art ${a}`);
        if ((c.art || []).length > 3) out.push(`${where}: at most 3 clip-art stamps`);
      } else {
        if (!c.setup) out.push(`${where}: no setup`);
      }
    }
  }
  return out;
}

// What a burnt-out sign says with its dark letters gone ("~BOWLING" -> "OWLING").
export const litText = (line) => line.replace(/~./g, '');
