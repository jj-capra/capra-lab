// Copies every Mind Heist record (profiles, keys, friends, streaks, diamonds, challenges, rooms,
// Vault Jam boards) from the old mind-heist.netlify.app site into Capra Lab's site, where Mind
// Heist now runs. Nothing on the old site is changed or deleted, so it stays as a backup.
// It uses the Netlify login already on this computer (the one deploy.cmd used).
//
//   node copy-players.mjs            (MOVE MIND HEIST.cmd runs it for you)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const STORE = 'mind-heist-daily';
const OLD_SITE = 'mind-heist';
const NEW_SITE = 'capra-lab';
const LIVE_CHECK = 'https://capra-lab.netlify.app/mind-heist/api/home';

// The Netlify CLI keeps its login in a config file; where depends on the computer.
export function findToken(env = process.env, home = os.homedir(), exists = fs.existsSync, read = (f) => fs.readFileSync(f, 'utf8')) {
  if (env.NETLIFY_AUTH_TOKEN) return env.NETLIFY_AUTH_TOKEN;
  const spots = [
    env.APPDATA && path.join(env.APPDATA, 'netlify', 'Config', 'config.json'),
    path.join(home, 'AppData', 'Roaming', 'netlify', 'Config', 'config.json'),
    path.join(home, '.config', 'netlify', 'config.json'),
    path.join(home, 'Library', 'Preferences', 'netlify', 'config.json'),
    path.join(home, '.netlify', 'config.json'),
  ].filter(Boolean);
  for (const f of spots) {
    if (!exists(f)) continue;
    try {
      const c = JSON.parse(read(f));
      const users = c.users || {};
      const u = users[c.userId] || Object.values(users)[0];
      if (u && u.auth && u.auth.token) return u.auth.token;
    } catch { /* not this one */ }
  }
  return null;
}

export async function siteId(token, name, fetchFn = fetch) {
  const r = await fetchFn('https://api.netlify.com/api/v1/sites?filter=all&per_page=100&name=' + encodeURIComponent(name), {
    headers: { authorization: 'Bearer ' + token },
  });
  if (r.status === 401) throw new Error('The Netlify login on this computer has expired. Run: npx netlify-cli login, then try again.');
  if (!r.ok) throw new Error(`Netlify answered ${r.status} when looking up the ${name} site.`);
  const site = (await r.json()).find((s) => s.name === name);
  if (!site) throw new Error(`This Netlify login has no site named ${name}.`);
  return site.id || site.site_id;
}

async function retry(fn, tries = 4) {
  for (let i = 1; ; i++) {
    try { return await fn(); } catch (e) { if (i >= tries) throw e; await new Promise((r) => setTimeout(r, 300 * i)); }
  }
}

// Copies every key. A key Capra Lab already has is left alone (someone may have played there
// already), so running this twice is safe.
export async function copyAll(from, to, { log = () => {}, pool = 8 } = {}) {
  const { blobs } = await retry(() => from.list());
  const keys = blobs.map((b) => b.key);
  const out = { total: keys.length, copied: 0, kept: 0, failed: [] };
  let next = 0;
  const worker = async () => {
    while (next < keys.length) {
      const key = keys[next++];
      try {
        const data = await retry(() => from.get(key, { type: 'arrayBuffer' }));
        if (data == null) continue;
        const w = await retry(() => to.set(key, data, { onlyIfNew: true }));
        if (w && w.modified === false) out.kept++; else out.copied++;
      } catch (e) {
        out.failed.push(`${key}: ${e.message}`);
      }
      const done = out.copied + out.kept + out.failed.length;
      if (done % 250 === 0) log(`  ${done} of ${keys.length}`);
    }
  };
  await Promise.all(Array.from({ length: pool }, worker));
  return out;
}

// Every key from the old site has to be there now.
export async function missing(from, to) {
  const [a, b] = await Promise.all([retry(() => from.list()), retry(() => to.list())]);
  const have = new Set(b.blobs.map((x) => x.key));
  return a.blobs.map((x) => x.key).filter((k) => !have.has(k));
}

async function main() {
  const say = (s = '') => console.log(s);
  const stop = (msg) => { say(); say('  ' + msg); say(); process.exit(1); };
  say('  Checking that Capra Lab is running Mind Heist...');
  const live = await fetch(LIVE_CHECK).then((r) => r.ok && /json/.test(r.headers.get('content-type') || '')).catch(() => false);
  if (!live) stop('Capra Lab is not running Mind Heist yet. Wait a few minutes for Netlify to finish, then run this again.');
  const token = findToken();
  if (!token) stop('No Netlify login found on this computer. Run: npx netlify-cli login, then run this again.');
  let oldId, newId;
  try { [oldId, newId] = await Promise.all([siteId(token, OLD_SITE), siteId(token, NEW_SITE)]); } catch (e) { stop(e.message); }
  const { getStore } = await import('@netlify/blobs');
  const from = getStore({ name: STORE, siteID: oldId, token });
  const to = getStore({ name: STORE, siteID: newId, token });
  say(`  Copying Mind Heist's records from ${OLD_SITE} to ${NEW_SITE}...`);
  const r = await copyAll(from, to, { log: say });
  const gone = await missing(from, to);
  const lines = [
    `Mind Heist move, ${new Date().toISOString()}`,
    `records on the old site: ${r.total}`,
    `copied into Capra Lab:   ${r.copied}`,
    `already in Capra Lab:    ${r.kept}`,
    `failed:                  ${r.failed.length}`,
    ...r.failed.map((f) => '  ' + f),
    `missing after the copy:  ${gone.length}`,
    ...gone.slice(0, 50).map((k) => '  ' + k),
  ];
  fs.writeFileSync('move-log.txt', lines.join('\n') + '\n');
  say(); lines.slice(1).forEach((l) => say('  ' + l)); say();
  if (r.failed.length || gone.length) stop('Some records did not copy (see move-log.txt). Run this again; it only copies what is still missing.');
  say('  Every player is in Capra Lab.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
