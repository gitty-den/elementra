// sw.js — Offline-Cache fuer PWA (stale-while-revalidate).
// Neue Assets (JS/CSS/Fonts/Icons) hier in ASSETS eintragen, sonst offline nicht verfuegbar.
// Updates: Cache liefert sofort, Netz aktualisiert im Hintergrund -> greift beim NAECHSTEN Start.
const CACHE = 'elementra-v13';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/data.js',
  './js/profiles.js',
  './js/items.js',
  './js/state.js',
  './js/svg.js',
  './js/pixel.js',
  './js/sfx.js',
  './js/music.js',
  './js/stages.js',
  './js/ascension.js',
  './js/battle.js',
  './js/bp.js',
  './js/net.js',
  './js/ui.js',
  './js/main.js',
  './fonts/press-start-2p-latin.woff2',
  './fonts/vt323-latin.woff2',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fresh = fetch(e.request)
        .then((resp) => {
          if (resp.ok) {
            const copy = resp.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
          }
          return resp;
        })
        .catch(() => cached);
      return cached || fresh;
    })
  );
});
