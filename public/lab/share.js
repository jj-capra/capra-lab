/* The results text, the same in every Capra Lab game (JC, Nov 11 2026: "All results can be shared
   via text in the fun format I have in other games. I want this results text share consistent for
   all Capra lab games"). It's Mind Heist's group-chat card: the message as it will look in the
   chat, then Text it / Share / Copy.

   Load it with <script src="/lab/share.js" defer></script>, then:

     const text = CapraShare.text({ emoji: '🧢', game: 'No Cap', no: 12, sub: 'Timeline Glitch',
                                    lines: ['👑 JC 1,240', 'Roman 980'], grid: ['🟩🟩🟥⚡'] });
     el.innerHTML = '<lab-text-share></lab-text-share>';
     el.firstChild.set({ emoji: '🧢', title: 'No Cap', text, url: 'https://capra-lab.netlify.app/no-cap/' });

   The text always reads: "<emoji> <Game>[ No. N][ · what was played]", the score lines, the emoji
   rows, and the link on its own last line (added by the card). The marks every game shares:
   🟩 right · 🟥 wrong · 🟨 part way · ⬛ nothing · ⚡ fastest · 👑 the winner. */
(function () {
  if (window.CapraShare) return;
  const isPhone = () => /iPhone|iPad|Android|Mobi/i.test(navigator.userAgent);
  const bare = (url) => String(url || '').replace(/^https?:\/\//, '');
  const num = (n) => Number(n).toLocaleString('en-US');

  function text({ emoji = '', game, no, sub, lines = [], grid = [] }) {
    const head = `${emoji ? emoji + ' ' : ''}${game}${no ? ' No. ' + no : ''}${sub ? ' · ' + sub : ''}`;
    return [head, ...lines, ...grid].filter((l) => l != null && l !== '').join('\n');
  }
  async function copy(body) {
    try { await navigator.clipboard.writeText(body); return true; } catch (e) { /* fall through */ }
    try {
      const t = document.createElement('textarea');
      t.value = body; t.style.position = 'fixed'; t.style.opacity = '0';
      document.body.appendChild(t); t.select();
      const ok = document.execCommand('copy'); t.remove();
      return ok;
    } catch (e) { return false; }
  }
  // 'shared' | 'copied' | 'cancel' | 'failed'
  async function send({ title, text, url }) {
    if (navigator.share && isPhone()) {
      try { await navigator.share({ title, text, url }); return 'shared'; } catch (e) { if (e && e.name === 'AbortError') return 'cancel'; }
    }
    return (await copy(url ? `${text}\n${bare(url)}` : text)) ? 'copied' : 'failed';
  }

  const CSS = `
    :host { display: block; }
    * { box-sizing: border-box; }
    .card { display: grid; gap: 12px; }
    .phone { display: grid; gap: 6px; padding: 12px 12px 8px; border-radius: 22px; background: #fff; color: #111; border: 3px solid #120E18; box-shadow: 4px 5px 0 #05030A;
      font-family: -apple-system, "SF Pro Text", system-ui, "Segoe UI", sans-serif; }
    .head { display: grid; justify-items: center; gap: 1px; margin-bottom: 6px; }
    .av { width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; font-size: 22px; background: linear-gradient(#b4b8c1, #8d929c); }
    .head b { font-weight: 600; font-size: 13px; color: #111; }
    .head small { font-weight: 500; font-size: 11px; color: #6e6e73; }
    .bubble { position: relative; justify-self: end; max-width: 92%; padding: 9px 13px; border-radius: 20px 20px 6px 20px; background: #0a84ff; color: #fff; }
    pre { margin: 0; font: 400 16px/1.32 -apple-system, "SF Pro Text", system-ui, "Segoe UI", sans-serif; white-space: pre-wrap; overflow-wrap: anywhere; text-align: left; }
    .tap { position: absolute; top: -14px; left: -12px; width: 30px; height: 30px; display: grid; place-items: center; border-radius: 50%; background: #e9e9eb; border: 2px solid #fff; font-size: 14px; }
    .sent { justify-self: end; margin-right: 6px; font-weight: 500; font-size: 11px; color: #6e6e73; }
    .btns { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; }
    .b { flex: 1 1 96px; min-height: 48px; display: inline-flex; align-items: center; justify-content: center; padding: 10px 14px; border-radius: 14px;
      border: 3px solid #120E18; box-shadow: 3px 4px 0 #05030A; background: #FFF8EC; color: #120E18; font: 800 15px/1 Inter, system-ui, sans-serif; text-decoration: none; cursor: pointer; }
    .b.hi { background: #FFD23F; }
    .b:active { transform: translate(2px, 3px); box-shadow: 1px 1px 0 #05030A; }
    .b:focus-visible { outline: 3px solid #29D3F0; outline-offset: 2px; }
    .note { min-height: 16px; margin: 0; text-align: center; font: 700 13px/1.2 Inter, system-ui, sans-serif; color: inherit; opacity: 0.85; }
    @media (max-width: 360px) { pre { font-size: 15px; } }`;

  class LabTextShare extends HTMLElement {
    constructor() { super(); this.attachShadow({ mode: 'open' }); this._d = null; }
    set(d) { this._d = d; this.render(); }
    render() {
      const d = this._d; if (!d) return;
      const body = d.url ? `${d.text}\n${bare(d.url)}` : d.text;
      const time = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      const phone = isPhone();
      const root = this.shadowRoot;
      root.innerHTML = `<style>${CSS}</style><section class="card" aria-label="Share your results">
        <div class="phone"><div class="head"><span class="av" aria-hidden="true"></span><b>The group chat</b><small>Today ${time}</small></div>
          <div class="bubble"><pre></pre><span class="tap" aria-hidden="true">‼️</span></div><span class="sent">Delivered</span></div>
        <div class="btns">${phone ? '<a class="b hi" id="sms">Text it</a>' : ''}<button class="b${phone ? '' : ' hi'}" type="button" id="share">${phone ? 'Share…' : 'Share the results'}</button><button class="b" type="button" id="copy">Copy</button></div>
        <p class="note" role="status"></p></section>`;
      root.querySelector('.av').textContent = d.emoji || '🐐';
      root.querySelector('pre').textContent = body;
      const note = (t) => { root.querySelector('.note').textContent = t; };
      const sms = root.querySelector('#sms');
      if (sms) sms.href = `sms:?&body=${encodeURIComponent(body)}`;
      root.querySelector('#share').onclick = async () => { const r = await send({ title: d.title || 'Capra Lab', text: d.text, url: d.url }); if (r === 'copied') note('Copied. Paste it in the group chat.'); else if (r === 'failed') note('Couldn’t share from here. Try Copy.'); };
      root.querySelector('#copy').onclick = async () => note((await copy(body)) ? 'Copied. Paste it in the group chat.' : 'Copy didn’t work here.');
    }
  }
  if (!customElements.get('lab-text-share')) customElements.define('lab-text-share', LabTextShare);
  window.CapraShare = { text, send, copy, num, isPhone, bare };
})();
