// Where the app is running. Mind Heist sits at the root of its own site (mind-heist.netlify.app) and
// inside Capra Lab at capra-lab.netlify.app/mind-heist/, which passes every request through to this
// site. The app writes its paths from the site root ('/r/ABCD', '/api/home', '/theme.mp3'); these put
// /mind-heist in front when the page is inside Capra Lab. index.html sets a matching <base>.
export const BASE = /^\/mind-heist(\/|$)/.test(location.pathname) ? '/mind-heist' : '';
export const IN_LAB = BASE !== '';

// '/r/ABCD' -> the address to put in the address bar ('/mind-heist/r/ABCD' inside Capra Lab)
export const at = (p) => BASE + p;
// the address bar -> the app's own path ('/mind-heist/r/ABCD' -> '/r/ABCD')
export const local = (p) => (BASE && (p === BASE || p.startsWith(BASE + '/')) ? p.slice(BASE.length) || '/' : p);
// a full link to send someone ('https://capra-lab.netlify.app/mind-heist/ABCD')
export const link = (p = '/') => location.origin + BASE + p;
// a file next to the app ('icon-192.png' -> '/mind-heist/icon-192.png')
export const asset = (name) => BASE + '/' + name;
