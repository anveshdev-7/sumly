/* Sumly service worker. Bump CACHE when you publish a new version. */
const CACHE = 'sumly-v1';
const CORE = ['index.html', 'sumly.html', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);

  if (u.origin === location.origin) {
    // Own files: network first so updates arrive, cache when offline.
    e.respondWith(
      fetch(r).then(res => {
        if (res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); }
        return res;
      }).catch(() =>
        caches.match(r, { ignoreSearch: true }).then(m =>
          m || (r.mode === 'navigate' ? caches.match('sumly.html') : Response.error()))
      )
    );
  } else if (/(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)) {
    // Fonts: use the cached copy, refresh in the background.
    e.respondWith(
      caches.match(r).then(m => {
        const net = fetch(r).then(res => {
          if (res.ok || res.type === 'opaque') { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); }
          return res;
        }).catch(() => m || Response.error());
        return m || net;
      })
    );
  }
});
