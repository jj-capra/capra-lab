/* Capra's Lab: JC's private side of Capra Lab (JC, Nov 2026: "I am the creator. My JJ-Capra has
 * master controls... exclusive access to test games before they go live and to trivia decks I
 * can hide from the public. This should be called Capra's Lab. My son also gets this access.").
 *
 * The owner (JJ-Capra) has master controls: he decides who's on the crew and which Mind Heist
 * decks the public can see. The crew gets the same early access: games still in testing and the
 * hidden decks. Membership is by lab handle; every request still proves the profile with its
 * key (profiles.verify), so being on the list is never enough without the key.
 *
 *   capras-lab/crew   { handles: [handle, ...], names: { handle: name } }   (in the profile store)
 *
 * Until the owner first changes the crew, it is FIRST_CREW.
 */
import { handleOf } from './profiles.js';

export const OWNERS = ['jj-capra'];
export const FIRST_CREW = { 'da-roman-empire': 'DA_ROMAN_EMPIRE' };
const CREW_KEY = 'capras-lab/crew';

export function createCrew(store) {
  async function read() {
    const c = await store.get(CREW_KEY);
    return c && Array.isArray(c.handles) ? { handles: c.handles, names: c.names || {} }
      : { handles: Object.keys(FIRST_CREW), names: { ...FIRST_CREW } };
  }
  const listOf = (c) => c.handles.map((h) => ({ handle: h, name: c.names[h] || h }));

  return {
    /* 'owner', 'crew' or null for a verified lab handle */
    async role(handle) {
      if (!handle) return null;
      if (OWNERS.includes(handle)) return 'owner';
      return (await read()).handles.includes(handle) ? 'crew' : null;
    },
    async list() { return listOf(await read()); },
    /* Only a profile that already exists can join, so nobody can take a name the owner added early. */
    async add(name) {
      const handle = handleOf(name);
      const p = handle && await store.get('profile/' + handle);
      if (!p) return { status: 404, error: 'No Capra Lab profile by that name yet. Have them make one first.' };
      if (OWNERS.includes(handle)) return { status: 400, error: 'That’s you. You already have master controls.' };
      const c = await read();
      if (!c.handles.includes(handle)) c.handles.push(handle);
      c.names[handle] = p.name;
      await store.set(CREW_KEY, c);
      return { crew: listOf(c) };
    },
    async remove(handle) {
      const c = await read();
      c.handles = c.handles.filter((h) => h !== handle);
      delete c.names[handle];
      await store.set(CREW_KEY, c);
      return { crew: listOf(c) };
    },
  };
}

/* POST /api/profile/capras-lab  { name, code, op?, crewName?, handle? }
 *   op omitted       -> { role, name }, plus { crew } for the owner; { role: null } for everyone else
 *   op 'crew-add'    -> owner only: { crew }
 *   op 'crew-remove' -> owner only: { crew }
 * A wrong key gets the same answer as signing in with one (401), and counts toward the lock. */
export async function routeCrew(profiles, crew, body) {
  body = body || {};
  const p = await profiles.verify(body.name, body.code);
  if (!p) return (await profiles.locked(body.name))
    ? { status: 429, error: 'Too many wrong keys for that name. Wait 10 minutes and try again.' }
    : { status: 401, error: 'No profile with that name and key.' };
  const role = await crew.role(p.handle);
  if (!body.op) return role === 'owner' ? { role, name: p.name, crew: await crew.list() } : { role, name: p.name };
  if (role !== 'owner') return { status: 403, error: 'Only the owner can change Capra’s Lab.' };
  if (body.op === 'crew-add') return crew.add(String(body.crewName || '').slice(0, 24));
  if (body.op === 'crew-remove') return crew.remove(String(body.handle || ''));
  return { status: 400, error: 'Unknown request.' };
}
