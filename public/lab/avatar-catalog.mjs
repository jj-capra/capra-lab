/* Capra Lab avatars: what a player can look like, what's free and what the shop sells (JC, Nov 13 2026:
 * a comic character, "pick person or animal"; basics free, extras cost; priced by rarity like earning:
 * amber for everyday things, shards for rare ones, diamonds for legendary ones; a 2D avatar now, the
 * trophy room's hologram later, built from the same layers).
 *
 * Used by the page (public/lab/avatar.mjs draws it, /avatar/ is the studio) and by the server
 * (lab/wallet.js sells items and saves looks), so a look is checked the same way everywhere.
 *
 * A look: { base, species, skin, fur, hair, hairColor, eyes, brows, mouth, cheeks, shirt, bg,
 *           hat, glasses, outfit, facewear, gadget, backdrop, effect }
 * The first twelve are free; the last seven are shop items (an id, or null for none). */

export const BASES = ['person', 'animal'];

export const SPECIES = [
  { id: 'goat', name: 'Goat', fur: 1 },
  { id: 'wolf', name: 'Wolf', fur: 2 },
  { id: 'fox', name: 'Fox', fur: 3 },
  { id: 'cat', name: 'Cat', fur: 6 },
  { id: 'bear', name: 'Bear', fur: 0 },
  { id: 'panda', name: 'Panda', fur: 5 },
  { id: 'owl', name: 'Owl', fur: 0 },
  { id: 'bunny', name: 'Bunny', fur: 5 },
  { id: 'frog', name: 'Frog', fur: 9 },
  { id: 'dino', name: 'Dino', fur: 10 },
];

export const SKINS = ['#FFE3CC', '#F6C8A0', '#E8B07E', '#CF935F', '#AD7043', '#86522E', '#64391F', '#45261A'];
export const FURS = ['#8A5A36', '#EFE4CF', '#8E8A94', '#F07A2E', '#2B2530', '#FBF8F2', '#E2B04A', '#6E8CFF', '#FF8DBE', '#5FCB6E', '#4FBF8A', '#A07CFF'];
export const HAIRS = ['short', 'curly', 'afro', 'long', 'pony', 'buzz', 'spiky', 'bun', 'braids', 'mohawk', 'bald'];
export const HAIR_COLORS = ['#1E1A24', '#4A2C1D', '#7A4A2A', '#A3402B', '#F2C14E', '#EDE6D6', '#2D6BFF', '#FF3D8B', '#8C5CFF', '#3DDC84'];
export const EYES = ['round', 'happy', 'wide', 'sleepy', 'wink', 'lashes'];
export const BROWS = ['soft', 'bold', 'raised', 'fierce', 'none'];
export const MOUTHS = ['smile', 'grin', 'open', 'smirk', 'tongue', 'o'];
export const CHEEKS = ['none', 'blush', 'freckles'];
export const SHIRTS = ['#2D6BFF', '#FF3B3B', '#FFD23F', '#3DDC84', '#8C5CFF', '#FF3D8B', '#29D3F0', '#FF8A3D', '#2B2530', '#FBF8F2'];
export const BGS = ['#FFD23F', '#29D3F0', '#FF3D8B', '#8C5CFF', '#3DDC84', '#FF8A3D', '#2D6BFF', '#FFF4DC', '#2B2530'];

// The free choices: [field, choices] (indices for colors, names for styles).
export const FREE = {
  skin: SKINS.length, fur: FURS.length, hairColor: HAIR_COLORS.length, shirt: SHIRTS.length, bg: BGS.length,
  hair: HAIRS, eyes: EYES, brows: BROWS, mouth: MOUTHS, cheeks: CHEEKS,
};

export const SLOTS = [
  { id: 'hat', name: 'Hats' },
  { id: 'glasses', name: 'Glasses' },
  { id: 'outfit', name: 'Outfits' },
  { id: 'facewear', name: 'Face' },
  { id: 'gadget', name: 'Gadgets' },
  { id: 'backdrop', name: 'Backdrops' },
  { id: 'effect', name: 'Effects' },
];

// The shop. Rarity sets the coin: common costs amber, rare costs shards, legendary costs diamonds.
const C = (amber) => ({ rarity: 'common', price: { amber } });
const R = (shards) => ({ rarity: 'rare', price: { shards } });
const L = (diamonds) => ({ rarity: 'legendary', price: { diamonds } });
export const ITEMS = [
  // hats
  { id: 'hat.beanie', slot: 'hat', name: 'Beanie', ...C(60) },
  { id: 'hat.cap', slot: 'hat', name: 'Backwards Cap', ...C(60) },
  { id: 'hat.party', slot: 'hat', name: 'Party Hat', ...C(50) },
  { id: 'hat.headphones', slot: 'hat', name: 'Headphones', ...C(90) },
  { id: 'hat.bucket', slot: 'hat', name: 'Bucket Hat', ...C(80) },
  { id: 'hat.chef', slot: 'hat', name: 'Chef Hat', ...C(80) },
  { id: 'hat.flowers', slot: 'hat', name: 'Flower Crown', ...C(100) },
  { id: 'hat.cowboy', slot: 'hat', name: 'Cowboy Hat', ...C(120) },
  { id: 'hat.propeller', slot: 'hat', name: 'Propeller Cap', ...C(120) },
  { id: 'hat.tophat', slot: 'hat', name: 'Top Hat', ...C(150) },
  { id: 'hat.wizard', slot: 'hat', name: 'Wizard Hat', ...R(3) },
  { id: 'hat.viking', slot: 'hat', name: 'Viking Helmet', ...R(3) },
  { id: 'hat.crown', slot: 'hat', name: 'Royal Crown', ...L(2) },
  { id: 'hat.halo', slot: 'hat', name: 'Halo', ...L(2) },
  // glasses
  { id: 'glasses.specs', slot: 'glasses', name: 'Round Specs', ...C(50) },
  { id: 'glasses.goggles', slot: 'glasses', name: 'Lab Goggles', ...C(70) },
  { id: 'glasses.shades', slot: 'glasses', name: 'Shades', ...C(80) },
  { id: 'glasses.3d', slot: 'glasses', name: '3D Glasses', ...C(90) },
  { id: 'glasses.hearts', slot: 'glasses', name: 'Heart Shades', ...C(100) },
  { id: 'glasses.stars', slot: 'glasses', name: 'Star Shades', ...R(2) },
  { id: 'glasses.monocle', slot: 'glasses', name: 'Monocle', ...R(2) },
  { id: 'glasses.visor', slot: 'glasses', name: 'VR Visor', ...R(3) },
  { id: 'glasses.laser', slot: 'glasses', name: 'Laser Eyes', ...L(2) },
  // outfits (the free tee is what you wear without one)
  { id: 'outfit.sweater', slot: 'outfit', name: 'Zigzag Sweater', ...C(70) },
  { id: 'outfit.hoodie', slot: 'outfit', name: 'Hoodie', ...C(80) },
  { id: 'outfit.overalls', slot: 'outfit', name: 'Overalls', ...C(90) },
  { id: 'outfit.labcoat', slot: 'outfit', name: 'Lab Coat', ...C(100) },
  { id: 'outfit.jersey', slot: 'outfit', name: 'Hoops Jersey', ...C(120) },
  { id: 'outfit.varsity', slot: 'outfit', name: 'Varsity Jacket', ...C(150) },
  { id: 'outfit.tux', slot: 'outfit', name: 'Tuxedo', ...R(3) },
  { id: 'outfit.labhoodie', slot: 'outfit', name: 'Capra Lab Hoodie', ...R(3) },
  { id: 'outfit.hero', slot: 'outfit', name: 'Hero Suit & Cape', ...R(4) },
  { id: 'outfit.astronaut', slot: 'outfit', name: 'Astronaut Suit', ...L(3) },
  // face
  { id: 'facewear.bandage', slot: 'facewear', name: 'Bandage', ...C(40) },
  { id: 'facewear.sticker', slot: 'facewear', name: 'Star Sticker', ...C(50) },
  { id: 'facewear.mustache', slot: 'facewear', name: 'Mustache', ...C(60) },
  { id: 'facewear.paint', slot: 'facewear', name: 'Game-Day Paint', ...C(70) },
  { id: 'facewear.beard', slot: 'facewear', name: 'Big Beard', ...C(80) },
  { id: 'facewear.bolt', slot: 'facewear', name: 'Lightning Paint', ...R(2) },
  { id: 'facewear.mask', slot: 'facewear', name: 'Hero Mask', ...R(3) },
  // gadgets
  { id: 'gadget.beaker', slot: 'gadget', name: 'Bubbling Beaker', ...C(60) },
  { id: 'gadget.brush', slot: 'gadget', name: 'Paintbrush', ...C(60) },
  { id: 'gadget.ball', slot: 'gadget', name: 'Basketball', ...C(70) },
  { id: 'gadget.mic', slot: 'gadget', name: 'Microphone', ...C(80) },
  { id: 'gadget.controller', slot: 'gadget', name: 'Game Controller', ...C(90) },
  { id: 'gadget.pin', slot: 'gadget', name: 'Lightning Pin', ...R(2) },
  { id: 'gadget.kid', slot: 'gadget', name: 'Baby Goat Buddy', ...R(4) },
  { id: 'gadget.trophy', slot: 'gadget', name: 'Golden Trophy', ...L(2) },
  // backdrops (a plain color is free)
  { id: 'backdrop.dots', slot: 'backdrop', name: 'Halftone Dots', ...C(60) },
  { id: 'backdrop.stripes', slot: 'backdrop', name: 'Candy Stripes', ...C(60) },
  { id: 'backdrop.clouds', slot: 'backdrop', name: 'Clouds', ...C(80) },
  { id: 'backdrop.sunburst', slot: 'backdrop', name: 'Sunburst', ...R(2) },
  { id: 'backdrop.pow', slot: 'backdrop', name: 'POW!', ...R(3) },
  { id: 'backdrop.lab', slot: 'backdrop', name: 'The Lab', ...R(3) },
  { id: 'backdrop.galaxy', slot: 'backdrop', name: 'Galaxy', ...L(2) },
  // effects
  { id: 'effect.sparkles', slot: 'effect', name: 'Sparkles', ...L(1) },
  { id: 'effect.glow', slot: 'effect', name: 'Golden Glow', ...L(1) },
  { id: 'effect.hologram', slot: 'effect', name: 'Hologram', ...L(2) },
  { id: 'effect.lightning', slot: 'effect', name: 'Lightning Aura', ...L(2) },
  { id: 'effect.fire', slot: 'effect', name: 'Fire Aura', ...L(3) },
];
export const ITEM = Object.fromEntries(ITEMS.map((i) => [i.id, i]));
export const SHOP_SLOTS = SLOTS.map((s) => s.id);

export const DEFAULT_LOOK = {
  base: 'person', species: 'goat', skin: 2, fur: 1, hair: 'short', hairColor: 1, eyes: 'round', brows: 'soft',
  mouth: 'smile', cheeks: 'none', shirt: 0, bg: 0,
  hat: null, glasses: null, outfit: null, facewear: null, gadget: null, backdrop: null, effect: null,
};

const inRange = (v, n, d) => (Number.isInteger(v) && v >= 0 && v < n ? v : d);
const oneOf = (v, list, d) => (list.includes(v) ? v : d);

// A look made safe: every field one of the real choices, and shop items only if the player owns them
// (owned = a list of item ids; pass null to skip that check, e.g. to draw a shop preview).
export function clean(look, owned = null) {
  const l = look && typeof look === 'object' ? look : {};
  const d = DEFAULT_LOOK;
  const out = {
    base: oneOf(l.base, BASES, d.base),
    species: oneOf(l.species, SPECIES.map((s) => s.id), d.species),
    skin: inRange(l.skin, SKINS.length, d.skin),
    fur: inRange(l.fur, FURS.length, d.fur),
    hair: oneOf(l.hair, HAIRS, d.hair),
    hairColor: inRange(l.hairColor, HAIR_COLORS.length, d.hairColor),
    eyes: oneOf(l.eyes, EYES, d.eyes),
    brows: oneOf(l.brows, BROWS, d.brows),
    mouth: oneOf(l.mouth, MOUTHS, d.mouth),
    cheeks: oneOf(l.cheeks, CHEEKS, d.cheeks),
    shirt: inRange(l.shirt, SHIRTS.length, d.shirt),
    bg: inRange(l.bg, BGS.length, d.bg),
  };
  const have = owned ? new Set(owned) : null;
  for (const slot of SHOP_SLOTS) {
    const id = l[slot];
    out[slot] = id && ITEM[id] && ITEM[id].slot === slot && (!have || have.has(id)) ? id : null;
  }
  return out;
}

// A fresh player's look: a random free one, so the lab isn't a crowd of twins.
export function randomLook(random = Math.random) {
  const pick = (list) => list[Math.floor(random() * list.length)];
  const n = (k) => Math.floor(random() * k);
  const base = random() < 0.5 ? 'person' : 'animal';
  const sp = pick(SPECIES);
  return clean({
    base, species: sp.id, skin: n(SKINS.length), fur: sp.fur, hair: pick(HAIRS.slice(0, 10)), hairColor: n(6),
    eyes: pick(['round', 'happy', 'wide', 'lashes']), brows: pick(['soft', 'bold', 'raised']), mouth: pick(['smile', 'grin', 'open']),
    cheeks: pick(CHEEKS), shirt: n(SHIRTS.length), bg: n(BGS.length - 1),
  });
}

export const RARITY = { common: 'Common', rare: 'Rare', legendary: 'Legendary' };
