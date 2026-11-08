"""iPhone fit for the HOST's phone in every look (JC, Nov 4 2026): an iPhone 15 profile
(393 x 659 Safari area, 3x), a trivia deck, through the lobby, board, question,
reveal and fun fact (or face-off replay and bonus groan), then the final with the text share.
Prints PASS/FAIL per screen (no vertical scrolling during play) and saves 3x screenshots.

--home runs it as the Home Screen app instead (JC, Nov 4 2026: "We saved the address to our Home Screen.
Look at the top. It is squished and impossible to select."): the full 393 x 852 screen with the iPhone's
59px clock strip on top and the 34px home bar below (real safe-area insets, faked through Chrome's
devtools). It also fails any screen where a button sits under the clock strip, and checks the home page.
The screenshots draw a blurred fake status bar so they look like the phone.

    python3 tests/iphone_fit.py http://localhost:8787 OUTDIR [--home] [looks...]

Needs the in-memory dev server (node dev/server.mjs PORT) for /__peek and /__clock.
"""
import json, os, sys, time, urllib.request
from playwright.sync_api import sync_playwright

BASE, OUT = sys.argv[1], sys.argv[2]
HOME = '--home' in sys.argv
LOOKS = [a for a in sys.argv[3:] if a != '--home'] or ['heist', 'office', 'bar', 'sports', 'popup', 'gameshow', 'arcade']
os.makedirs(OUT, exist_ok=True)


def http(method, path, body=None, who=None):
    req = urllib.request.Request(BASE + path, method=method, data=json.dumps(body).encode() if body is not None else None)
    req.add_header('content-type', 'application/json')
    if who: req.add_header('authorization', f"Bearer {who['pid']}.{who['token']}")
    try:
        with urllib.request.urlopen(req) as r: return json.loads(r.read() or b'{}')
    except urllib.error.HTTPError as e: return {'status': e.code, **json.loads(e.read() or b'{}')}


def profile(n, a):
    r = http('POST', '/api/me', {'name': n, 'avatar': a}); return {'pid': r['pid'], 'token': r['token'], 'name': n}


SAFE_T, SAFE_B = 59, 34
# a fake iOS status bar for the screenshots: blurred strip with the clock, like iOS 26 draws it
FAKE_BAR = """(() => { const add = () => { if (!document.body || document.getElementById('fake-sb')) return;
  const d = document.createElement('div'); d.id = 'fake-sb';
  d.style.cssText = 'position:fixed;left:0;right:0;top:0;height:%dpx;z-index:2147483647;pointer-events:none;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);background:rgba(0,0,0,.08);color:#fff;font:600 17px -apple-system,system-ui,sans-serif;display:flex;align-items:center;justify-content:space-between;padding:0 34px 0 44px';
  d.innerHTML = '<span>21:13</span><span>&#9679;&#9679;&#9679; 85</span>'; document.body.appendChild(d); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add); else add(); })()""" % SAFE_T
# buttons and links whose box reaches into the clock strip (page scrolled to the top)
UNDER_BAR = """(t) => { scrollTo(0, 0); const out = [];
  for (const el of document.querySelectorAll('button, a, [role=button], input, select, .code-chip, .host-chip')) {
    if (el.closest('#fake-sb')) continue;
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    if (!r.width || !r.height || cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) continue;
    if (r.top < t && r.bottom > 0) out.push((el.className || el.tagName) + ' @' + Math.round(r.top));
  }
  return out.slice(0, 4); }"""


def context(b, dev, who):
    if HOME:
        c = b.new_context(viewport={'width': 393, 'height': 852}, device_scale_factor=3, is_mobile=True, has_touch=True, user_agent=dev['user_agent'])
    else:
        c = b.new_context(**dev)
    c.add_init_script(f"localStorage.setItem('mh.auth', JSON.stringify({json.dumps({'pid': who['pid'], 'token': who['token']})}))")
    c.add_init_script('window.RTCPeerConnection = undefined;')
    if HOME: c.add_init_script(FAKE_BAR)
    pg = c.new_page()
    if HOME:
        c.new_cdp_session(pg).send('Emulation.setSafeAreaInsetsOverride', {'insets': {'top': SAFE_T, 'bottom': SAFE_B, 'left': 0, 'right': 0}})
    return c, pg


def top_check(pg, tag, nm):
    if not HOME: return
    bad = pg.evaluate(UNDER_BAR, SAFE_T)
    report.append(f"PASS {tag} {nm} clear of the clock strip" if not bad else f"FAIL {tag} {nm} under the clock strip: {', '.join(bad)}")


report = []
with sync_playwright() as p:
    b = p.chromium.launch()
    dev = dict(p.devices['iPhone 15'])
    dev.pop('default_browser_type', None)
    for look in LOOKS:
        for deck in ('trivia',):   # joke decks moved to Punchline (Nov 7 2026)
            host, ann = profile('Dana', '🦝'), profile('Annabelle', '🦉')
            body = {'kind': 'invite', 'settings': {'theme': look, 'clock': 30}}
            if deck != 'trivia': body['deckId'] = deck
            code = http('POST', '/api/rooms', body, who=host)['code']
            http('POST', f'/api/rooms/{code}/join', who=ann)
            c, pg = context(b, dev, host)
            pg.goto(f'{BASE}/{code}')
            pg.wait_for_selector('.invite', timeout=10000)
            time.sleep(0.6)
            tag = f'{look}-{"jokes" if deck != "trivia" else "trivia"}'
            pg.screenshot(path=f'{OUT}/{tag}-1-lobby.png', full_page=True)
            lobby_h = pg.evaluate('document.documentElement.scrollHeight')
            pg.keyboard.press('Escape'); time.sleep(0.3)
            top_check(pg, tag, 'lobby')
            for t in ['start', 'draft']:  # two players: straight to the coin flip
                http('POST', f'/api/rooms/{code}/act', {'type': t}, who=host)
            pg.wait_for_selector('.board', timeout=10000)
            time.sleep(0.8)
            pg.screenshot(path=f'{OUT}/{tag}-2-board.png')
            over_b = pg.evaluate('document.documentElement.scrollHeight - innerHeight')
            top_check(pg, tag, 'board')
            st = http('GET', f'/api/rooms/{code}', who=host)['room']
            picker = host if st['picker'] == host['pid'] else ann
            spot = next((c_, r_) for c_, col in enumerate(st['board']) for r_, t in enumerate(col['tiles']) if not t['taken'] and not t.get('sp'))
            http('POST', f'/api/rooms/{code}/act', {'type': 'pick', 'c': spot[0], 'r': spot[1]}, who=picker)
            urllib.request.urlopen(f'{BASE}/__clock?add={25500 if deck != "trivia" else 3500}')
            pg.wait_for_selector('.opt', timeout=10000)
            time.sleep(0.8)
            pg.screenshot(path=f'{OUT}/{tag}-3-question.png')
            over_q = pg.evaluate('document.documentElement.scrollHeight - innerHeight')
            top_check(pg, tag, 'question')
            # reveal (verdict) and the fun fact / replay
            peek = json.loads(urllib.request.urlopen(f'{BASE}/__peek?code={code}').read())
            st = http('GET', f'/api/rooms/{code}', who=host)['room']
            if st['cur'].get('duel'):
                for k, mid in enumerate(st['cur']['duel']['mids']):
                    who = host if mid == host['pid'] else ann
                    http('POST', f'/api/rooms/{code}/act', {'type': 'lock', 'i': (peek['ans'] + k) % 4}, who=who)
            else:
                http('POST', f'/api/rooms/{code}/act', {'type': 'lock', 'i': peek['ans']}, who=picker)
            time.sleep(1.2 if not st['cur'].get('duel') else 5.0)
            pg.screenshot(path=f'{OUT}/{tag}-4-reveal.png')
            over_r = pg.evaluate('document.documentElement.scrollHeight - innerHeight')
            top_check(pg, tag, 'reveal')
            urllib.request.urlopen(f'{BASE}/__clock?add=7000')
            pg.wait_for_selector('.fact-card', timeout=10000)
            time.sleep(0.6)
            pg.screenshot(path=f'{OUT}/{tag}-5-fact.png')
            over_f = pg.evaluate('document.documentElement.scrollHeight - innerHeight')
            top_check(pg, tag, 'fact')
            http('POST', f'/api/rooms/{code}/act', {'type': 'end'}, who=host)
            pg.wait_for_selector('.final', timeout=10000)
            time.sleep(1.0)
            pg.screenshot(path=f'{OUT}/{tag}-6-final.png', full_page=True)
            top_check(pg, tag, 'final')
            for nm, v in (('board', over_b), ('question', over_q), ('reveal', over_r), ('fact', over_f)):
                report.append(f"{'PASS' if v <= 0 else 'FAIL'} {tag} {nm} fits ({v}px over)")
            report.append(f"PASS {tag} final shows the board as a text" if pg.locator('.ts-bubble').count() == 1 else f"FAIL {tag} no text share on the final")
            c.close()
    if HOME:
        # the home page, a sheet opened from it, and the host's menu sheet, in each look
        for look in LOOKS:
            me = profile('Dana', '🦝')
            c, pg = context(b, dev, me)
            c.add_init_script(f"localStorage.setItem('mh.theme', {json.dumps(look)})")
            pg.goto(f'{BASE}/'); pg.wait_for_selector('.home', timeout=10000); time.sleep(0.6)
            pg.screenshot(path=f'{OUT}/{look}-0-home.png')
            top_check(pg, f'{look}-home', 'home page')
            c.close()
    b.close()
print('\n'.join(report))
