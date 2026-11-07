/* The inks.
 *
 * One module owns the palette because two did: render.js and keycard.js each
 * declared their own `INK` and `BONE`, which is perfectly legal as ES modules
 * and fatal the moment the single-file bundler flattens every module into one
 * scope — `Identifier 'INK' has already been declared` kills the whole script,
 * and the offline build renders its static HTML and does nothing.
 *
 * These are the same values as the CSS custom properties in index.html. They
 * are duplicated here because canvas and SVG attributes cannot read a CSS
 * variable, so if you change one, change both.
 */
export const INK     = '#11060B';   /* black pulled toward red-violet */
export const INK2    = '#1D0F16';
export const PAPER   = '#F4E7CE';   /* newsprint */
export const BONE    = '#FFF8EE';
export const BLOOD   = '#E02A2A';
export const SKY     = '#19C6D8';
export const FLARE   = '#FFD02E';
export const VIOLET  = '#A855F7';

/* Each slot gets an ink, so colour carries the role rather than decorating it. */
export const ROLE_INK = {
  apex: BLOOD,
  bulwark: PAPER,
  sprinter: FLARE,
  ranger: SKY,
  swarm: VIOLET
};

/* Bulwark's cream and Sprinter's yellow are light grounds: a bone silhouette
 * on them all but disappears, so those get an ink figure instead. Same
 * drawing, inverted plate — what a printer would do. */
const LIGHT_GROUND = { bulwark: true, sprinter: true };
export const figureOn = role => (LIGHT_GROUND[role] ? INK : BONE);
