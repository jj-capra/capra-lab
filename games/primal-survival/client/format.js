/* Display units. The roster is stored metric because that is how the sources
   publish it; nothing a player reads is metric. */
export const TO_LB = 2.2046226, TO_MPH = 0.621371;

export function massLabel(kg) {
  const lb = kg * TO_LB;
  if (lb >= 4000) return Math.round(lb / 2000).toLocaleString() + ' tons';
  if (lb >= 100) return Math.round(lb).toLocaleString() + ' lb';
  if (lb >= 10) return Math.round(lb) + ' lb';
  return lb.toFixed(1) + ' lb';
}
export function speedLabel(kph) {
  const m = kph * TO_MPH;
  return (m >= 10 ? Math.round(m) : m.toFixed(1)) + ' mph';
}
export function inPeople(kg) {
  const n = kg / 77;  /* 170 lb */
  if (n >= 2) return 'about ' + Math.round(n).toLocaleString() + ' people';
  if (n >= 0.8) return 'about the weight of a person';
  if (n >= 0.08) return 'a fraction of a person';
  return 'lighter than a housecat';
}
