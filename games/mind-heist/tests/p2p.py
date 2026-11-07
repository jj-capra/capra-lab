"""Direct links between phones: instant updates, fallback when a phone can't link,
lighter backup checks, and Open mic that only reaches your own crew.

    python tests/p2p.py http://localhost:8787 OUTDIR
"""
import os, re, sys, time
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8787'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'p2p'
os.makedirs(OUT, exist_ok=True)
checks, errors = [], []


def ok(cond, msg):
    checks.append(('PASS ' if cond else 'FAIL ') + msg)
    if not cond:
        print('FAIL', msg, flush=True)


def onboard(page, name, av):
    page.goto(BASE + '/')
    page.wait_for_selector('#nm', timeout=15000)
    page.fill('#nm', name)
    page.locator('.av-pick').nth(av).click()
    page.get_by_role('button', name=re.compile('^(Join|Make my profile)$')).click()
    page.get_by_role('button', name="Let's go").click()
    page.wait_for_selector('.drop-card')


def api(page, method, path, body=None):
    return page.evaluate("""async ([m, p, b]) => {
      const a = JSON.parse(localStorage.getItem('mh.auth'));
      const r = await fetch('/api' + p, { method: m, headers: { 'content-type': 'application/json', authorization: 'Bearer ' + a.pid + '.' + a.token }, body: b ? JSON.stringify(b) : undefined });
      return await r.json();
    }""", [method, path, body])


def status(page):
    return page.evaluate('window.__mhMesh ? window.__mhMesh.status() : null')


def wait_for(fn, timeout=15, step=0.25):
    end = time.time() + timeout
    while time.time() < end:
        if fn():
            return True
        time.sleep(step)
    return False


with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'])

    def ctx(w, h, mobile=False, no_p2p=False):
        c = b.new_context(viewport={'width': w, 'height': h}, is_mobile=mobile, has_touch=mobile, permissions=['microphone'])
        if no_p2p:
            c.add_init_script('delete window.RTCPeerConnection;')
        pg = c.new_page()
        pg.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))
        pg.on('console', lambda m: errors.append(f'console.{m.type}: {m.text}') if m.type == 'error' else None)
        return pg

    host = ctx(1280, 800)
    phones = [ctx(390, 844, True) for _ in range(3)]
    blocked = ctx(390, 844, True, no_p2p=True)   # a phone whose network can't make direct links
    pages = [host] + phones + [blocked]
    for pg, (n, av) in zip(pages, [('JC', 0), ('Priya', 1), ('Marcus', 2), ('Elena', 3), ('Sam', 4)]):
        onboard(pg, n, av)
    pid = {api(pg, 'GET', '/me')['me']['pid']: pg for pg in pages}

    r = api(host, 'POST', '/rooms', {'kind': 'invite', 'settings': {'clock': 30}})
    code = r['code']
    host.goto(f'{BASE}/{code}')
    for pg in phones + [blocked]:
        pg.goto(f'{BASE}/{code}')
        pg.wait_for_selector('.members, .invite', timeout=15000)
    linkers = [host] + phones
    t_link = time.time()
    linked_all = wait_for(lambda: all((status(pg) or {}).get('open') == 3 for pg in linkers), 25)
    if not linked_all:
        for pg in linkers:
            print('DEBUG links', pg.evaluate('window.__mhMesh && window.__mhMesh.self'), pg.evaluate('window.__mhMesh && window.__mhMesh.debug()'))
    ok(linked_all, f'every phone links directly to the other three that can ({time.time() - t_link:.1f}s)')
    ok(status(blocked) is None, 'a phone that can’t make links still plays (no mesh)')
    host.screenshot(path=f'{OUT}/01-lobby-links.png')
    ok('3/3' in host.inner_text('.link-chip'), 'the link chip shows 3 of 3')

    # Crews, straight to the board.
    for t in ['start', 'toss', 'draft', 'autoDraft']:
        api(host, 'POST', f'/rooms/{code}/act', {'type': t})
    for pg in pages:
        pg.wait_for_selector('.board', timeout=15000)

    # Backup checks are lighter with links up: count room requests on an idle board.
    counts = {}
    def counter(name):
        def f(req):
            if f'/api/rooms/{code}' in req.url and '/sig' not in req.url and req.method == 'GET':
                counts[name] = counts.get(name, 0) + 1
        return f
    phones[0].on('request', counter('linked'))
    blocked.on('request', counter('blocked'))
    phones[0].wait_for_timeout(8200)  # lets Playwright deliver the request events
    blocked.wait_for_timeout(10)
    ok(counts.get('linked', 0) >= 5, f'with one phone unable to link, linked phones keep checking often too ({counts.get("linked", 0)} in 8s)')
    ok(counts.get('linked', 0) <= 12, f'no runaway polling ({counts.get("linked", 0)} in 8s)')
    ok(counts.get('blocked', 0) >= 5, f'an unlinked phone keeps checking every second or so ({counts.get("blocked", 0)} in 8s)')

    # Update speed: picker taps a tile; how long until the others see the question?
    lat = {}
    for rnd in range(5):
        st = api(host, 'GET', f'/rooms/{code}')['room']
        picker = pid[st['picker']]
        others = [pg for pg in pages if pg is not picker]
        for pg in others:
            pg.evaluate("window.__seen = null; new MutationObserver((m, o) => { if (document.querySelector('.q-card, .takeover')) { window.__seen = performance.timeOrigin + performance.now(); o.disconnect(); } }).observe(document.body, { childList: true, subtree: true });")
        t0 = picker.evaluate('performance.timeOrigin + performance.now()')
        picker.locator('.tile.can').first.click()
        ok(wait_for(lambda: all(pg.evaluate('window.__seen') for pg in others), 6, 0.05), f'round {rnd + 1}: every screen shows the question')
        for pg in others:
            seen = pg.evaluate('window.__seen')
            if seen:
                key = 'from-unlinked' if picker is blocked else ('to-unlinked' if pg is blocked else 'linked')
                lat.setdefault(key, []).append(seen - t0)
        # finish the question: host says no answer, then next
        if picker.locator('.takeover').count():
            api(host, 'POST', f'/rooms/{code}/act', {'type': 'next'})
        api(host, 'POST', f'/rooms/{code}/act', {'type': 'noAnswer'})
        api(picker, 'POST', f'/rooms/{code}/act', {'type': 'next'})  # only the answerer skips the fun fact
        for pg in pages:
            pg.wait_for_selector('.board', timeout=10000)
        time.sleep(0.6)
    mx = max(lat.get('linked', [9999]))
    ok(mx < 600, f'linked screens update fast (worst {mx:.0f} ms, avg {sum(lat["linked"]) / len(lat["linked"]):.0f} ms)')
    slow = lat.get('from-unlinked', []) + lat.get('to-unlinked', [])
    ok(not slow or max(slow) < 1900, f'a phone that can’t link still updates at the old speed (worst {max(slow) if slow else 0:.0f} ms)')
    print('latency ms', {k: [round(x) for x in v] for k, v in lat.items()})
    host.screenshot(path=f'{OUT}/02-board.png')

    # Once every remaining phone is linked, backup checks get rare.
    blocked.goto(BASE + '/')
    blocked.wait_for_selector('.drop-card')
    api(host, 'POST', f'/rooms/{code}/act', {'type': 'move', 'mid': [k for k, v in pid.items() if v is blocked][0], 'crew': 0})
    api(host, 'POST', f'/rooms/{code}/act', {'type': 'remove', 'mid': [k for k, v in pid.items() if v is blocked][0]})
    phones[0].wait_for_timeout(3000)
    counts.clear()
    phones[0].wait_for_timeout(8200)
    ok(counts.get('linked', 0) <= 3, f'with everyone linked, a phone checks in rarely while idle ({counts.get("linked", 0)} in 8s)')

    # Open mic is off by default (work games on Teams don't need it); the host turns it on.
    ok(all(pg.locator('.mic-btn').count() == 0 for pg in linkers), 'no mic button until the host turns Open mic on')
    api(host, 'POST', f'/rooms/{code}/act', {'type': 'mic', 'on': True})
    ok(wait_for(lambda: all(pg.locator('.mic-btn').count() == 1 for pg in linkers if pg is not host) , 8), 'turning Open mic on shows the mic button')

    # Open mic: two teammates turn it on, a rival turns it on too.
    st = api(host, 'GET', f'/rooms/{code}')['room']
    crews = st['crews']
    mates = [pid[m] for m in crews[0]['mem'] if m in pid and pid[m] in linkers]
    rivals = [pid[m] for m in crews[1]['mem'] if m in pid and pid[m] in linkers]
    if len(mates) < 2:
        mates, rivals = rivals, mates
    ok(len(mates) >= 2 and len(rivals) >= 1, 'crews have linked phones on both sides')
    a, bb = mates[0], mates[1]
    rv = rivals[0]
    for pg in (a, bb, rv):
        pg.locator('.mic-btn').click()
    ok(wait_for(lambda: a.locator('.mic-btn.on').count() == 1 and bb.locator('.mic-btn.on').count() == 1, 8), 'Open mic turns on')
    def link_to(pg, other):
        other_id = [k for k, v in pid.items() if v is other][0]
        return [l for l in pg.evaluate('window.__mhMesh.debug()') if l['pid'] == other_id]
    good = wait_for(lambda: any(l['sending'] for l in link_to(a, bb)) and any(l['receiving'] for l in link_to(bb, a)) and any(l['sending'] for l in link_to(bb, a)) and any(l['receiving'] for l in link_to(a, bb)), 12)
    if not good:
        print('DEBUG a->bb', link_to(a, bb), 'bb->a', link_to(bb, a))
        print('DEBUG tx a', a.evaluate("JSON.stringify([...(window.__mhMesh && window.__mhMesh.debugPc ? window.__mhMesh.debugPc() : [])])"))
    ok(good, 'teammates send and receive each other’s voice, both ways')
    ok(wait_for(lambda: any(l['playing'] for l in link_to(bb, a)), 5), 'a teammate with Open mic on hears it')
    time.sleep(1.5)
    ok(not any(l['sending'] for l in link_to(a, rv)) and not any(l['sending'] for l in link_to(rv, a)), 'no audio is sent across crews')
    ok(not any(l['receiving'] for l in link_to(rv, a)) and not any(l['receiving'] for l in link_to(a, rv)), 'the other crew never receives it')
    a.screenshot(path=f'{OUT}/03-open-mic-phone.png')
    ok('Mic on' in (a.locator('.mic-btn').get_attribute('aria-label') or ''), 'the button says the mic is on and who is on air')
    # A teammate who hasn't turned it on gets nothing.
    mk = 0 if a in [pid[m] for m in crews[0]['mem'] if m in pid] else 1
    quiet = [pid[m] for m in crews[mk]['mem'] if m in pid and pid[m] in linkers and pid[m] not in (a, bb)]
    if quiet:
        ok(not any(l['receiving'] for l in link_to(quiet[0], a)), 'a teammate with Open mic off receives nothing')
    # Turning it off stops sending.
    a.locator('.mic-btn').click()
    ok(wait_for(lambda: not any(l['sending'] for l in link_to(a, bb)), 8), 'turning the mic off stops sending')

    # The host switches Open mic off: every mic goes off and the button disappears.
    bb_was_on = bb.locator('.mic-btn.on').count() == 1
    api(host, 'POST', f'/rooms/{code}/act', {'type': 'mic', 'on': False})
    ok(wait_for(lambda: bb.locator('.mic-btn').count() == 0 and not (status(bb) or {}).get('voice'), 8) and bb_was_on, 'switching Open mic off turns every mic off')

    # A phone leaves: the others drop the link.
    leaver = [pg for pg in phones if pg not in (a, bb, rv)] or [phones[2]]
    leaver[0].goto(BASE + '/')
    ok(wait_for(lambda: (status(host) or {}).get('total') == 2, 15), 'when a phone leaves, the others drop its link')
    b.close()

print('\n'.join(checks))
real = [e for e in errors if 'net::ERR' not in e]
print('errors:', len(real))
for e in real[:20]:
    print('  ', e)
