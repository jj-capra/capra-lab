"""Solo daily, Challenge (two players, same board) and Party mode, through the real UI.

    python tests/e2e_modes.py http://localhost:8787 OUTDIR
"""
import os, re, sys, time
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8787'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'e2e-modes'
os.makedirs(OUT, exist_ok=True)
checks, errors = [], []


def ok(cond, msg):
    checks.append(('PASS ' if cond else 'FAIL ') + msg)
    if not cond:
        print('FAIL', msg, flush=True)


def clock(ms):
    import urllib.request
    urllib.request.urlopen(f'{BASE}/__clock?add={ms}').read()


def onboard(page, name, av=0):
    page.wait_for_selector('#nm', timeout=15000)
    page.fill('#nm', name)
    page.locator('.av-pick').nth(av).click()
    page.get_by_role('button', name=re.compile('^(Join|Make my profile)$')).click()
    page.get_by_role('button', name="Let's go").click()


def api(page, method, path, body=None):
    return page.evaluate("""async ([m, p, b]) => {
      const a = JSON.parse(localStorage.getItem('mh.auth'));
      const r = await fetch('/api' + p, { method: m, headers: { 'content-type': 'application/json', authorization: 'Bearer ' + a.pid + '.' + a.token }, body: b ? JSON.stringify(b) : undefined });
      return await r.json();
    }""", [method, path, body])


def play_solo(page, tag):
    for n in range(12):
        page.wait_for_selector('.tile.can', timeout=10000)
        page.locator('.tile.can').first.click()
        time.sleep(0.5)
        if page.locator('.takeover').count():
            if n < 6:
                page.screenshot(path=f'{OUT}/{tag}-takeover.png')
            clock(3000)
            page.wait_for_selector('.opt.can', timeout=8000)
        page.wait_for_selector('.opt.can', timeout=8000)
        if n == 0:
            page.screenshot(path=f'{OUT}/{tag}-question.png')
        page.locator('.opt.can').nth(n % 4).click()
        page.locator('.lock-btn').click()
        page.wait_for_selector('.stamp')
        if n == 0:
            time.sleep(0.4)
            page.screenshot(path=f'{OUT}/{tag}-reveal.png')
        page.get_by_role('button', name=re.compile('^(Next tile|Count the haul)$')).click()
        time.sleep(0.3)
    page.wait_for_selector('.winner', timeout=10000)
    time.sleep(1.5)


with sync_playwright() as p:
    b = p.chromium.launch()

    def ctx(w, h, mobile=False):
        c = b.new_context(viewport={'width': w, 'height': h}, is_mobile=mobile, has_touch=mobile, permissions=['clipboard-read', 'clipboard-write'])
        pg = c.new_page()
        pg.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))
        pg.on('console', lambda m: errors.append(f'console.{m.type}: {m.text}') if m.type == 'error' else None)
        return pg

    # ---------- Solo daily ----------
    kai = ctx(390, 844, True)
    kai.goto(BASE + '/')
    onboard(kai, 'Kai', 2)
    kai.wait_for_selector('.drop-card')
    kai.screenshot(path=f'{OUT}/01-home-phone.png')
    kai.get_by_role('button', name='Play your daily').click()
    kai.wait_for_selector('.board')
    time.sleep(0.4)
    kai.screenshot(path=f'{OUT}/02-solo-board.png')
    ok('/r/' in kai.url, 'solo runs get their own room URL')
    play_solo(kai, '03-solo')
    kai.screenshot(path=f'{OUT}/04-solo-final.png')
    ok('Official daily' in kai.inner_text('.winner'), 'first run of today’s drop is the official daily')
    ok(kai.locator('.ts-bubble').count() == 1 and len(kai.inner_text('.ts-bubble').strip()) > 10, 'the board shows as a text message')
    code = kai.url.rsplit('/', 1)[1]
    kai.locator('.ts-btns .btn', has_text='Copy').click()
    time.sleep(0.4)
    clip = kai.evaluate('navigator.clipboard.readText()')
    ok('Mind Heist' in clip and ('🟩' in clip or '🟥' in clip), 'share text has the emoji grid')
    kai.get_by_role('button', name='Challenge a friend').click()
    time.sleep(0.8)
    link = kai.evaluate('navigator.clipboard.readText()')
    m = re.search(r'/c/([A-Z0-9]{7})', link)
    ok(m is not None, f'challenge link copied ({link[-40:]})')
    chid = m.group(1) if m else None

    # Home after: daily score + streak
    kai.goto(BASE + '/')
    kai.wait_for_selector('.drop-card .score')
    ok('$' in kai.inner_text('.drop-card .score'), 'home shows your daily score')
    kai.screenshot(path=f'{OUT}/05-home-after-daily.png')

    # ---------- Challenge ----------
    zoe = ctx(1280, 800)
    zoe.goto(f'{BASE}/c/{chid}')
    onboard(zoe, 'Zoe', 7)
    zoe.wait_for_selector('.onb-card h1')
    time.sleep(0.5)
    zoe.screenshot(path=f'{OUT}/06-challenge-landing.png')
    ok('Kai challenged you' in zoe.inner_text('.onb-card'), 'friend sees who challenged them')
    zoe.get_by_role('button', name='Take the challenge').click()
    zoe.wait_for_selector('.board')
    play_solo(zoe, '07-challenge')
    zoe.screenshot(path=f'{OUT}/08-challenge-final.png')
    t = zoe.inner_text('.winner')
    ok('Challenge run' in t and ('beat Kai' in t or 'Kai wins' in t or 'Tied with Kai' in t), 'result compares against the challenger')
    fr = api(zoe, 'GET', '/friends')
    ok(any(f['name'] == 'Kai' for f in fr['friends']), 'taking a challenge makes you friends')
    kai.goto(f'{BASE}/c/{chid}')
    kai.wait_for_selector('.lb li')
    kai.screenshot(path=f'{OUT}/09-challenge-creator-view.png')
    ok(kai.locator('.lb li').count() == 2, 'creator sees the takers')

    # Leaderboard + profile sheets
    kai.goto(BASE + '/')
    kai.wait_for_selector('.drop-card')
    kai.get_by_role('button', name='Leaderboard').click()
    time.sleep(0.6)
    kai.screenshot(path=f'{OUT}/10-leaderboard-today.png')
    ok(kai.locator('.sheet .lb li').count() == 1, 'today’s board shows official dailies only (Zoe’s challenge run does not count)')
    kai.keyboard.press('Escape')
    kai.locator('.top .chip').click()
    time.sleep(0.5)
    kai.screenshot(path=f'{OUT}/11-profile.png', full_page=False)
    ok(kai.locator('.badge-card:not(.locked)').count() >= 1, 'profile shows earned badges')
    kai.keyboard.press('Escape')

    # ---------- Party ----------
    host = ctx(1440, 900)
    host.goto(BASE + '/')
    onboard(host, 'Dana', 4)
    host.wait_for_selector('.drop-card')
    host.locator('.mode-btn.host').click()
    host.locator('.choice-btn', has_text='One screen').click()
    host.get_by_role('button', name='Open the room').click()
    host.wait_for_selector('.invite')
    host.fill('.invite .field', 'Ana, Ben, Cy, Di, Eve')
    host.keyboard.press('Enter')
    time.sleep(2.5)
    host.screenshot(path=f'{OUT}/12-party-lobby.png')
    ok(host.locator('.mem').count() == 5, 'party roster added from a pasted list')
    host.get_by_role('button', name='Draw the captains').click()
    time.sleep(2.8)
    host.get_by_role('button', name='Flip the coin').click()
    time.sleep(2.9)
    host.get_by_role('button', name=re.compile('Start the (draft|heist)')).click()
    time.sleep(0.6)
    while host.locator('.pick-btn:not([disabled])').count():
        host.locator('.pick-btn:not([disabled])').first.click()
        time.sleep(0.5)
    host.wait_for_selector('.board')
    time.sleep(0.5)
    host.screenshot(path=f'{OUT}/13-party-board.png')
    banner = host.inner_text('.seat')
    ok(any(n in banner for n in ['Ana', 'Ben', 'Cy', 'Di', 'Eve']), 'party banner names the guest in the hot seat')
    for n in range(3):
        host.locator('.tile.can').first.click()
        time.sleep(0.5)
        if host.locator('.takeover').count():
            host.get_by_role('button', name='Skip intro').click()
            time.sleep(0.5)
        host.locator('.opt.can').first.click()
        host.locator('.lock-btn').click()
        host.wait_for_selector('.stamp')
        if n == 0:
            host.screenshot(path=f'{OUT}/14-party-reveal.png')
        host.get_by_role('button', name=re.compile('^(Next|Count the haul)$')).click()
        time.sleep(0.4)
    host.get_by_role('button', name='End game').click()
    host.locator('.hostbar .btn.gum').click()
    host.wait_for_selector('.winner', timeout=8000)
    time.sleep(0.8)
    host.screenshot(path=f'{OUT}/15-party-final.png')
    ok('Ended early' in host.inner_text('.winner'), 'host can end a party game early')
    b.close()

print('\n'.join(checks))
real = [e for e in errors if 'net::ERR' not in e]
print('errors:', len(real))
for e in real[:20]:
    print('  ', e)
