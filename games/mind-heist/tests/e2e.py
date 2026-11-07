"""End-to-end: a host and three players, each in their own browser, play a full invite game.

    node dev/server.mjs 8787 &      (in-memory store with a test clock)
    python tests/e2e.py http://localhost:8787 OUTDIR
"""
import json, os, re, sys, time
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8787'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'e2e-shots'
os.makedirs(OUT, exist_ok=True)
checks, errors = [], []


def ok(cond, msg):
    checks.append(('PASS ' if cond else 'FAIL ') + msg)
    if not cond:
        print('FAIL', msg, flush=True)


def clock(ms):
    import urllib.request
    urllib.request.urlopen(f'{BASE}/__clock?add={ms}').read()


def state(page, code):
    return page.evaluate("""async (code) => {
      const a = JSON.parse(localStorage.getItem('mh.auth'));
      const r = await fetch('/api/rooms/' + code, { headers: { authorization: 'Bearer ' + a.pid + '.' + a.token } });
      return (await r.json()).room;
    }""", code)


def pid(page):
    return page.evaluate("JSON.parse(localStorage.getItem('mh.auth')).pid")


def onboard(page, name, avatar_index=0, join=False):
    page.wait_for_selector('#nm', timeout=15000)
    page.fill('#nm', name)
    page.locator('.av-pick').nth(avatar_index).click()
    page.get_by_role('button', name=re.compile('^(Join|Make my profile)$')).click()
    page.get_by_role('button', name="Let's go").click()


def shot(page, name):
    page.screenshot(path=os.path.join(OUT, name + '.png'))


def hscroll(page):
    return page.evaluate('document.documentElement.scrollWidth > window.innerWidth + 1')


with sync_playwright() as p:
    b = p.chromium.launch()
    def ctx(w, h, mobile=False):
        c = b.new_context(viewport={'width': w, 'height': h}, is_mobile=mobile, has_touch=mobile)
        pg = c.new_page()
        pg.on('pageerror', lambda e: errors.append(f'{w}x{h} pageerror: {e}'))
        pg.on('console', lambda m: errors.append(f'{w}x{h} console.{m.type}: {m.text}') if m.type == 'error' else None)
        return pg

    host = ctx(1440, 900)
    host.goto(BASE + '/')
    shot(host, '00-onboarding')
    onboard(host, 'JC', 0)
    host.wait_for_selector('.drop-card')
    time.sleep(0.6)
    shot(host, '01-home')
    ok(not hscroll(host), 'home: no sideways scroll')
    ok('Today' in host.inner_text('.drop-card'), 'home shows today’s drop')

    host.locator('.mode-btn.host').click()
    host.locator('.choice-btn', has_text='Send a link').click()
    shot(host, '02-host-sheet')
    host.get_by_role('button', name='Open the room').click()
    host.wait_for_selector('.invite .code')
    code = host.inner_text('.invite .code').strip()
    ok(re.fullmatch(r'[A-Z0-9]{4}', code) is not None, f'room code {code}')
    ok(host.url.endswith('/' + code), 'invite URL is the domain plus the code')

    players = []
    for name, (w, h, mob), av in [('Priya', (390, 844, True), 3), ('Marcus', (1280, 720, False), 5), ('Elena', (390, 844, True), 9)]:
        pg = ctx(w, h, mob)
        pg.goto(f'{BASE}/{code}')
        onboard(pg, name, av, join=True)
        pg.wait_for_selector('.mem-grid')
        players.append(pg)
    time.sleep(2.5)
    shot(host, '03-lobby-host')
    shot(players[0], '03-lobby-phone')
    ok(host.locator('.mem').count() == 4, 'host sees all four in the lobby')
    ok(not hscroll(players[0]), 'phone lobby: no sideways scroll')

    # privacy: a stranger loading the site sees nothing about this room
    stranger = ctx(1280, 720)
    stranger.goto(BASE + '/')
    stranger.wait_for_selector('#nm')
    ok('Priya' not in stranger.inner_text('body') and code not in stranger.inner_text('body'), 'a stranger sees no names or codes')

    pages = [host] + players
    by_pid = {pid(pg): pg for pg in pages}
    names = {pid(pg): n for pg, n in zip(pages, ['JC', 'Priya', 'Marcus', 'Elena'])}

    # The host got the invite pop-up while waiting alone; it closes with Escape.
    ok(host.locator('.invite-pop').count() == 1, 'the invite pops up for a host waiting alone')
    host.keyboard.press('Escape')
    host.wait_for_selector('.invite-pop', state='detached')
    host.get_by_role('button', name='Draw the captains').click()
    time.sleep(0.8)
    shot(players[1], '04-captains-spin')
    time.sleep(2.2)
    shot(host, '05-captains')
    host.get_by_role('button', name='Flip the coin').click()
    time.sleep(1.0)
    shot(players[0], '06-coin-flip')
    time.sleep(2.0)
    shot(host, '07-coin-result')
    host.get_by_role('button', name=re.compile('Start the (draft|heist)')).click()
    time.sleep(0.8)
    st = state(host, code)
    if st['phase'] == 'draft':
        shot(players[1], '08-draft')
        while st['phase'] == 'draft':
            cap = st['crews'][st['draft']['turn']]['cap']
            pg = by_pid[cap]
            pg.wait_for_timeout(700)
            pg.locator('.pick-btn:not([disabled])').first.click()
            time.sleep(0.6)
            st = state(host, code)
    ok(st['phase'] == 'board', 'draft done, board is up')
    ok(st['turn'] == 1 - st['toss'], 'toss loser picks first')
    time.sleep(1.5)

    used = {'fifty': False, 'timeout': False, 'pause': False, 'react': False, 'suggest': False}
    shots_taken = set()
    rotation = {0: [], 1: []}
    for n in range(12):
        st = state(host, code)
        if st['phase'] != 'board':
            break
        picker = st['picker']
        rotation[st['turn']].append(picker)
        pg = by_pid[picker]
        # every screen names the picker
        for other in pages:
            other.wait_for_timeout(50)
        time.sleep(1.4)
        banner_ok = all(names[picker] in o.inner_text('.seat') or ('You' in o.inner_text('.seat') and o is pg) for o in pages)
        ok(banner_ok, f'tile {n + 1}: every screen shows who is picking ({names[picker]})')
        if 'board' not in shots_taken:
            shot(host, '09-board-host'); shot(pg, '09-board-picker'); shots_taken.add('board')
            ok(not hscroll(players[0]), 'phone board: no sideways scroll')
        ok(pg.locator('.tile.can').count() > 0, 'picker has live tiles')
        rival = next(o for o in pages if o is not pg and o.locator('.tile.can').count() == 0)
        ok(rival.locator('.tile.can').count() == 0, 'others cannot pick')
        pg.locator('.tile.can').first.click()
        time.sleep(0.5)
        st = state(host, code)
        if st['phase'] == 'intro':
            time.sleep(0.8)
            shot(pg, '10-takeover-' + st['cur']['sp'])
            shot(rival, '10-takeover-' + st['cur']['sp'] + '-rival')
            clock(3000)
            time.sleep(1.6)
            st = state(host, code)
        ok(st['phase'] == 'ask', f'tile {n + 1}: question open')
        time.sleep(1.4)
        crew = st['crews'][st['cur']['crew']]
        mates = [by_pid[m] for m in crew['mem'] if m != picker and m in by_pid]
        if mates and not used['suggest']:
            used['suggest'] = True
            mates[0].locator('.opt.can').nth(1).click()
            time.sleep(1.6)
            shot(pg, '11-question-picker-with-suggestion')
            ok(pg.locator('.opt .sugs .av').count() >= 1, 'picker sees the crewmate suggestion')
            rival_crew = [by_pid[m] for m in st['crews'][1 - st['cur']['crew']]['mem'] if m in by_pid]
            if rival_crew:
                ok(rival_crew[0].locator('.opt .sugs').count() == 0, 'rival crew cannot see suggestions')
                shot(rival_crew[0], '11-question-rival')
        if not used['timeout']:
            used['timeout'] = True
            pg.get_by_role('button', name='Timeout').click()
            time.sleep(1.4)
            shot(rival, '12-crew-timeout-blur')
            ok(rival.locator('.blurred').count() == 1, 'timeout blurs the options for everyone')
            ok(pg.locator('.opt').count() == 0 and pg.locator('.opt-ph').count() == 4, 'options are not even sent during the timeout')
            pg.get_by_role('button', name='Back to it').click()
            time.sleep(1.2)
        elif not used['fifty'] and st['settings']['fifty']:
            used['fifty'] = True
            pg.get_by_role('button', name='50/50').click()
            time.sleep(1.4)
            ok(rival.locator('.opt.gone').count() == 2, '50/50 strikes two options on every screen')
            shot(pg, '13-fifty')
        elif not used['pause'] and n >= 3:
            used['pause'] = True
            host.get_by_role('button', name='Pause').click()
            time.sleep(1.5)
            # the host gets a Resume bar instead of the wall, so check a player who isn't hosting
            watcher = next(o for o in pages if o is not host and o is not pg)
            shot(watcher, '14-paused-player')
            ok(watcher.locator('.paused').count() == 1, 'players see the host pause')
            ok(host.locator('.paused').count() == 0 and host.get_by_role('button', name='Resume').count() == 1, 'host gets Resume, not the wall')
            host.get_by_role('button', name='+10s').click()
            time.sleep(0.4)
            left_before = state(host, code)['cur']['left']
            host.get_by_role('button', name='Resume').click()
            time.sleep(1.3)
            ok(watcher.locator('.paused').count() == 0, 'pause lifts on resume')
            ok(left_before is not None and left_before > 10000, 'the +10s landed on the frozen clock')
        if not used['react']:
            used['react'] = True
            players[1].locator('.emo-row .emo-b').first.click()
            time.sleep(1.8)
            ok(players[0].locator('.floater').count() >= 1, 'reactions float on other screens')
        opts = pg.locator('.opt.can:not(.gone)')
        opts.nth(n % max(1, opts.count())).click()
        if 'lock' not in shots_taken:
            shot(pg, '15-ready-to-lock'); shots_taken.add('lock')
        pg.get_by_role('button', name=re.compile('^Lock in')).click()
        time.sleep(1.4)
        if 'reveal' not in shots_taken:
            shot(pg, '16-reveal-picker'); shot(rival, '16-reveal-rival'); shots_taken.add('reveal')
        st = state(host, code)
        ok(st['phase'] == 'reveal' and st['cur']['ans'] is not None, f'tile {n + 1}: answer revealed after the lock')
        clock(12700)  # verdict, then the fun fact, then on to the next tile
        time.sleep(1.8)

    for _ in range(4):
        st = state(host, code)
        if st['phase'] == 'sudden':
            shot(host, '17-sudden')
            for k in (0, 1):
                cap = by_pid[st['crews'][k]['cap']]
                cap.locator('.opt.can').nth(k).click()
                cap.get_by_role('button', name=re.compile('^Lock')).click()
                time.sleep(1.2)
            clock(8000); time.sleep(2)
    time.sleep(2.5)
    st = state(host, code)
    ok(st['phase'] == 'final', 'game reaches the final screen')
    ok(bool(st.get('results')), 'results banked for everyone')
    time.sleep(1.5)
    shot(host, '18-final-host')
    shot(players[0], '18-final-phone')
    for k in (0, 1):
        mem = st['crews'][k]['mem']
        firsts = rotation[k][:len(mem)]
        ok(len(set(firsts)) == len(firsts), f'crew {k}: each member took a turn in order before repeats')

    # Friends + leaderboard after the game
    players[0].goto(BASE + '/')
    players[0].wait_for_selector('.drop-card')
    time.sleep(1)
    shot(players[0], '19-home-after-phone')
    ok('🔥1' in players[0].inner_text('.top').replace(' ', ''), 'streak shows 1 after the first game')
    ok(players[0].locator('.lb li').count() >= 4, 'friends board lists the crew')
    players[0].get_by_role('button', name='See all').click()
    time.sleep(0.6)
    shot(players[0], '20-leaderboard')
    players[0].keyboard.press('Escape')

    # Big-screen view (no profile needed)
    tv = ctx(1920, 1080)
    tv.goto(f'{BASE}/tv/{code}')
    tv.wait_for_selector('.final, .stage-grid, .lobby')
    time.sleep(1)
    shot(tv, '21-tv')
    b.close()

print('\n'.join(checks))
real = [e for e in errors if 'favicon' not in e and 'net::ERR' not in e]
print('errors:', len(real))
for e in real[:20]:
    print('  ', e)
