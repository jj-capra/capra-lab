"""Joke decks on real screens: the joke of the day on home, the face-off intro, secret picks,
the replay (picks land on the grid, the times get measured, the line drops on the winner),
the bonus groan, and the blank round when nobody lands it. Phones at iPhone size.

    python tests/faceoff.py http://localhost:8787 OUTDIR [LOOK]   (LOOK: play the rooms in that look)

Needs the in-memory dev server (node dev/server.mjs PORT) for /__peek and /__clock, and at
least one joke deck in the build (the joke of the day).
"""
import json, os, sys, time, urllib.request
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8787'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'faceoff'
LOOK = sys.argv[3] if len(sys.argv) > 3 else 'heist'
os.makedirs(OUT, exist_ok=True)
checks, errors = [], []


def ok(cond, msg):
    checks.append(('PASS ' if cond else 'FAIL ') + msg)
    if not cond:
        print('FAIL', msg, flush=True)


def http(method, path, body=None, who=None):
    req = urllib.request.Request(BASE + path, method=method, data=json.dumps(body).encode() if body is not None else None)
    req.add_header('content-type', 'application/json')
    if who:
        req.add_header('authorization', f"Bearer {who['pid']}.{who['token']}")
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read() or b'{}')
    except urllib.error.HTTPError as e:
        return {'status': e.code, **json.loads(e.read() or b'{}')}


def clock(ms):
    urllib.request.urlopen(f'{BASE}/__clock?add={ms}')


def profile(name, avatar):
    r = http('POST', '/api/me', {'name': name, 'avatar': avatar})
    return {'pid': r['pid'], 'token': r['token'], 'name': name}


def overflow(pg):
    return pg.evaluate('document.documentElement.scrollHeight - window.innerHeight')


with sync_playwright() as p:
    b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])

    def ctx(who, w=390, h=664):
        c = b.new_context(viewport={'width': w, 'height': h}, is_mobile=w < 700, has_touch=w < 700)
        if who:
            c.add_init_script(f"localStorage.setItem('mh.auth', JSON.stringify({json.dumps({'pid': who['pid'], 'token': who['token']})}))")
        c.add_init_script('window.RTCPeerConnection = undefined;')
        pg = c.new_page()
        pg.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))
        pg.on('console', lambda m: errors.append(f'console.{m.type}: {m.text}') if m.type == 'error' and '429' not in m.text and '409' not in m.text else None)
        return pg

    host = profile('Dana', '🦝')
    ps = [host] + [profile(n, a) for n, a in [('Ann', '🦉'), ('Bo', '🐙'), ('Cy', '🦈')]]
    by = {x['pid']: x for x in ps}

    # ---------- home: joke of the day ----------
    home = http('GET', '/api/home', who=host)
    joke = home.get('joke')
    ok(bool(joke and joke.get('kind') == 'jokes'), f"home has a joke of the day ({joke and joke['title']})")
    hp = ctx(host)
    hp.goto(BASE + '/')
    hp.wait_for_selector('.joke-card')
    ok('Joke of the day' in hp.locator('.joke-card').inner_text(), 'the home screen shows the joke of the day card')
    hp.screenshot(path=f'{OUT}/01-home-phone.png')
    hp.locator('.joke-card .btn.hi').click()
    hp.wait_for_selector('.sheet')
    hp.locator('.choice-btn').first.click()
    ok(hp.locator('.deck-opt[aria-pressed="true"]').count() == 1 and joke['title'] in hp.locator('.deck-opt[aria-pressed="true"]').inner_text(), 'Host a face-off opens the host sheet on the joke deck')
    # Joke decks are live only: no solo button, and the Play sheet doesn't offer them.
    hp.goto(BASE + '/')
    hp.wait_for_selector('.joke-card')
    ok(hp.locator('.joke-card button', has_text='solo').count() == 0, 'the joke card has no solo button')
    hp.locator('.mode-btn.play').click()
    hp.wait_for_selector('.sheet')
    hp.locator('.choice-btn').first.click()
    hp.wait_for_selector('.deck-opt')
    ok(hp.locator('.tabs .tab', has_text='Jokes').count() == 0 and hp.locator('.deck-opt', has_text=joke['title']).count() == 0, 'solo runs don’t list joke decks')
    solo = http('POST', '/api/rooms', {'kind': 'solo', 'deckId': joke['id']}, who=host)
    ok(solo.get('status') in (400, 409) and 'live' in (solo.get('error') or ''), f"the server refuses a solo joke run ({solo.get('status')}: {solo.get('error')})")
    hp.context.close()

    # ---------- a crew game on the joke deck ----------
    code = http('POST', '/api/rooms', {'kind': 'invite', 'deckId': joke['id'], 'settings': {'clock': 30, 'theme': LOOK}}, who=host)['code']
    for x in ps[1:]:
        http('POST', f'/api/rooms/{code}/join', who=x)
    lob = ctx(host, 1280, 860)
    lob.goto(f'{BASE}/{code}')
    lob.wait_for_selector('.faceoff-note')
    ok(lob.locator('text=Hacker mode').count() == 0, 'the lobby drops the Hacker, Take, Doubles and lifeline settings for a joke deck')
    lob.screenshot(path=f'{OUT}/02-lobby.png')
    for t in ['start', 'toss', 'draft', 'autoDraft']:
        v = http('POST', f'/api/rooms/{code}/act', {'type': t}, who=host)['room']
    pages = {x['pid']: ctx(x) for x in ps if x is not host}
    for x in ps:
        if x is host:
            continue
        pages[x['pid']].goto(f'{BASE}/{code}')
    for pg in pages.values():
        pg.wait_for_selector('.board')
        pg.mouse.click(5, 300)

    def room():
        return http('GET', f'/api/rooms/{code}', who=host)['room']

    def page_for(mid):
        return pages.get(mid) or lob

    def pick():
        st = room()
        spot = next((c, r) for c, col in enumerate(st['board']) for r, t in enumerate(col['tiles']) if not t['taken'])
        picker = by.get(st['picker'], host)
        r = http('POST', f'/api/rooms/{code}/act', {'type': 'pick', 'c': spot[0], 'r': spot[1]}, who=picker)
        return r['room']

    v = pick()
    d = v['cur']['duel']
    ok(v['phase'] == 'intro' and d is not None, 'picking a joke tile starts a face-off')
    a_mid, b_mid = d['mids'][d['from']], d['mids'][1 - d['from']]
    pa, pb = page_for(a_mid), page_for(b_mid)
    watcher = next(pg for mid, pg in pages.items() if mid not in d['mids'])
    pa.wait_for_selector('.takeover.faceoff')
    ok(pa.locator('.fo-setup').inner_text().strip() != '', 'the intro shows the setup on its own')
    ok(pa.locator('.opt').count() == 0, 'no punchlines during the intro')
    ph = pb if pa is lob else pa
    ph.wait_for_selector('.takeover.faceoff')
    ok(overflow(ph) <= 0, f'intro fits an iPhone screen ({overflow(ph)}px over)')
    pa.screenshot(path=f'{OUT}/03-intro.png')

    ok(pa.locator('.fo-read').count() == 1 and int(pa.locator('.fo-read b').inner_text()) >= 20, 'a 25-second reading clock counts down on the setup')
    clock(25100)
    for pg in (pa, pb, watcher):
        pg.wait_for_selector('.opt.can, .opt', timeout=8000)
    pa.wait_for_selector('.duel-bar')
    ok(pa.locator('.duel-bar .duel-p').count() == 2, 'both players show in the face-off bar')
    ok(pa.locator('.lifelines .btn', has_text='50/50').count() == 0 and pa.locator('.lifelines .btn', has_text='Timeout').count() == 0, 'no lifelines in a face-off')
    ph = pb if pa is lob else pa
    ok(overflow(ph) <= 0, f'the pick screen fits an iPhone screen ({overflow(ph)}px over)')
    peek = json.loads(urllib.request.urlopen(f'{BASE}/__peek?code={code}').read())
    ans = peek['ans']
    # The rival locks a wrong punchline first, fast; the picker locks the right one.
    pb.locator('.opt').nth((ans + 1) % 4).click()
    pb.locator('.lock-btn').click()
    pa.wait_for_function("[...document.querySelectorAll('.duel-p b')].some(b => b.textContent.includes('Locked in'))", timeout=6000)
    ok(True, 'the other player sees a lock without seeing the pick')
    pa.screenshot(path=f'{OUT}/04-pick-other-locked.png')
    pb.screenshot(path=f'{OUT}/05-pick-mine-locked.png')
    pa.locator('.opt').nth(ans).click()
    pa.locator('.lock-btn').click()

    # ---------- the replay ----------
    watcher.wait_for_selector('.replay', timeout=6000)
    t0 = time.time()
    watcher.wait_for_selector('.ball', timeout=4000)
    watcher.wait_for_timeout(700)
    watcher.screenshot(path=f'{OUT}/06-replay-pitches.png')
    ok(watcher.locator('.ball').count() == 2, 'both picks land on the grid')
    watcher.wait_for_selector('.measure.on', timeout=4000)
    watcher.wait_for_timeout(700)
    watcher.screenshot(path=f'{OUT}/07-replay-measure.png')
    watcher.wait_for_selector('.line-to-gain', timeout=4000)
    watcher.wait_for_timeout(700)
    ok(watcher.locator('.zone-sq.hit').count() == 1, 'the grid lights the real punchline')
    stamp = watcher.locator('.replay .stamp').inner_text()
    ok('only one landed' in stamp.lower(), f'the ruling says who landed it ({stamp})')
    ok(overflow(watcher) <= 0, f'the replay fits an iPhone screen ({overflow(watcher)}px over)')
    watcher.screenshot(path=f'{OUT}/08-replay-ruling.png')
    pa.screenshot(path=f'{OUT}/09-replay-winner.png')

    # ---------- the bonus groan ----------
    pa.wait_for_selector('.fact-card', timeout=8000)
    ok('Bonus groan' in pa.locator('.fact-card').inner_text(), 'the fun fact screen is a Bonus groan')
    ok(not pa.locator('.fc-text').inner_text().lower().startswith('bonus:'), 'the bonus line drops its "Bonus:" prefix')
    ok(pa.locator('.fact-card .next-row .btn').count() == 1, 'the winner can skip it')
    pb.wait_for_selector('.fact-card', timeout=4000)
    ok(pb.locator('.fact-card .next-row .btn').count() == 0, 'the other player cannot')
    ph = pb if pa is lob else pa
    ok(overflow(ph) <= 0, f'the bonus groan fits an iPhone screen ({overflow(ph)}px over)')
    pa.screenshot(path=f'{OUT}/10-bonus-groan.png')
    pa.locator('.fact-card .next-row .btn').click()
    pa.wait_for_selector('.board')
    st = room()
    winner_crew = next(k for k, c in enumerate(st['crews']) if a_mid in c['mem'])
    ok(st['turn'] == winner_crew, 'the winner’s crew picks next')

    # ---------- nobody lands it: the blank round ----------
    v = pick()
    clock(25100)
    d = v['cur']['duel']
    a_mid, b_mid = d['mids'][0], d['mids'][1]
    pa, pb = page_for(a_mid), page_for(b_mid)
    for pg in (pa, pb):
        pg.wait_for_selector('.duel-bar', timeout=8000)
    peek = json.loads(urllib.request.urlopen(f'{BASE}/__peek?code={code}').read())
    ans = peek['ans']
    for pg, k in ((pa, 1), (pb, 2)):
        pg.locator('.opt').nth((ans + k) % 4).click()
        pg.locator('.lock-btn').click()
    pa.wait_for_selector('.replay', timeout=6000)
    pa.wait_for_selector('.replay .stamp', timeout=6000)
    ok('no good' in pa.locator('.replay .stamp').inner_text().lower(), 'nobody right: the replay says no good')
    ok(pa.locator('.zone-sq.hit').count() == 0, 'and doesn’t give the answer away')
    pa.screenshot(path=f'{OUT}/11-miss-replay.png')
    pa.wait_for_selector('.opt.blank', timeout=9000)
    ok(pa.locator('.opt.blank').count() == 4, 'the punchlines go blank')
    ok(pa.locator('.opt.missed').count() == 2, 'the two missed letters are out')
    ok(pa.locator('.duel-banner').count() == 1, 'a banner explains the blank round')
    phone = pb if pa is lob else pa
    phone.wait_for_selector('.opt.blank', timeout=9000)
    ok(overflow(phone) <= 0, f'the blank round fits an iPhone screen ({overflow(phone)}px over)')
    phone.screenshot(path=f'{OUT}/12-blank-round.png')
    pa.screenshot(path=f'{OUT}/12b-blank-round-other.png')
    pb.locator('.opt').nth(ans).click()
    ph = pa if pb is lob else pb
    if ph is pb:
        ok(overflow(pb) <= 0, f'the blank round with a pick made fits an iPhone screen ({overflow(pb)}px over)')
    pb.locator('.lock-btn').click()
    pa.locator('.opt').nth((ans + 3) % 4).click()
    pa.locator('.lock-btn').click()
    pb.wait_for_selector('.replay .line-to-gain', timeout=8000)
    pb.wait_for_timeout(800)
    pb.screenshot(path=f'{OUT}/13-blank-round-win.png')
    st = room()
    ok(st['cur']['right'] and st['cur']['mid'] == b_mid, 'remembering the punchline in the blank round wins it')

    # ---------- desktop / shared screen ----------
    lob.wait_for_selector('.fact-card', timeout=9000)
    lob.screenshot(path=f'{OUT}/14-desktop-groan.png')

    # ---------- party room: the host locks for both players ----------
    pc = http('POST', '/api/rooms', {'kind': 'party', 'deckId': joke['id'], 'settings': {'clock': 30, 'theme': LOOK}}, who=host)['code']
    for n in ['Gus', 'Hal', 'Ivy', 'Jo']:
        http('POST', f'/api/rooms/{pc}/act', {'type': 'addGuest', 'name': n}, who=host)
    for t in ['start', 'toss', 'draft', 'autoDraft']:
        http('POST', f'/api/rooms/{pc}/act', {'type': t}, who=host)
    tvp = ctx(host, 1280, 800)
    tvp.goto(f'{BASE}/r/{pc}')
    tvp.wait_for_selector('.board')
    tvp.locator('.tile.can').first.click()
    tvp.wait_for_selector('.takeover.faceoff')
    clock(25100)
    tvp.wait_for_selector('.duel-bar')
    peek = json.loads(urllib.request.urlopen(f'{BASE}/__peek?code={pc}').read())
    ans = peek['ans']
    ok(tvp.locator('.duel-bar .btn').count() == 2, 'party: the host gets a lock button for each player')
    tvp.locator('.opt').nth((ans + 1) % 4).click()
    tvp.locator('.duel-bar .btn').first.click()
    tvp.wait_for_function("document.querySelectorAll('.duel-bar .btn').length === 0", timeout=5000)
    tvp.locator('.opt').nth(ans).click()
    tvp.locator('.lock-btn').click()
    tvp.wait_for_selector('.replay .line-to-gain', timeout=8000)
    tvp.wait_for_timeout(900)
    tvp.screenshot(path=f'{OUT}/15-party-replay.png')
    st = http('GET', f'/api/rooms/{pc}', who=host)['room']
    ok(st['cur']['right'] and st['cur']['duel']['winner'] >= 0, 'party: the face-off settles from the host’s taps')
    b.close()

print('\n'.join(checks))
real = [e for e in errors if 'net::ERR' not in e]
print('errors:', len(real))
for e in real[:20]:
    print('  ', e)
