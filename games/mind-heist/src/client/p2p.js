// Direct links between the phones in an invite game.
//
// The server stays the only source of game state (it holds the answers). These links do
// two things on top of it:
//   1. Nudges: the moment any phone sees a newer room version, it tells every other phone,
//      and each one fetches its own view right away instead of waiting for its next check.
//   2. Open mic: crewmates who turn it on hear each other. Audio only ever flows between
//      two people on the same crew who both have it on.
//
// Introductions go through the server: each tab announces itself (POST /peer), then each
// pair swaps one offer and one answer through a mailbox (POST/GET /sig). The tab with the
// smaller id makes the offer. Every link between two players carries a silent audio lane from
// the start, so Open mic only plugs the microphone into the lanes to teammates (no second
// negotiation, nothing to race). Public STUN only, no relay: a link that can't connect just
// isn't used, and that phone keeps checking the server on its own like before.
import { cleanEmoji } from '../shared/emoji.mjs';
import { api, getAuth } from './api.js';
import { at } from './base.js';

const ICE = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  { urls: 'stun:stun.cloudflare.com:3478' },
];
const OPEN = 'open';
const PENDING = ['new', 'offered', 'waiting', 'answered'];
const GIVE_UP_MS = 20000;
const MAX_TRIES = 3;

export const p2pSupported = () => typeof RTCPeerConnection === 'function' && typeof RTCPeerConnection.prototype.createDataChannel === 'function';

function newTabId() {
  const a = 'abcdefghijkmnpqrstuvwxyz23456789';
  let s = '';
  const r = crypto.getRandomValues(new Uint8Array(6));
  for (const b of r) s += a[b % a.length];
  return s;
}

function waitIce(pc, ms = 2500) {
  if (pc.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise((res) => {
    const t = setTimeout(res, ms);
    pc.addEventListener('icegatheringstatechange', () => { if (pc.iceGatheringState === 'complete') { clearTimeout(t); res(); } });
  });
}

export function createMesh({ code, kind = 'play', onNudge, onChange, onReact }) {
  const auth = getAuth();
  if (!auth || !p2pSupported()) return null;
  const self = `${auth.pid}.${newTabId()}`;
  const links = new Map();
  let roster = [];
  let crewOf = () => -1;
  let myCrew = -1;
  let since = 0, pollTimer = null, polling = false, closed = false;
  let announced = false, announcing = false, lastAnnounce = 0;
  let lastV = 0;
  const seenRx = new Set(); // reaction batches already shown (they're relayed once)
  const gone = new Set(); // tabs that said goodbye; ignored until the server forgets them
  const voice = { on: false, stream: null, track: null };
  const changed = () => { if (!closed && onChange) onChange(); };

  /* ---- introductions ---- */
  async function announce() {
    if (announcing || closed) return;
    announcing = true; lastAnnounce = Date.now();
    try { await api('POST', `/rooms/${code}/peer`, { id: self, kind }); announced = true; }
    catch (e) { /* try again on the next update */ }
    announcing = false;
  }
  async function sendSignal(to, d) {
    try { await api('POST', `/rooms/${code}/sig`, { from: self, to, d }); return true; } catch (e) { return false; }
  }
  function ensurePolling() {
    if (closed || polling) return;
    const pending = [...links.values()].some(l => PENDING.includes(l.state));
    if (!pending) return;
    polling = true;
    const tick = async () => {
      if (closed) { polling = false; return; }
      try {
        const box = await api('GET', `/rooms/${code}/sig?peer=${encodeURIComponent(self)}&since=${since}`);
        for (const msg of box.msgs) await onSignal(msg);
        since = Math.max(since, box.seq || 0);
      } catch (e) { /* keep trying while links are pending */ }
      const now = Date.now();
      for (const l of links.values()) if (PENDING.includes(l.state) && now - l.startedAt > GIVE_UP_MS) fail(l);
      if (![...links.values()].some(l => PENDING.includes(l.state))) { polling = false; return; }
      pollTimer = setTimeout(tick, 900);
    };
    pollTimer = setTimeout(tick, 300);
  }

  /* ---- links ---- */
  function newPc(link) {
    const pc = new RTCPeerConnection({ iceServers: ICE });
    pc.onconnectionstatechange = () => { if (['failed', 'closed'].includes(pc.connectionState) && link.pc === pc) fail(link); };
    pc.ondatachannel = (e) => { if (link.pc === pc) setupDc(link, e.channel); };
    pc.ontrack = (e) => { if (link.pc === pc) attachAudio(link, e); };
    return pc;
  }
  function makeLink(id, pid, k) {
    const link = { id, pid, kind: k, pc: null, dc: null, state: 'new', initiator: self < id, polite: self > id, tries: 0,
      startedAt: Date.now(), ready: false, voiceOn: false, tx: null, sending: false, audio: null };
    links.set(id, link);
    if (link.initiator) startOffer(link); else link.state = 'waiting';
    ensurePolling();
    return link;
  }
  async function startOffer(link) {
    if (closed) return;
    teardown(link);
    link.tries += 1;
    link.state = 'new';
    link.startedAt = Date.now();
    const pc = (link.pc = newPc(link));
    setupDc(link, pc.createDataChannel('mh', { ordered: true }));
    // A voice lane between two players, silent until Open mic plugs a microphone in.
    if (kind === 'play' && link.kind === 'play') link.tx = pc.addTransceiver('audio', { direction: 'sendrecv' });
    try {
      await pc.setLocalDescription(await pc.createOffer());
      await waitIce(pc);
      if (link.pc !== pc) return;
      // Ready for the answer before the offer goes out: it can come back very quickly.
      link.state = 'offered';
      link.startedAt = Date.now();
      ensurePolling();
      if (!(await sendSignal(link.id, { t: 'offer', sdp: pc.localDescription.sdp }))) return fail(link);
    } catch (e) { fail(link); }
  }
  async function onSignal(msg) {
    if (closed || !msg || !msg.d) return;
    let link = links.get(msg.from);
    if (!link) {
      const peer = roster.find(p => p.id === msg.from);
      link = makeLink(msg.from, peer ? peer.pid : msg.from.split('.')[0], peer ? peer.kind : 'play');
    }
    try {
      if (msg.d.t === 'offer') {
        teardown(link);
        link.state = 'answered';
        link.startedAt = Date.now();
        const pc = (link.pc = newPc(link));
        await pc.setRemoteDescription({ type: 'offer', sdp: msg.d.sdp });
        link.tx = pc.getTransceivers().find(t => t.receiver && t.receiver.track && t.receiver.track.kind === 'audio') || null;
        if (link.tx) link.tx.direction = 'sendrecv';
        await pc.setLocalDescription(await pc.createAnswer());
        await waitIce(pc);
        if (link.pc !== pc) return;
        if (!(await sendSignal(link.id, { t: 'answer', sdp: pc.localDescription.sdp }))) fail(link);
      } else if (msg.d.t === 'answer' && link.pc && link.state === 'offered') {
        await link.pc.setRemoteDescription({ type: 'answer', sdp: msg.d.sdp });
        link.state = 'answered';
      }
    } catch (e) { fail(link); }
  }
  function setupDc(link, dc) {
    link.dc = dc;
    dc.onopen = () => {
      if (link.dc !== dc) return;
      link.ready = true;
      link.state = OPEN;
      link.tries = 0;
      send(link, { t: 'hi', voice: voice.on, v: lastV });
      syncVoice();
      changed();
    };
    dc.onclose = () => { if (link.dc === dc) fail(link); };
    dc.onmessage = (e) => { let m; try { m = JSON.parse(e.data); } catch (x) { return; } onMsg(link, m); };
  }
  function send(link, m) {
    if (link.dc && link.dc.readyState === 'open') { try { link.dc.send(JSON.stringify(m)); } catch (e) {} }
  }
  async function onMsg(link, m) {
    switch (m.t) {
      case 'v': gotVersion(m.v, link); break;
      case 'hi': link.voiceOn = !!m.voice; if (m.v) gotVersion(m.v, link); syncVoice(); changed(); break;
      case 'voice': link.voiceOn = !!m.on; syncVoice(); changed(); break;
      case 'bye': gone.add(link.id); drop(link.id); changed(); break;
      case 'rx': gotReact(m, link); break;
      default:
    }
  }
  function teardown(link) {
    link.ready = false;
    link.tx = null;
    link.sending = false;
    if (link.dc) { try { link.dc.onclose = null; link.dc.close(); } catch (e) {} }
    if (link.pc) { try { link.pc.onconnectionstatechange = null; link.pc.close(); } catch (e) {} }
    link.dc = null; link.pc = null;
    if (link.audio) { link.audio.srcObject = null; }
  }
  function fail(link) {
    if (closed || link.state === 'failed') return;
    const wasOpen = link.state === OPEN;
    teardown(link);
    link.state = 'failed';
    changed();
    // The offering side tries again a few times; a dropped link gets a fresh start.
    // The answering side keeps listening for those retries.
    if (wasOpen) { link.tries = 0; link.waits = 0; }
    if (link.initiator && link.tries < MAX_TRIES) {
      setTimeout(() => { if (!closed && links.get(link.id) === link && roster.some(p => p.id === link.id)) startOffer(link); }, 3000 + 3000 * link.tries);
    } else if (!link.initiator && (link.waits = (link.waits || 0) + 1) <= MAX_TRIES) {
      link.state = 'waiting';
      link.startedAt = Date.now() + 6000;
      setTimeout(ensurePolling, 6000);
    }
  }
  function drop(id) {
    const link = links.get(id);
    if (!link) return;
    teardown(link);
    if (link.audio) { link.audio.remove(); link.audio = null; }
    links.delete(id);
  }

  /* ---- nudges ---- */
  function gotVersion(v, from) {
    if (!(v > lastV)) return;
    lastV = v;
    // Pass it on so phones that couldn't link to the sender still hear about it.
    for (const l of links.values()) if (l !== from && l.state === OPEN) send(l, { t: 'v', v });
    if (onNudge) onNudge(v);
  }
  // Emoji reactions travel phone to phone (no server, no credits) and are relayed once
  // so phones that couldn't link to the sender still see them.
  function gotReact(m, from) {
    const e = cleanEmoji(m.e);
    if (!e || typeof m.id !== 'string' || m.id.length > 40 || seenRx.has(m.id)) return;
    seenRx.add(m.id);
    if (seenRx.size > 400) seenRx.delete(seenRx.values().next().value);
    const c = Math.max(1, Math.min(12, m.c | 0 || 1));
    const pid = m.relayed ? String(m.pid || '') : from.pid; // a direct sender can't claim to be someone else
    if (!m.relayed) for (const l of links.values()) if (l !== from && l.state === OPEN) send(l, { t: 'rx', e, c, id: m.id, pid, relayed: 1 });
    if (onReact) onReact({ e, c, id: m.id, pid });
  }
  function react(e, c, id) {
    seenRx.add(id);
    for (const l of links.values()) if (l.state === OPEN) send(l, { t: 'rx', e, c, id, pid: auth.pid });
  }
  // Call with every room version this tab learns from the server.
  function noteVersion(v) {
    if (!(v > lastV)) return;
    lastV = v;
    for (const l of links.values()) if (l.state === OPEN) send(l, { t: 'v', v });
  }

  /* ---- Open mic ---- */
  function teammate(link) { return link.kind === 'play' && myCrew >= 0 && crewOf(link.pid) === myCrew && link.pid !== auth.pid; }
  function syncVoice() {
    for (const link of links.values()) {
      const want = !!(voice.on && voice.track && link.ready && link.voiceOn && teammate(link) && link.tx);
      if (link.tx && want !== link.sending) {
        link.sending = want;
        link.tx.sender.replaceTrack(want ? voice.track : null).catch(() => { link.sending = false; });
      }
      // Only play a crewmate who is actually on air (a silent lane can hiss on some phones).
      if (link.audio) link.audio.muted = !(voice.on && teammate(link) && link.voiceOn);
    }
  }
  function attachAudio(link, e) {
    if (!link.audio) {
      const a = document.createElement('audio');
      a.autoplay = true; a.setAttribute('playsinline', ''); a.className = 'peer-audio';
      document.body.appendChild(a);
      link.audio = a;
    }
    link.audio.srcObject = (e.streams && e.streams[0]) || new MediaStream([e.track]);
    link.audio.muted = !(voice.on && teammate(link) && link.voiceOn);
    link.audio.play().catch(() => {});
  }
  async function setVoice(on) {
    if (on === voice.on) return true;
    if (on) {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('This browser can’t use the microphone.');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      voice.stream = stream; voice.track = stream.getAudioTracks()[0]; voice.on = true;
    } else {
      if (voice.stream) voice.stream.getTracks().forEach(t => t.stop());
      voice.stream = null; voice.track = null; voice.on = false;
    }
    for (const l of links.values()) if (l.state === OPEN) send(l, { t: 'voice', on: voice.on });
    syncVoice();
    for (const l of links.values()) if (l.audio && voice.on) l.audio.play().catch(() => {});
    changed();
    return true;
  }

  /* ---- the room changed ---- */
  function update(room) {
    if (closed || !room) return;
    myCrew = room.myCrew ?? -1;
    const crewByPid = {};
    (room.crews || []).forEach((c, k) => c.mem.forEach(id => { crewByPid[id] = k; }));
    crewOf = (pid) => (pid in crewByPid ? crewByPid[pid] : -1);
    const peers = room.peers || [];
    if (!peers.some(p => p.id === self)) { if (!announced || Date.now() - lastAnnounce > 10000) announce(); }
    roster = peers.filter(p => p.id !== self && !gone.has(p.id) && !(kind === 'tv' && p.kind === 'tv'));
    for (const p of roster) if (!links.has(p.id)) makeLink(p.id, p.pid, p.kind);
    for (const id of [...links.keys()]) if (!roster.some(p => p.id === id)) drop(id);
    if (room.v) noteVersion(room.v);
    syncVoice();
    ensurePolling();
    changed();
  }

  function status() {
    const all = [...links.values()];
    const mates = all.filter(l => teammate(l));
    return {
      total: all.length,
      open: all.filter(l => l.state === OPEN).length,
      openPids: [...new Set(all.filter(l => l.state === OPEN && l.kind === 'play').map(l => l.pid))],
      voice: voice.on,
      mates: mates.length,
      matesOnAir: mates.filter(l => l.state === OPEN && l.voiceOn).map(l => l.pid),
    };
  }

  function close() {
    if (closed) return;
    closed = true;
    clearTimeout(pollTimer);
    if (voice.stream) voice.stream.getTracks().forEach(t => t.stop());
    for (const l of links.values()) send(l, { t: 'bye' });
    for (const id of [...links.keys()]) drop(id);
    // Leave quietly so the others stop expecting this tab.
    try {
      fetch(at(`/api/rooms/${code}/peer`), { method: 'POST', keepalive: true,
        headers: { 'content-type': 'application/json', authorization: `Bearer ${auth.pid}.${auth.token}` },
        body: JSON.stringify({ id: self, kind, gone: true }) });
    } catch (e) {}
  }

  // A test hook: lets the browser tests look at link and audio state.
  const debug = () => [...links.values()].map(l => ({ id: l.id, pid: l.pid, state: l.state, voiceOn: l.voiceOn, sending: !!(l.tx && l.tx.sender.track),
    receiving: !!(l.pc && l.pc.getTransceivers().some(t => t.receiver.track && t.receiver.track.kind === 'audio' && t.currentDirection && t.currentDirection.includes('recv') && !t.receiver.track.muted)),
    playing: !!(l.audio && !l.audio.muted && l.audio.srcObject) }));

  const debugPc = () => [...links.values()].filter(l => l.pc).map(l => ({ id: l.id, sig: l.pc.signalingState, conn: l.pc.connectionState,
    tx: l.pc.getTransceivers().map(t => ({ mid: t.mid, dir: t.direction, cur: t.currentDirection, kind: t.receiver.track && t.receiver.track.kind, muted: t.receiver.track && t.receiver.track.muted, send: !!(t.sender && t.sender.track) })) }));
  return { self, update, noteVersion, setVoice, status, close, debug, debugPc, react };
}
