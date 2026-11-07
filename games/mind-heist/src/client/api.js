// Talking to /api with the profile stored on this device.
import { at } from './base.js';

const KEY = 'mh.auth';

export function getAuth() {
  try { const a = JSON.parse(localStorage.getItem(KEY) || 'null'); return a && a.pid && a.token ? a : null; } catch (e) { return null; }
}
export function setAuth(a) { try { if (a) localStorage.setItem(KEY, JSON.stringify({ pid: a.pid, token: a.token })); else localStorage.removeItem(KEY); } catch (e) {} }

let skew = 0; // server clock minus this device's clock
export const serverNow = () => Date.now() + skew;

export class ApiError extends Error { constructor(status, msg) { super(msg); this.status = status; } }

// A request that never answers (a phone switching networks, a stalled connection) used to
// freeze a room screen for good: nothing else could load while it hung. Every call gives up
// after a few seconds so the next check-in can run.
const TIMEOUT_MS = { GET: 10000, POST: 15000 };

export async function api(method, path, body) {
  const a = getAuth();
  const headers = { 'content-type': 'application/json' };
  if (a) headers.authorization = `Bearer ${a.pid}.${a.token}`;
  const t0 = Date.now();
  const ctl = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = ctl ? setTimeout(() => ctl.abort(), TIMEOUT_MS[method] || 15000) : null;
  let res;
  let data = {};
  try {
    try {
      res = await fetch(at('/api' + path), { method, headers, body: body ? JSON.stringify(body) : undefined, cache: 'no-store', signal: ctl ? ctl.signal : undefined });
    } catch (e) {
      throw new ApiError(0, e && e.name === 'AbortError' ? 'The game took too long to answer. Try that again.' : 'You look offline. Check your connection and try again.');
    }
    try { data = await res.json(); } catch (e) {}
  } finally { clearTimeout(timer); }
  const serverT = data.now || (data.room && data.room.now);
  if (serverT) skew = serverT - (t0 + (Date.now() - t0) / 2);
  if (!res.ok) throw new ApiError(res.status, data.error || 'Something went wrong. Try again.');
  return data;
}
