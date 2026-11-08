// Codenames and operation names. "AGENT MIDNIGHT WAFFLE", "OPERATION SILENT PANCAKE".
const ADJ = ['MIDNIGHT', 'SILENT', 'VELVET', 'SNEAKY', 'CRISPY', 'TURBO', 'FUZZY', 'GOLDEN', 'COSMIC', 'SPICY', 'FROSTY',
  'SLEEPY', 'NEON', 'RUBBER', 'SHADOW', 'CRYPTIC', 'BOUNCY', 'SECRET', 'STICKY', 'ROGUE', 'GLITTER', 'THUNDER', 'PICKLED',
  'ATOMIC', 'SNEAKER', 'QUANTUM', 'MYSTERY', 'CHAOTIC', 'WOBBLY', 'LUNAR', 'STEALTH', 'MAPLE', 'CORDUROY', 'ELECTRIC',
  'INVISIBLE', 'TACTICAL', 'DOUBLE', 'UNDERCOVER', 'MOONLIT', 'HYPER', 'TOASTED', 'POCKET', 'CANDY', 'PLAID', 'WILD'];
const NOUN = ['WAFFLE', 'PANCAKE', 'BADGER', 'PRETZEL', 'NOODLE', 'OTTER', 'BURRITO', 'FALCON', 'MUFFIN', 'LLAMA',
  'TOASTER', 'PENGUIN', 'NACHO', 'COMET', 'PICKLE', 'WALRUS', 'DONUT', 'CACTUS', 'GOBLIN', 'TATER TOT', 'MEATBALL',
  'PIGEON', 'SOCK', 'YETI', 'BISCUIT', 'RACCOON', 'SPROCKET', 'JELLYBEAN', 'HAMSTER', 'NUGGET', 'MOOSE', 'BAGEL',
  'GECKO', 'CRAYON', 'POPCORN', 'SQUID', 'TURNIP', 'MARSHMALLOW', 'HEDGEHOG', 'BLENDER', 'KOALA', 'TACO', 'PANDA',
  'SPATULA', 'GOAT'];
const OP_NOUN = ['PANCAKE', 'PILLOW FORT', 'NIGHT OWL', 'MOONBEAM', 'POPCORN', 'SLEEPING BAG', 'MIDNIGHT SNACK',
  'BLANKET', 'FLASHLIGHT', 'COLD CEREAL', 'S\'MORE', 'NIGHTLIGHT', 'PAJAMA', 'SUNRISE', 'TAPESTRY', 'WAFFLE IRON',
  'DREAMCATCHER', 'COUCH CUSHION', 'HOT COCOA', 'TOOTHBRUSH'];

const pick = (list, rand) => list[Math.floor(rand() * list.length)];
export function codename(rand = Math.random, taken = []) {
  const used = new Set(taken);
  for (let i = 0; i < 40; i++) {
    const c = `${pick(ADJ, rand)} ${pick(NOUN, rand)}`;
    if (!used.has(c)) return c;
  }
  return `${pick(ADJ, rand)} ${pick(NOUN, rand)} ${Math.floor(rand() * 90 + 10)}`;
}
export const operationName = (rand = Math.random) => `${pick(ADJ, rand)} ${pick(OP_NOUN, rand)}`;
