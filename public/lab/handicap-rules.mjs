// The golf handicap a player keeps on their Capra Lab profile (JC, Nov 13 2026: "Have a handicap for
// players to select in their profile"; his picks: strokes off the score, and on Masters challenges the
// net score decides, with a handicap that changes at most once a week so nobody games it).
//
// A handicap is strokes over 18 holes, 0 (scratch) to HCP_MAX. A shorter round gets its share,
// rounded: a 6 takes 6 off an 18, 3 off an 8-hole Masters, none off a single hole.
// Read by lab/profiles.js (the stored value and the weekly lock), Par-Tee Time's Masters server
// (net decides the course best) and the pages (/lab/handicap.js, Par-Tee Time's cards).
export const HCP_MAX = 18;
export const HCP_LOCK_MS = 7 * 24 * 3600e3;

export const cleanHcp = (v) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.max(0, Math.min(HCP_MAX, n)) : 0; };
export const strokesFor = (hcp, holes) => Math.round(cleanHcp(hcp) * Math.max(0, holes | 0) / 18);
export const hcpLabel = (hcp) => (cleanHcp(hcp) === 0 ? 'Scratch' : String(cleanHcp(hcp)));
// when a player who set their handicap at `at` can change it again (0 = now)
export const hcpNext = (at) => (at ? at + HCP_LOCK_MS : 0);
