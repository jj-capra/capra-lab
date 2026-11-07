"""Screenshots of one look on every screen that matters, desktop and iPhone, plus the iPhone
fit check. For whoever designs or changes a look.

    python tests/look_shots.py http://localhost:8787 OUTDIR LOOK

Needs the in-memory dev server (node dev/server.mjs) for /__peek and /__clock.
"""
import json, os, sys, time, urllib.request
from playwright.sync_api import sync_playwright

BASE, OUT, LOOK = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(OUT, exist_ok=True)
fit = []


def http(m, p, b=None, who=None):
    r = urllib.request.Request(BASE + p, method=m, data=json.dumps(b).encode() if b is not None else None, headers={'content-type': 'application/json'})
    if who:
        r.add_header('authorization', f"Bearer {who['pid']}.{who['token']}")
    try:
        return json.loads(urllib.request.urlopen(r).read() or b'{}')
    except urllib.error.HTTPError as e:
        return {'status': e.code, **json.loads(e.read() or b'{}')}


def prof(n, a):
    r = http('POST', '/api/me', {'name': n, 'avatar': a})
    me = {'pid': r['pid'], 'token': r['token'], 'name': n}
    http('POST', '/api/me/update', {'theme': LOOK}, who=me)
    return me


def peek(code):
    return json.loads(urllib.request.urlopen(f'{BASE}/__peek?code={code}').read())


with sync_playwright() as p:
    b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    errors = []

    def page(who, w, h, mobile):
        c = b.new_context(viewport={'width': w, 'height': h}, is_mobile=mobile, has_touch=mobile, device_scale_factor=2 if mobile else 1)
        c.add_init_script(f"localStorage.setItem('mh.auth', JSON.stringify({json.dumps({'pid': who['pid'], 'token': who['token']})}))")
        pg = c.new_page()
        pg.on('pageerror', lambda e: errors.append(str(e)))
        return pg

    def shot(pg, name, full=False, measure=False):
        time.sleep(0.8)
        pg.screenshot(path=f'{OUT}/{name}.png', full_page=full)
        if measure:
            h = pg.evaluate('Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)')
            fit.append((name, h - pg.viewport_size['height']))

    dana, ann, bo, cy = prof('Dana', '🦝'), prof('Ann', '🦊'), prof('Bo', '🐙'), prof('Cy', '🦈')
    desk = page(dana, 1440, 900, False)
    ph = page(ann, 390, 664, True)
    desk.goto(BASE + '/'); desk.wait_for_selector('.drop-card'); shot(desk, '01-home-desktop')
    ph.goto(BASE + '/'); ph.wait_for_selector('.drop-card'); shot(ph, '02-home-phone', full=True)
    desk.locator('.top .chip').click(); desk.wait_for_selector('.th-pick'); desk.locator('.th-pick').scroll_into_view_if_needed(); shot(desk, '03-look-picker')
    desk.keyboard.press('Escape')
    code = http('POST', '/api/rooms', {'kind': 'invite', 'settings': {'theme': LOOK, 'take': True}}, who=dana)['code']
    for x in (ann, bo, cy):
        http('POST', f'/api/rooms/{code}/join', who=x)
    desk.goto(f'{BASE}/{code}'); desk.wait_for_selector('.invite'); shot(desk, '04-lobby-desktop')
    ph.goto(f'{BASE}/{code}'); ph.wait_for_selector('.invite'); shot(ph, '05-lobby-phone', full=True)
    for t in ['start', 'toss', 'draft', 'autoDraft']:
        v = http('POST', f'/api/rooms/{code}/act', {'type': t}, who=dana)['room']
    desk.wait_for_selector('.board'); ph.wait_for_selector('.board')
    shot(desk, '06-board-desktop'); shot(ph, '07-board-phone', measure=True)
    sp = peek(code)['specials']
    plain = next((c, r) for c, col in enumerate(v['board']) for r, t in enumerate(col['tiles']) if not t['tk'] and not any(s[0] == c and s[1] == r for s in sp))
    http('POST', f'/api/rooms/{code}/act', {'type': 'pick', 'c': plain[0], 'r': plain[1]}, who=dana)
    desk.wait_for_selector('.opt'); ph.wait_for_selector('.opt')
    shot(desk, '08-question-desktop'); shot(ph, '09-question-phone', measure=True)
    http('POST', f'/api/rooms/{code}/act', {'type': 'lock', 'i': peek(code)['ans']}, who=dana)
    desk.wait_for_selector('.stamp'); shot(desk, '10-reveal-right-desktop'); shot(ph, '11-reveal-phone', measure=True)
    desk.wait_for_selector('.fact-card', timeout=9000); ph.wait_for_selector('.fact-card', timeout=9000)
    shot(desk, '12-fact-desktop'); shot(ph, '13-fact-phone', measure=True)
    st = http('GET', f'/api/rooms/{code}', who=dana)['room']
    by = {x['pid']: x for x in (dana, ann, bo, cy)}
    http('POST', f'/api/rooms/{code}/act', {'type': 'next'}, who=by[st['cur']['mid']])
    # The Hacker in this look (it always goes dark).
    hk = next((s for s in sp if s[2] == 'hacker'), None)
    if hk:
        http('POST', f'/api/rooms/{code}/act', {'type': 'pick', 'c': hk[0], 'r': hk[1]}, who=dana)
        desk.wait_for_selector('.takeover', timeout=6000); shot(desk, '14-hacker-intro-desktop')
        urllib.request.urlopen(f'{BASE}/__clock?add=4000')
        desk.wait_for_selector('.opt', timeout=8000); ph.wait_for_selector('.opt', timeout=8000)
        urllib.request.urlopen(f'{BASE}/__clock?add=12000')
        time.sleep(1.5)
        shot(desk, '15-hacker-desktop'); shot(ph, '16-hacker-phone')
        http('POST', f'/api/rooms/{code}/act', {'type': 'lock', 'i': (peek(code)['ans'] + 1) % 4}, who=dana)
        ph.wait_for_selector('.stamp'); shot(ph, '17-wrong-phone')
        urllib.request.urlopen(f'{BASE}/__clock?add=13000')
        time.sleep(1.5)
    http('POST', f'/api/rooms/{code}/act', {'type': 'end'}, who=dana)
    desk.wait_for_selector('.final'); ph.wait_for_selector('.final')
    shot(desk, '18-final-desktop'); shot(ph, '19-final-phone', full=True)
    ph.goto(BASE + '/'); ph.wait_for_selector('.home'); ph.get_by_role('button', name='Your profile').click(); ph.wait_for_selector('.emo-slots'); ph.locator('.emo-slots').scroll_into_view_if_needed()
    shot(ph, '21-emoji-phone')
    ph.goto(BASE + '/'); ph.wait_for_selector('.vault-card'); ph.get_by_role('button', name='Draw a card').click(); ph.wait_for_selector('.draw-stage')
    shot(ph, '22-draw-phone')
    b.close()

print('iPhone fit (overflow px, want 0):', ', '.join(f'{n} {o:+d}' for n, o in fit))
print('page errors:', errors[:5])
