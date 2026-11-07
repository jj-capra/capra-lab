"""Screenshots of every look on the screens that matter, plus checks that the
host's look reaches everyone in the room.

    python tests/looks.py http://localhost:8787 OUTDIR
"""
import os, re, sys, time
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8787'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'looks'
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


def look(page):
    return page.evaluate('document.documentElement.dataset.theme')


with sync_playwright() as p:
    b = p.chromium.launch()

    def ctx(w, h, mobile=False):
        c = b.new_context(viewport={'width': w, 'height': h}, is_mobile=mobile, has_touch=mobile)
        pg = c.new_page()
        pg.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))
        pg.on('console', lambda m: errors.append(f'console.{m.type}: {m.text}') if m.type == 'error' else None)
        return pg

    host = ctx(1440, 900)
    host.goto(BASE + '/')
    onboard(host, 'Dana', 4)
    host.wait_for_selector('.drop-card')
    ok(look(host) == 'heist', 'new profiles start on the Heist look')

    # Profile picker
    host.locator('.top .chip').click()
    host.wait_for_selector('.th-pick')
    host.locator('.th-pick').scroll_into_view_if_needed()
    time.sleep(0.6)
    host.screenshot(path=f'{OUT}/00-profile-picker.png')
    host.locator('.th-opt', has_text='Branch Office').click()
    time.sleep(0.8)
    ok(look(host) == 'office', 'picking a look on the profile repaints the page')
    ok(api(host, 'GET', '/me')['me']['theme'] == 'office', 'the look is saved to the profile')
    host.keyboard.press('Escape')

    phone = ctx(390, 844, True)
    phone.goto(BASE + '/')
    onboard(phone, 'Priya', 1)
    phone.wait_for_selector('.drop-card')

    for theme in ['heist', 'office', 'bar', 'sports', 'popup', 'gameshow', 'arcade']:
        api(host, 'POST', '/me/update', {'theme': theme})
        host.goto(BASE + '/')
        host.wait_for_selector('.drop-card')
        time.sleep(0.8)
        ok(look(host) == theme, f'{theme}: home wears your look')
        host.screenshot(path=f'{OUT}/{theme}-01-home.png')

        # Party room in this look (host's choice), straight to the board.
        r = api(host, 'POST', '/rooms', {'kind': 'party', 'settings': {'theme': theme, 'clock': 30, 'hacker': True, 'fifty': True, 'doubles': 1}})
        code = r['code']
        for n in ['Ana', 'Ben', 'Cy', 'Di', 'Eve']:
            api(host, 'POST', f'/rooms/{code}/act', {'type': 'addGuest', 'name': n})
        host.goto(f'{BASE}/r/{code}')
        host.wait_for_selector('.invite')
        time.sleep(0.6)
        host.screenshot(path=f'{OUT}/{theme}-02-lobby.png')
        for t in ['start', 'toss', 'draft', 'autoDraft']:
            api(host, 'POST', f'/rooms/{code}/act', {'type': t})
        host.goto(f'{BASE}/r/{code}')
        host.wait_for_selector('.board')
        time.sleep(1.2)
        ok(look(host) == theme, f'{theme}: the room wears the host’s look')
        host.screenshot(path=f'{OUT}/{theme}-03-board.png')
        host.locator('.tile.can').nth(4).click()
        time.sleep(0.6)
        if host.locator('.takeover').count():
            host.screenshot(path=f'{OUT}/{theme}-03b-takeover.png')
            host.get_by_role('button', name='Skip intro').click()
        host.wait_for_selector('.opt.can')
        time.sleep(0.5)
        host.screenshot(path=f'{OUT}/{theme}-04-question.png')
        clock(26000)
        host.reload()  # pick up the moved test clock
        host.wait_for_selector('.opt.can')
        time.sleep(1.2)
        host.screenshot(path=f'{OUT}/{theme}-05-last-call.png')
        host.locator('.opt.can').nth(1).click()
        host.locator('.lock-btn').click()
        host.wait_for_selector('.stamp')
        time.sleep(1.0)
        host.screenshot(path=f'{OUT}/{theme}-06-reveal.png')

        # Phone: a solo run in Priya's own look (heist), then switch her look to this one.
        api(phone, 'POST', '/me/update', {'theme': theme})
        s = api(phone, 'POST', '/rooms', {'kind': 'solo'})
        phone.goto(f'{BASE}/r/{s["code"]}')
        phone.wait_for_selector('.board')
        time.sleep(1.0)
        ok(look(phone) == theme, f'{theme}: a solo run wears the player’s look')
        phone.screenshot(path=f'{OUT}/{theme}-07-phone-board.png')
        seen = set()
        for n in range(12):
            phone.wait_for_selector('.tile.can', timeout=10000)
            phone.locator('.tile.can').first.click()
            time.sleep(0.5)
            if phone.locator('.takeover').count():
                kind = 'hacker' if phone.locator('.takeover.hacker').count() else 'double'
                if kind not in seen:
                    seen.add(kind)
                    time.sleep(0.6)
                    phone.screenshot(path=f'{OUT}/{theme}-08-phone-{kind}.png')
                clock(3000)
            phone.wait_for_selector('.opt.can', timeout=8000)
            if n == 0:
                time.sleep(0.4)
                phone.screenshot(path=f'{OUT}/{theme}-09-phone-question.png')
            phone.locator('.opt.can').nth(n % 4).click()
            phone.locator('.lock-btn').click()
            phone.wait_for_selector('.stamp')
            if n == 0:
                time.sleep(1.0)
                phone.screenshot(path=f'{OUT}/{theme}-10-phone-reveal.png')
            if seen >= {'hacker', 'double'} and n >= 1:
                break
            phone.get_by_role('button', name=re.compile('^(Next tile|Count the haul)$')).click()
            time.sleep(0.3)

    # Invite room: everyone sees the host's look, whatever their own is.
    api(host, 'POST', '/me/update', {'theme': 'bar'})
    api(phone, 'POST', '/me/update', {'theme': 'office'})
    r = api(host, 'POST', '/rooms', {'kind': 'invite'})
    phone.goto(f'{BASE}/{r["code"]}')
    phone.wait_for_selector('.invite, .members')
    time.sleep(1.0)
    ok(look(phone) == 'bar', 'a player joining an invite room sees the host’s look, not their own')
    phone.screenshot(path=f'{OUT}/invite-phone-lobby.png')
    host.goto(f'{BASE}/{r["code"]}')
    host.wait_for_selector('.invite')
    host.locator('.pill', has_text='Branch Office').click()
    time.sleep(2.6)
    ok(look(phone) == 'office', 'when the host switches the look, players follow')
    phone.goto(BASE + '/')
    phone.wait_for_selector('.drop-card')
    ok(look(phone) == 'office', 'leaving the room returns to your own look')
    tv = ctx(1280, 720)
    tv.goto(f'{BASE}/tv/{r["code"]}')
    tv.wait_for_selector('.invite')
    time.sleep(0.8)
    ok(look(tv) == 'office', 'the big-screen view wears the host’s look')
    b.close()

print('\n'.join(checks))
real = [e for e in errors if 'net::ERR' not in e]
print('errors:', len(real))
for e in real[:20]:
    print('  ', e)
