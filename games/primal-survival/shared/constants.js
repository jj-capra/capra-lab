/* ---------- tuning dials — every balance lever lives here ---------- */
export const TUNE = {
  separation: 1.6,    // how much a rating gap matters. higher = fewer upsets
  counterWin: 1.175,  // counter advantage  (1.175/0.825 = a 42% swing)
  counterLose: 0.825,
  fitHome: 1.12, fitNeutral: 1.0, fitOff: 0.92, fitWrongClimate: 0.86, fitWrongElement: 0.78,
  jitter: 0.07,       // random band, 7% total. keep small or skill stops reading
  ghostBase: 54, ghostClimb: 21, ghostCurve: 0.5,   // quality of who you face
  pressBase: 0.88, pressClimb: 0.22, pressCurve: 0.5, // how hard they push
  daysToWin: 3,       // duels you must win out of five

  /* Your five learn the ground. Every adaptEvery days survived each animal
     gains adaptStep to its rating, up to adaptCap. Without this the opposition
     ramps and you do not, which puts a hard ceiling on every run no matter how
     well it was drafted. */
  adaptEvery: 20, adaptStep: 1, adaptCap: 12,

  /* One second chance per run. A day lost by a single duel is the most
     painful way to end, so the first one does not end it. */
  rallies: 1
};
export const ERA_NAME = { now:'Present day', ice:'Ice Age', cret:'Cretaceous', paleo:'Paleozoic' };
export const BIOME_NAME = {
  savanna:'Savanna', rainforest:'Rainforest', ocean:'Open ocean', arctic:'Arctic',
  desert:'Desert', wetland:'Wetland', mountain:'High mountain'
};
export const BIOME_CLIMATE = {
  savanna:'hot', desert:'hot', rainforest:'hot',
  wetland:'temperate', mountain:'cold', arctic:'cold', ocean:'water'
};
export const ROLES = ['apex','bulwark','sprinter','ranger','swarm'];
export const ROLE_LABEL = { apex:'Apex', bulwark:'Bulwark', sprinter:'Sprinter', ranger:'Ranger', swarm:'Swarm' };
export const ROLE_DESC = {
  apex:'kills what the others cannot',
  bulwark:'takes the hit and stays standing',
  sprinter:'wins the opening seconds',
  ranger:'still going when everything else stops',
  swarm:'numbers, venom, or cunning'
};
/* counter chain: swarm > bulwark > apex > sprinter > ranger > swarm */
export const BEATS = { swarm:'bulwark', bulwark:'apex', apex:'sprinter', sprinter:'ranger', ranger:'swarm' };
export const WEIGHTS = {
  apex:     { pow:.48, mass:.18, spd:.16, gui:.18 },
  bulwark:  { arm:.42, mass:.33, pow:.15, sta:.10 },
  sprinter: { spd:.62, pow:.14, gui:.10, sta:.14 },
  ranger:   { sta:.52, spd:.18, mass:.10, gui:.20 },
  swarm:    { gui:.46, pow:.26, spd:.14, sta:.14 }
};
