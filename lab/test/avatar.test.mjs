// Capra Lab avatars: the catalog and the drawing.  node lab/test/avatar.test.mjs
import assert from 'node:assert/strict';
import { ITEMS, ITEM, SLOTS, SPECIES, HAIRS, EYES, MOUTHS, BROWS, CHEEKS, DEFAULT_LOOK, clean, randomLook, FURS } from '../../public/lab/avatar-catalog.mjs';
import { drawAvatar } from '../../public/lab/avatar.mjs';

let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log('ok  ', name); };
const sane = (svg, what) => {
  assert.ok(svg.startsWith('<svg') && svg.endsWith('</svg>'), `${what}: an svg`);
  assert.ok(!/NaN|undefined|null/.test(svg), `${what}: no NaN or undefined in the drawing`);
  assert.equal((svg.match(/<g/g) || []).length, (svg.match(/<\/g>/g) || []).length, `${what}: groups close`);
};

test('the shop: every item has a slot, a name and one coin that fits its rarity', () => {
  const coin = { common: 'amber', rare: 'shards', legendary: 'diamonds' };
  assert.equal(new Set(ITEMS.map((i) => i.id)).size, ITEMS.length, 'ids are unique');
  for (const it of ITEMS) {
    assert.ok(SLOTS.some((s) => s.id === it.slot), `${it.id}: a real slot`);
    assert.ok(it.id.startsWith(it.slot + '.'), `${it.id}: named for its slot`);
    assert.deepEqual(Object.keys(it.price), [coin[it.rarity]], `${it.id}: priced in ${coin[it.rarity]}`);
    assert.ok(it.price[coin[it.rarity]] > 0);
  }
  for (const s of SLOTS) assert.ok(ITEMS.filter((i) => i.slot === s.id).length >= 5, `${s.id} has a few things to buy`);
});

test('clean: only real choices, and shop items only when owned', () => {
  assert.deepEqual(clean(null), DEFAULT_LOOK);
  const l = clean({ base: 'animal', species: 'owl', hair: 'nope', eyes: 'wink', hat: 'hat.crown', glasses: 'hat.beanie' }, ['hat.crown']);
  assert.equal(l.species, 'owl');
  assert.equal(l.hair, DEFAULT_LOOK.hair);
  assert.equal(l.hat, 'hat.crown');
  assert.equal(l.glasses, null, 'an item in the wrong slot comes off');
  assert.equal(clean({ hat: 'hat.crown' }, []).hat, null);
  assert.equal(clean({ hat: 'hat.crown' }).hat, 'hat.crown', 'no owned list: a shop preview');
  for (let i = 0; i < 50; i++) { const r = randomLook(); assert.deepEqual(clean(r), r, 'a random look is already clean'); }
});

test('every base, every free choice and every shop item draws', () => {
  for (const h of HAIRS) for (const e of EYES) sane(drawAvatar({ base: 'person', hair: h, eyes: e }), `person ${h} ${e}`);
  for (const sp of SPECIES) for (const m of MOUTHS) for (const b of BROWS) sane(drawAvatar({ base: 'animal', species: sp.id, fur: sp.fur, mouth: m, brows: b }), `${sp.id} ${m} ${b}`);
  for (const c of CHEEKS) for (let f = 0; f < FURS.length; f++) sane(drawAvatar({ base: 'animal', species: 'bear', fur: f, cheeks: c }), `bear fur ${f}`);
  for (const it of ITEMS) for (const base of ['person', 'animal']) for (const sp of ['goat', 'frog', 'owl']) {
    const svg = drawAvatar({ base, species: sp, [it.slot]: it.id });
    sane(svg, `${it.id} on ${base} ${sp}`);
    assert.notEqual(svg, drawAvatar({ base, species: sp }).replace(/(id="|url\(#)[a-z]+\d+/g, '$1x'), `${it.id} shows`);
  }
  // the hologram later pulls these layers apart
  const svg = drawAvatar({ base: 'person', hat: 'hat.crown', gadget: 'gadget.trophy', effect: 'effect.glow' });
  for (const l of ['backdrop', 'aura', 'body', 'head', 'face', 'hair', 'hat', 'gadget']) assert.ok(svg.includes(`data-layer="${l}"`), `layer ${l}`);
  assert.ok(drawAvatar(DEFAULT_LOOK, { tight: true }).includes('viewBox="12 12 76 76"'));
  assert.ok(drawAvatar(DEFAULT_LOOK, { title: 'JJ <3' }).includes('<title>JJ 3</title>'));
});

console.log(`\nAvatars: ${passed} tests passed (${ITEMS.length} items, ${SPECIES.length} animals, ${HAIRS.length} hair styles)`);
