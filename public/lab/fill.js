/* Fill the whole iPhone screen in the home-screen app (JC, Nov 12 2026: "the gap that shows up at
   the bottom of the screen").

   Since iOS 26, a web app opened from the home screen can get a page one status bar shorter than
   the screen: 100%, 100dvh and the page's own height all stop at the screen's height minus the
   status bar (62pt on a Pro Max), while the page is still drawn from the very top, so a black strip
   shows under every game (WebKit bug 301994). When that happens this marks <html class="lab-fill">
   and sets two variables on it:

     --lab-h    the screen's real height (use it for anything that should reach the bottom:
                var(--lab-h, 100%) on a full-screen fixed layer, var(--lab-h, 100dvh) for a screen)
     --lab-gap  how much short the page is (take it off a bottom-anchored fixed button's `bottom`
                so it sits on the real bottom: calc(14px + env(safe-area-inset-bottom) - var(--lab-gap, 0px)))

   and stretches html and body to --lab-h. Anywhere else (Safari, Android, a desktop, an iPhone
   that gets the right height) it does nothing and the variables stay unset.

   Load it first in <head>, right after the viewport tag: <script src="/lab/fill.js"></script> */
(function () {
  if (window.__labFill) return;
  window.__labFill = true;
  const root = document.documentElement;
  const css = 'html.lab-fill{height:var(--lab-h)!important;min-height:var(--lab-h)!important}'
    + 'html.lab-fill body{min-height:var(--lab-h)!important}';

  function insetTop() {
    const probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;left:0;top:0;width:1px;visibility:hidden;pointer-events:none;height:env(safe-area-inset-top,0px)';
    root.appendChild(probe);
    const h = probe.getBoundingClientRect().height;
    probe.remove();
    return h;
  }
  function fit() {
    if (navigator.standalone !== true) return;           // only iOS home-screen apps
    const sw = screen.width, sh = screen.height, page = root.clientHeight;   // clientHeight ignores the keyboard
    const landscape = root.clientWidth > page;
    const full = landscape ? Math.min(sw, sh) : Math.max(sw, sh);
    const short = Math.round(full - page), top = Math.round(insetTop());
    if (top > 0 && short > 0 && Math.abs(short - top) <= 4) {
      root.style.setProperty('--lab-h', full + 'px');
      root.style.setProperty('--lab-gap', short + 'px');
      root.classList.add('lab-fill');
    } else if (root.classList.contains('lab-fill')) {
      root.style.removeProperty('--lab-h');
      root.style.removeProperty('--lab-gap');
      root.classList.remove('lab-fill');
    }
  }
  const style = document.createElement('style');
  style.textContent = css;
  (document.head || root).appendChild(style);
  fit();
  document.addEventListener('DOMContentLoaded', fit);
  addEventListener('load', fit);
  addEventListener('resize', fit);
  addEventListener('orientationchange', () => setTimeout(fit, 300));
})();
