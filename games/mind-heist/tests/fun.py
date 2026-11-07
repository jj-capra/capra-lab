"""The fun layer on real screens: emoji spam (direct links first, batched server fallback),
the emoji drawer, the arcade music and stings, and the Open mic audio rebuild.

    python tests/fun.py http://localhost:8787 OUTDIR

Needs the in-memory dev server (node dev/server.mjs 8787) for /__peek.
"""
import json, os, re, sys, time, urllib.request
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8787'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'fun'
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


def profile(name, avatar):
    r = http('POST', '/api/me', {'name': name, 'avatar': avatar})
    return {'pid': r['pid'], 'token': r['token'], 'name': name}


def sound(pg):
    return pg.evaluate('window.__mhSound ? window.__mhSound.state() : null')


def wait_band(pg, want, timeout=8):
    end = time.time() + timeout
    while time.time() < end:
        s = sound(pg)
        if s and (s['band'] == want or s['want'] == want):
            return s
        time.sleep(0.2)
    return sound(pg)


with sync_playwright() as p:
    b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'])

    def ctx(who, w=390, h=844, mobile=True, no_p2p=False):
        c = b.new_context(viewport={'width': w, 'height': h}, is_mobile=mobile, has_touch=mobile)
        if who:
            c.add_init_script(f"localStorage.setItem('mh.auth', JSON.stringify({json.dumps({'pid': who['pid'], 'token': who['token']})}))")
        if no_p2p:
            c.add_init_script('window.RTCPeerConnection = undefined;')
        pg = c.new_page()
        pg.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))
        pg.on('console', lambda m: errors.append(f'console.{m.type}: {m.text}') if m.type == 'error' and '429' not in m.text else None)
        return pg

    host = profile('Dana', '🦝')
    ps = [host] + [profile(n, a) for n, a in [('Ann', '🦉'), ('Bo', '🐙'), ('Cy', '🦈')]]
    by = {x['pid']: x for x in ps}
    code = http('POST', '/api/rooms', {'kind': 'invite', 'settings': {'take': False, 'cards': False, 'mic': True}}, who=host)['code']
    for x in ps[1:]:
        http('POST', f'/api/rooms/{code}/join', who=x)
    for t in ['start', 'toss', 'draft', 'autoDraft']:
        v = http('POST', f'/api/rooms/{code}/act', {'type': t}, who=host)['room']
    A = v['turn']
    crewA = [by[i] for i in v['crews'][A]['mem']]
    crewB = [by[i] for i in v['crews'][1 - A]['mem']]
    # Cy can't make direct links (as on some work networks): everything reaches Cy via the server.
    cy = next(x for x in ps if x['name'] == 'Cy')
    others = [x for x in ps if x is not host and x is not cy]
    pages = {x['pid']: ctx(x, no_p2p=(x is cy)) for x in others + [cy]}
    for x in others + [cy]:
        pages[x['pid']].goto(f"{BASE}/{code}")
    for pg in pages.values():
        pg.wait_for_selector('.board')
        pg.mouse.click(5, 300)  # a first tap unlocks audio
    ann, bo = pages[others[0]['pid']], pages[others[1]['pid']]
    pcy = pages[cy['pid']]
    time.sleep(4)

    # ---------- music while picking ----------
    s = wait_band(ann, 'board')
    ok(s and s['band'] == 'board', f'arcade music plays while a tile is picked ({s})')

    # ---------- emoji spam: a row of four from your profile (JC, Nov 5 2026) ----------
    react_posts = []
    ann.on('request', lambda r: react_posts.append(r) if r.method == 'POST' and '/act' in r.url and '"react"' in (r.post_data or '') else None)
    row = ann.locator('.emo-row .emo-b').all_inner_texts()
    ok(row == ['🔥', '😂', '💀', '👏'], f'four emoji buttons at the bottom, the defaults for a new profile ({row})')
    for n in range(10):
        ann.locator('.emo-row .emo-b').nth(n % 2).click()
        ann.wait_for_timeout(60)
    ann.wait_for_timeout(300)
    ok(ann.locator('.floater').count() >= 5, 'your own spam shows at once')
    bo.wait_for_function("document.querySelectorAll('.floater').length >= 3", timeout=5000)
    ok(True, 'a linked phone sees the spam')
    pcy.wait_for_function("document.querySelectorAll('.floater').length >= 1", timeout=8000)
    ok(True, 'a phone that can’t link still sees it (through the server)')
    ann.wait_for_timeout(2500)
    ok(1 <= len(react_posts) <= 2, f'ten taps reach the server as one or two batches ({len(react_posts)})')
    kinds = set()
    for r in react_posts:
        for x in (json.loads(r.post_data).get('m') or []): kinds.add(x['e'])
    ok(kinds == {'🔥', '😂'}, f'one batch carries both emoji ({kinds})')
    ann.screenshot(path=f'{OUT}/01-spam.png')

    # Hold two at once (two fingers): both keep firing.
    before = bo.locator('.floater').count()
    bo.evaluate("""() => { const bs = [...document.querySelectorAll('.emo-b')];
      [0, 3].forEach(i => bs[i].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 20 + i, pointerType: 'touch', isPrimary: i === 0 }))); }""")
    bo.wait_for_timeout(1200)
    bo.evaluate("""() => { const bs = [...document.querySelectorAll('.emo-b')];
      [0, 3].forEach(i => bs[i].dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 20 + i, pointerType: 'touch' }))); }""")
    got = bo.locator('.floater').all_inner_texts()
    ok(bo.locator('.floater').count() - before >= 10, f'holding two buttons keeps both firing ({bo.locator(".floater").count() - before})')
    ok({'🔥', '👏'} <= set(got), 'both emoji fly')
    bo.wait_for_timeout(600)
    n_after = bo.locator('.floater').count()
    bo.wait_for_timeout(500)
    ok(bo.locator('.floater').count() <= n_after, 'letting go stops them')

    # Profile: pick the four. Every emoji is there, in tabs.
    prof = ctx(others[0], 393, 852, True)
    prof.goto(BASE + '/')
    prof.wait_for_selector('.home')
    prof.get_by_role('button', name='Your profile').click()
    prof.wait_for_selector('.emo-slots')
    total = prof.evaluate("document.querySelectorAll('.emo-pick .emo-tabs button').length")
    ok(total >= 10, f'the emoji picker has tabs for every group ({total})')
    prof.locator('.emo-pick .emo-tabs button', has_text='Flags').click()
    n_flags = prof.locator('.emo-pick .emo-grid button').count()
    ok(n_flags > 200, f'every flag is there ({n_flags})')
    prof.locator('.emo-slot').nth(1).click()
    prof.locator('.emo-pick .emo-grid button', has_text='🇧🇷').first.click()
    prof.locator('.emo-pick .emo-tabs button', has_text='Faces').click()
    prof.locator('.emo-slot').nth(3).click()
    prof.locator('.emo-pick .emo-grid button').nth(3).click()
    prof.wait_for_timeout(800)
    mine = http('GET', '/api/me', who=others[0])['me']['emo']
    ok(mine[1] == '🇧🇷' and mine[0] == '🔥' and mine[3] not in ('👏', '🇧🇷'), f'picks save to the profile ({mine})')
    prof.locator('.emo-slots').scroll_into_view_if_needed()
    prof.screenshot(path=f'{OUT}/02-profile-emoji.png')
    prof.context.close()
    ann.reload()
    ann.wait_for_selector('.board')
    ann.mouse.click(5, 300)  # a first tap unlocks audio again after the reload
    ok(ann.locator('.emo-row .emo-b').all_inner_texts() == mine, 'the game shows your picks')
    ann.wait_for_timeout(1500)
    desk = ctx(host, 1440, 900, False)
    desk.goto(f"{BASE}/{code}")
    desk.wait_for_selector('.board')
    time.sleep(0.8)
    desk.screenshot(path=f'{OUT}/04-desktop-row.png')
    ok(desk.locator('.emo-row .emo-b').count() == 4, 'the row shows on a desktop too')

    # ---------- music through a question ----------
    def skip_fact():
        st = http('GET', f'/api/rooms/{code}', who=host)['room']
        return http('POST', f'/api/rooms/{code}/act', {'type': 'next'}, who=by[st['cur']['mid']])

    def pick_and_answer(right):
        st = http('GET', f'/api/rooms/{code}', who=host)['room']
        spot = next((c, r) for c, col in enumerate(st['board']) for r, t in enumerate(col['tiles']) if not t['taken'])
        http('POST', f'/api/rooms/{code}/act', {'type': 'pick', 'c': spot[0], 'r': spot[1]}, who=host)
        st = http('GET', f'/api/rooms/{code}', who=host)['room']
        if st['phase'] == 'intro':
            urllib.request.urlopen(f'{BASE}/__clock?add=4000')
            time.sleep(0.3)
            st = http('GET', f'/api/rooms/{code}', who=host)['room']
        s = wait_band(ann, 'ask')
        ok(s and s['band'] in ('ask', 'hot'), f'the music tightens up during a question ({s and s["band"]})')
        peek = json.loads(urllib.request.urlopen(f'{BASE}/__peek?code={code}').read())
        i = peek['ans'] if right else (peek['ans'] + 1) % 4
        http('POST', f'/api/rooms/{code}/act', {'type': 'lock', 'i': i}, who=host)

    pick_and_answer(True)
    s = wait_band(ann, 'drop', 10)
    ok(s and s['band'] == 'drop', f'a right answer drops into the full groove ({s and s["band"]})')
    skip_fact()
    pick_and_answer(False)
    s = wait_band(ann, 'bleak', 10)
    ok(s and s['band'] == 'bleak', f'a wrong answer goes bleak ({s and s["band"]})')
    ann.screenshot(path=f'{OUT}/06-wrong.png')
    skip_fact()
    s = wait_band(ann, 'board')
    ok(s and s['band'] == 'board', 'back to the groove for the next pick')

    # ---------- Open mic: the audio engine is rebuilt around the mic (the iPhone static fix) ----------
    mate_a = [x for x in crewA if x is not host and x is not cy]
    mpage = pages[mate_a[0]['pid']] if mate_a else ann
    before = sound(mpage)
    mpage.locator('.mic-btn').click()
    mpage.wait_for_function("window.__mhMesh && window.__mhMesh.status().voice", timeout=8000)
    mpage.wait_for_timeout(600)
    after = sound(mpage)
    ok(after['rebuilds'] == (before['rebuilds'] or 0) + 1, 'turning the mic on rebuilds the audio engine after the mic opens')
    ok(after['talk'] and after['music'] < 0.05, f'music goes quiet while you are on air ({after["music"]})')
    ok(after['ctx'] in ('running', 'suspended'), 'sound effects still work on the new engine')
    mpage.locator('.mic-btn').click()
    mpage.wait_for_function("window.__mhMesh && !window.__mhMesh.status().voice", timeout=8000)
    mpage.wait_for_timeout(600)
    off = sound(mpage)
    ok(off['rebuilds'] == after['rebuilds'] + 1 and not off['talk'], 'turning it off rebuilds again and the music comes back')

    # ---------- the end: winners hear the epic track, the losing crew gets bleak ----------
    st = http('GET', f'/api/rooms/{code}', who=host)['room']
    hauls = [c['haul'] for c in st['crews']]
    if hauls[0] == hauls[1]:
        spot = next((c, r) for c, col in enumerate(st['board']) for r, t in enumerate(col['tiles']) if not t['taken'])
        http('POST', f'/api/rooms/{code}/act', {'type': 'pick', 'c': spot[0], 'r': spot[1]}, who=host)
        urllib.request.urlopen(f'{BASE}/__clock?add=4000')
        peek = json.loads(urllib.request.urlopen(f'{BASE}/__peek?code={code}').read())
        http('POST', f'/api/rooms/{code}/act', {'type': 'lock', 'i': peek['ans']}, who=host)
    http('POST', f'/api/rooms/{code}/act', {'type': 'end'}, who=host)
    st = http('GET', f'/api/rooms/{code}', who=host)['room']
    win = st['winner']
    for x in others + [cy]:
        pg = pages[x['pid']]
        pg.wait_for_selector('.final, .podium, .results', timeout=15000)
        mine = 0 if x['pid'] in st['crews'][0]['mem'] else 1
        want = 'menu-theme' if mine == win else 'bleak'
        s = wait_band(pg, want, 8)
        ok(s and s['want'] == want, f"{x['name']} ({'won' if mine == win else 'lost'}) hears {want} at the haul reveal")
    b.close()

print('\n'.join(checks))
real = [e for e in errors if 'net::ERR' not in e]
print('errors:', len(real))
for e in real[:20]:
    print('  ', e)
