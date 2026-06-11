/* ============================================================
   Service Worker — 北方領土ステータス
   - HTML: network-first (always shows fresh deploy, offline fallback)
   - Static assets (CSS/JS/images/fonts): cache-first (fast repeat loads)
   - Versioned caches; old caches purged on activate
   Bump CACHE_VERSION whenever shipping a new release.
   ============================================================ */
const CACHE_VERSION = 'v27';
const ASSET_Q = '?v=27'; // must match the ?v= query in index.html
const SHELL_CACHE = `hoppou-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `hoppou-runtime-${CACHE_VERSION}`;

// Core app shell precached on install (versioned to match index.html)
const SHELL_ASSETS = [
  './',
  './index.html',
  `./css/style.css${ASSET_Q}`,
  `./js/data.js${ASSET_Q}`,
  `./js/store.js${ASSET_Q}`,
  `./js/ui.js${ASSET_Q}`,
  `./js/achievements.js${ASSET_Q}`,
  `./js/quiz.js${ASSET_Q}`,
  `./js/shop.js${ASSET_Q}`,
  `./js/qr.js${ASSET_Q}`,
  `./js/license.js${ASSET_Q}`,
  `./js/settings.js${ASSET_Q}`,
  `./js/stamps.js${ASSET_Q}`,
  `./js/social.js${ASSET_Q}`,
  `./js/tutorial.js${ASSET_Q}`,
  `./js/app.js${ASSET_Q}`,
  './assets/characters/erika-main.png',
  './assets/images/icon-192.png',
  './assets/images/icon-512.png',
  './manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS).catch(() => {
        // Don't fail install if one asset 404s — cache what we can.
        return Promise.allSettled(SHELL_ASSETS.map((u) => cache.add(u)));
      }))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== SHELL_CACHE && k !== RUNTIME_CACHE)
            .map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

function isStaticAsset(url) {
  return /\.(?:css|js|png|jpe?g|webp|gif|svg|woff2?|ttf|otf)(?:\?|$)/i.test(url);
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Google Fonts stylesheet + font files: cache-first (stable, versioned by Google)
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';

  // Navigation / HTML documents: network-first so new deploys appear immediately.
  const isHTML = req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html');

  if (isHTML) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put('./index.html', copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  // Static assets + fonts: cache-first, then network (stale-while-revalidate-ish).
  if (isFont || isStaticAsset(url.href)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const network = fetch(req).then((res) => {
          if (res && (res.ok || res.type === 'opaque')) {
            const copy = res.clone();
            caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        }).catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // Everything else: network with cache fallback.
  event.respondWith(fetch(req).catch(() => caches.match(req)));
});
