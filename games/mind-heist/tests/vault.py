"""Vault Jam, diamonds, the daily draw and power cards in real browsers.

    python tests/vault.py http://localhost:8787 OUTDIR

Needs the in-memory dev server (node dev/server.mjs 8787): it uses the dev-only
/__give hook to hand out cards and /__peek to stage a Mole that fools a crew.
"""
import json, os, re, subprocess, sys, time, urllib.request
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8787'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'vault'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
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


def solve(board):
    js = "import(process.argv[1]).then(J => console.log(JSON.stringify(J.solve(process.argv[2]))))"
    return json.loads(subprocess.check_output(['node', '-e', js, os.path.join(ROOT, 'src/shared/jam.mjs'), board]))


def drag(page, pid, d):
    el = page.locator(f'.pc[data-id="{pid}"]')
    box = el.bounding_box()
    cell = page.locator('.jam-floor').bounding_box()['width'] / 6
    horiz = box['width'] > box['height'] + 2
    x, y = box['x'] + box['width'] / 2, box['y'] + box['height'] / 2
    page.mouse.move(x, y)
    page.mouse.down()
    dx, dy = (d * cell, 0) if horiz else (0, d * cell)
    page.mouse.move(x + dx * 0.5, y + dy * 0.5, steps=4)
    page.mouse.move(x + dx, y + dy, steps=4)
    page.mouse.up()


def moves_shown(page):
    return int(page.locator('.jb', has_text='Moves').locator('b').inner_text())


with sync_playwright() as p:
    b = p.chromium.launch()

    def ctx(who, w=390, h=844, mobile=True):
        c = b.new_context(viewport={'width': w, 'height': h}, is_mobile=mobile, has_touch=mobile)
        if who:
            c.add_init_script(f"localStorage.setItem('mh.auth', JSON.stringify({json.dumps({'pid': who['pid'], 'token': who['token']})}))")
        pg = c.new_page()
        pg.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))
        pg.on('console', lambda m: errors.append(f'console.{m.type}: {m.text}') if m.type == 'error' else None)
        return pg

    # ---------- the daily vault on a phone ----------
    priya = profile('Priya', '🦊')
    ph = ctx(priya)
    ph.goto(BASE + '/')
    ph.wait_for_selector('.vault-card')
    time.sleep(0.6)
    ph.locator('.vault-card').scroll_into_view_if_needed()
    ph.screenshot(path=f'{OUT}/01-home-vault-card.png')
    ph.get_by_role('button', name='Crack today’s vault').click()
    ph.wait_for_selector('.jam-head')
    ok(ph.locator('.jam-floor').count() == 0, 'the board stays hidden until the vault is opened')
    time.sleep(0.4)
    ph.screenshot(path=f'{OUT}/02-jam-intro.png')
    ph.get_by_role('button', name='Open the vault').click()
    ph.wait_for_selector('.jam-floor')
    time.sleep(0.5)
    ph.screenshot(path=f'{OUT}/03-jam-board.png')
    jam = http('GET', '/api/jam', who=priya)['jam']
    sol = solve(jam['board'])
    ok(sol['par'] == jam['par'], 'par matches the solver')
    # Undo works, and a wiggle that ends where it started isn't a move.
    first = sol['path'][0]
    drag(ph, first[0], first[1])
    ok(moves_shown(ph) == 1, 'a drag is one move')
    ph.get_by_role('button', name='Undo').click()
    ok(moves_shown(ph) == 0, 'undo takes it back')
    for i, (pid, d) in enumerate(sol['path'][:-1]):
        drag(ph, pid, d)
        if i == 1:
            ph.screenshot(path=f'{OUT}/04-jam-midway.png')
    ok(moves_shown(ph) == len(sol['path']) - 1, 'every slide counted')
    # Last move by keyboard: focus the jewel and press right.
    last = sol['path'][-1]
    if last[0] == 'A':
        ph.locator('.pc[data-id="A"]').focus()
        for _ in range(last[1]):
            ph.keyboard.press('ArrowRight')
    else:
        drag(ph, last[0], last[1])
    ph.wait_for_selector('.jam-result', timeout=8000)
    time.sleep(1.0)
    res = ph.locator('.jam-result').inner_text()
    ok('Out in' in res and '+2 💎' in res, f'solved at par: time and two diamonds ({res[:80]!r})')
    ok('#1' in res, 'first solver is #1')
    ok(ph.locator('.race li.me').count() == 1, 'you show in the top five')
    ok('💎 2' in ph.locator('.chip.gems').inner_text(), 'diamond count updates')
    ph.screenshot(path=f'{OUT}/05-jam-result.png', full_page=True)

    # ---------- the daily draw ----------
    ph.get_by_role('button', name='Draw today’s card').click()
    ph.wait_for_selector('.draw-stage')
    time.sleep(0.4)
    ph.screenshot(path=f'{OUT}/06-draw-before.png')
    ph.locator('button', has_text='Spend a 💎').click()
    ph.wait_for_selector('.flipper.on .pcard')
    time.sleep(1.0)
    ok(ph.locator('.flipper.on .pcard').count() == 1, 'the card flips over')
    ph.screenshot(path=f'{OUT}/07-draw-after.png')
    me = http('GET', '/api/me', who=priya)['me']
    ok(me['gems'] == 1, 'the diamond was spent')
    ok(me['drew'] is not None, 'today’s draw is recorded')
    ph.keyboard.press('Escape')

    # ---------- practice ----------
    ph.goto(BASE + '/jam/practice')
    ph.wait_for_selector('.jam-floor')
    pl = ph.evaluate("fetch('/jam-practice.json').then(r => r.json())")
    easy = [s for s in pl if int(s[36:]) <= 10][0]
    psol = solve(easy[:36])
    for pid, d in psol['path']:
        drag(ph, pid, d)
    ph.wait_for_selector('.jam-result')
    ok('Perfect' in ph.locator('.jam-result').inner_text(), 'practice solve at par')
    time.sleep(0.6)
    ph.screenshot(path=f'{OUT}/08-practice-done.png')
    ph.get_by_role('button', name='Next vault').click()
    ok('Vault 2 of' in ph.locator('.jam-head').inner_text(), 'next practice vault')

    # ---------- every look ----------
    for theme in ['heist', 'office', 'bar']:
        http('POST', '/api/me/update', {'theme': theme}, who=priya)
        ph.goto(BASE + '/jam')
        ph.wait_for_selector('.jam-floor')
        time.sleep(0.8)
        ph.screenshot(path=f'{OUT}/look-{theme}-jam.png', full_page=True)
        ph.goto(BASE + '/')
        ph.wait_for_selector('.vault-card')
        ph.locator('.vault-card').scroll_into_view_if_needed()
        time.sleep(0.5)
        ph.screenshot(path=f'{OUT}/look-{theme}-home.png')
    desk = ctx(priya, 1440, 900, False)
    desk.goto(BASE + '/jam')
    desk.wait_for_selector('.jam-floor')
    time.sleep(0.8)
    desk.screenshot(path=f'{OUT}/09-desktop-jam.png')
    desk.goto(BASE + '/')
    desk.wait_for_selector('.vault-card')
    time.sleep(0.6)
    desk.screenshot(path=f'{OUT}/10-desktop-home.png')
    http('POST', '/api/me/update', {'theme': 'heist'}, who=priya)

    # ---------- power cards in an invite game ----------
    host = profile('Dana', '🦝')
    ps = [host] + [profile(n, a) for n, a in [('Ann', '🦉'), ('Bo', '🐙'), ('Cy', '🦈')]]
    by = {x['pid']: x for x in ps}
    code = http('POST', '/api/rooms', {'kind': 'invite', 'settings': {'take': False}}, who=host)['code']
    for x in ps[1:]:
        http('POST', f'/api/rooms/{code}/join', who=x)
    for t in ['start', 'toss', 'draft', 'autoDraft']:
        v = http('POST', f'/api/rooms/{code}/act', {'type': t}, who=host)['room']
    A = v['turn']
    crewA = [by[i] for i in v['crews'][A]['mem']]
    crewB = [by[i] for i in v['crews'][1 - A]['mem']]
    picker = by[v['picker']]
    mate = [x for x in crewA if x is not picker][0]
    mole = [x for x in crewB if x is not host][0]
    urllib.request.urlopen(f"{BASE}/__give?pid={mole['pid']}&cards=mole")
    urllib.request.urlopen(f"{BASE}/__give?pid={mate['pid']}&cards=hfifty")
    pages = {x['pid']: ctx(x) for x in [picker, mate, mole]}
    tv = ctx(None, 1280, 720, False)
    for x in [picker, mate, mole]:
        pages[x['pid']].goto(f"{BASE}/{code}")
    tv.goto(f"{BASE}/tv/{code}")
    for pg in list(pages.values()) + [tv]:
        pg.wait_for_selector('.board')
    # The picker takes a plain tile.
    board = v['board']
    spot = next((c, r) for c, col in enumerate(board) for r, t in enumerate(col['tiles']) if not t['taken'])
    http('POST', f'/api/rooms/{code}/act', {'type': 'pick', 'c': spot[0], 'r': spot[1]}, who=host)
    for pg in list(pages.values()) + [tv]:
        pg.wait_for_selector('.opt', timeout=15000)
    if pages[picker['pid']].locator('.takeover').count():
        urllib.request.urlopen(f'{BASE}/__clock?add=4000')
    pm, pmate, pp = pages[mole['pid']], pages[mate['pid']], pages[picker['pid']]
    pmate.wait_for_selector('button.card-btn.hfifty', timeout=15000)
    ok(pp.locator('button.card-btn').count() == 0, 'no card buttons without cards')
    # Hidden 50/50 from the mate's phone.
    pmate.locator('button.card-btn.hfifty').click()
    pmate.wait_for_function("document.querySelectorAll('.opt.gone').length === 2", timeout=8000)
    ok(True, 'the mate’s phone drops to two options')
    pp.wait_for_function("document.querySelectorAll('.opt.gone').length === 2", timeout=8000)
    ok(True, 'so does the hot seat’s')
    time.sleep(1.5)
    ok(pm.locator('.opt.gone').count() == 0, 'the other crew still sees four')
    ok(tv.locator('.opt.gone').count() == 0, 'the big screen still sees four')
    pmate.screenshot(path=f'{OUT}/11-hidden-5050-crew.png')
    pm.screenshot(path=f'{OUT}/12-hidden-5050-rival.png')
    # The mole tips the one wrong answer the crew can still see.
    peek = json.loads(urllib.request.urlopen(f'{BASE}/__peek?code={code}').read())
    left = [i for i in range(4) if i != peek['ans'] and i not in peek['hidden']]
    tip = left[0]
    pm.wait_for_selector('button.card-btn.mole')
    pm.locator('button.card-btn.mole').click()
    pm.wait_for_selector('.opt.moling')
    pm.screenshot(path=f'{OUT}/13-mole-choosing.png')
    pm.locator('.opt').nth(tip).click()
    pm.wait_for_selector('.tip-tag.mine', timeout=8000)
    pp.wait_for_selector('.tip-tag', timeout=8000)
    ok('Anonymous tip' in pp.locator('.tip-tag').inner_text(), 'the hot seat sees an anonymous tip')
    ok('Your tip' in pm.locator('.tip-tag').inner_text(), 'the mole sees their own tip')
    time.sleep(1.5)
    ok(tv.locator('.tip-tag').count() == 0, 'no tip on the big screen')
    pp.screenshot(path=f'{OUT}/14-tip-hot-seat.png')
    pm.screenshot(path=f'{OUT}/15-tip-mole.png')
    # The hot seat trusts it.
    pp.locator('.opt').nth(tip).click()
    pp.locator('.lock-btn').click()
    for pg in [pp, pm, tv]:
        pg.wait_for_selector('.mole-banner', timeout=10000)
    ok('The mole got you!' in pp.locator('.mole-banner').inner_text(), 'the fooled crew is told the mole won')
    ok(mole['name'] in pm.locator('.mole-banner').inner_text(), 'the mole is named')
    ok('played a Hidden 50/50' in tv.locator('.q-card').inner_text(), 'the Hidden 50/50 is revealed after the answer')
    time.sleep(0.8)
    pp.screenshot(path=f'{OUT}/16-mole-won-fooled.png')
    tv.screenshot(path=f'{OUT}/17-mole-won-tv.png')
    for theme in ['office', 'bar']:
        http('POST', f'/api/rooms/{code}/act', {'type': 'theme', 'theme': theme}, who=host)
        time.sleep(2.2)
        pp.screenshot(path=f'{OUT}/18-mole-won-{theme}.png')
    b.close()

print('\n'.join(checks))
real = [e for e in errors if 'net::ERR' not in e and '409' not in e]
print('errors:', len(real))
for e in real[:20]:
    print('  ', e)
