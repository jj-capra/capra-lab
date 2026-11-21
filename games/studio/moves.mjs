/* Studio: reading moves from the pose model's points (no camera, no DOM). Points come in screen
   space, already mirrored like the picture: x 0..1 left to right, y 0..1 top to bottom, and the
   screen's width over its height (aspect) so distances are measured in screen heights.
   - hands: the index fingertip (the wrist when the finger isn't seen), with its speed, for the
     stardust trails;
   - clap: the hands meeting fast (closer than half a shoulder width, after being more than one
     apart within 0.3 s), at most every 0.35 s;
   - nova: both hands up over the head for 0.2 s (again once a hand comes back below the shoulders);
   - head and shoulders, for the parallax and the aura's middle. */
const L = { nose: 0, lSh: 11, rSh: 12, lWr: 15, rWr: 16, lIdx: 19, rIdx: 20, lHip: 23, rHip: 24 };
const seen = (p, v = 0.45) => !!p && (p.visibility == null || p.visibility > v);

export function createMoves() {
  const st = { dist: [], lastClap: -1e9, upSince: null, novaArmed: true, lastNova: -1e9, prev: [null, null] };
  return {
    update(lm, t, aspect = 1) {
      const events = [];
      if (!lm || lm.length < 25) { st.prev = [null, null]; st.dist.length = 0; st.upSince = null; return { events, hands: [null, null], head: null, body: null }; }
      const P = (i) => ({ x: lm[i].x * aspect, y: lm[i].y });
      const shOk = seen(lm[L.lSh]) && seen(lm[L.rSh]);
      const sw = shOk ? Math.max(0.05, Math.hypot(P(L.lSh).x - P(L.rSh).x, P(L.lSh).y - P(L.rSh).y)) : 0.18;
      const head = seen(lm[L.nose], 0.3) ? { x: lm[L.nose].x, y: lm[L.nose].y } : null;
      const body = shOk ? { x: (lm[L.lSh].x + lm[L.rSh].x) / 2, y: (lm[L.lSh].y + lm[L.rSh].y) / 2, sw: sw / aspect } : null;
      const hands = [[L.lIdx, L.lWr], [L.rIdx, L.rWr]].map(([idx, wr], k) => {
        const i = seen(lm[idx], 0.5) ? idx : seen(lm[wr]) ? wr : -1;
        if (i < 0) { st.prev[k] = null; return null; }
        const p = { x: lm[i].x, y: lm[i].y, t };
        const q = st.prev[k];
        let vx = 0, vy = 0;
        if (q && t > q.t && t - q.t < 0.25) { vx = (p.x - q.x) / (t - q.t); vy = (p.y - q.y) / (t - q.t); }
        st.prev[k] = p;
        return { x: p.x, y: p.y, vx, vy, speed: Math.hypot(vx * aspect, vy) };
      });
      // clap
      const wOk = seen(lm[L.lWr]) && seen(lm[L.rWr]);
      if (wOk) {
        const a = P(L.lWr), b = P(L.rWr), d = Math.hypot(a.x - b.x, a.y - b.y) / sw;
        st.dist.push({ t, d });
        while (st.dist.length && t - st.dist[0].t > 0.3) st.dist.shift();
        const wasApart = st.dist.some((s) => s.d > 1.1);
        if (d < 0.5 && wasApart && t - st.lastClap > 0.35) {
          st.lastClap = t; st.dist.length = 0;
          events.push({ type: 'clap', x: (lm[L.lWr].x + lm[L.rWr].x) / 2, y: (lm[L.lWr].y + lm[L.rWr].y) / 2 });
        }
      } else st.dist.length = 0;
      // nova: both hands up over the head
      if (wOk && head) {
        const up = lm[L.lWr].y < head.y - 0.25 * sw && lm[L.rWr].y < head.y - 0.25 * sw;
        const down = shOk && (lm[L.lWr].y > Math.min(lm[L.lSh].y, lm[L.rSh].y) || lm[L.rWr].y > Math.min(lm[L.lSh].y, lm[L.rSh].y));
        if (down) st.novaArmed = true;
        if (up) {
          if (st.upSince == null) st.upSince = t;
          if (st.novaArmed && t - st.upSince >= 0.2 && t - st.lastNova > 1.5) {
            st.novaArmed = false; st.lastNova = t;
            events.push({ type: 'nova', x: head.x, y: head.y });
          }
        } else st.upSince = null;
      }
      return { events, hands, head, body };
    },
  };
}
