// A client-side entry gate, not authentication. All static files remain public.
(() => {
  const base = new URL('.', document.currentScript.src);
  const passwordHash = 'cc7f6ef9477a15f0e39e98dab2833acea244b0148828b8525d6deebc1884f6e4';
  const storageKey = 'future-of-law-entry:' + base.pathname;
  const pages = new Set(['index.html', 'worlds.html', 'horizons.html', 'perspectives.html']);
  const destination = value => {
    const fallback = new URL('index.html', base).href;
    try {
      const url = new URL(value || 'index.html', base);
      const name = url.pathname.slice(base.pathname.length);
      return url.origin === base.origin && url.pathname.startsWith(base.pathname) && pages.has(name) ? url.href : fallback;
    } catch (_) { return fallback; }
  };
  let unlocked = false;
  try {
    if (location.pathname === new URL('login.html', base).pathname && new URLSearchParams(location.search).has('lock')) sessionStorage.removeItem(storageKey);
    unlocked = sessionStorage.getItem(storageKey) === passwordHash;
  } catch (_) {}
  window.lawEntry = {base, passwordHash, storageKey, destination, unlocked};
  if (location.pathname !== new URL('login.html', base).pathname && !unlocked) {
    document.documentElement.hidden = true;
    const next = location.pathname.slice(base.pathname.length) + location.search + location.hash;
    location.replace(new URL('login.html?next=' + encodeURIComponent(next), base));
  }
})();
