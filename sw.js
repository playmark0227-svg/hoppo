/* ============================================================
   Service Worker — 北方領土ステータス
   - HTML: network-first (always shows fresh deploy, offline fallback)
   - Static assets (CSS/JS/images/fonts): cache-first (fast repeat loads)
   - Versioned caches; old caches purged on activate
   Bump CACHE_VERSION whenever shipping a new release.
   ============================================================ */
const CACHE_VERSION = 'v31';
const ASSET_Q = '?v=31'; // must match the ?v= query in index.html
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
  // コンテンツ画像もプリキャッシュ（約1.2MB）— クイズ・島カード・ランク・スタンプが完全オフライン化
  './assets/images/hoppou/cape-nosappu.jpg',
  './assets/images/hoppou/clione.jpg',
  './assets/images/hoppou/drift-ice.jpg',
  './assets/images/hoppou/easternmost-point.jpg',
  './assets/images/hoppou/four-islands-map.jpg',
  './assets/images/hoppou/habomai-map.png',
  './assets/images/hoppou/hanasaki-crab.jpg',
  './assets/images/hoppou/iturup-coast.jpg',
  './assets/images/hoppou/iturup-volcano.jpg',
  './assets/images/hoppou/kunashir-view.jpg',
  './assets/images/hoppou/shikotan.jpg',
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
    // アプリのindexナビゲーションのみキャッシュ更新対象にする（404等の誤った
    // レスポンスや別HTMLで './index.html' を上書きしない）
    const scopePath = new URL(self.registration.scope).pathname;
    const isAppIndex = url.origin === self.location.origin &&
      (url.pathname === scopePath || url.pathname === scopePath + 'index.html');
    // HTMLは必ずサーバー最新を取得（ブラウザHTTPキャッシュの古いindexを掴まない）。
    // これでデプロイ後リロード1回で確実に新版が表示される。
    event.respondWith(
      fetch(req, { cache: 'no-store' })
        .then((res) => {
          if (res.ok && isAppIndex) {
            const copy = res.clone();
            caches.open(SHELL_CACHE).then((c) => c.put('./index.html', copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  // Static assets + fonts: 真の cache-first（ヒット時は再フェッチしない）
  if (isFont || isStaticAsset(url.href)) {
    const isImage = /\.(?:png|jpe?g|webp|gif|svg)(?:\?|$)/i.test(url.href);
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          // CORSレスポンスのみ保存（opaqueはquotaを大きく消費するため除外。
          // Google Fonts は <link crossorigin> 指定済みなので CORS で取得される）
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        }).catch(() => {
          // オフラインで未キャッシュの画像はエリカちゃんで代替（壊れ画像を防ぐ）
          if (isImage) return caches.match('./assets/characters/erika-main.png');
          return undefined;
        });
      })
    );
    return;
  }

  // Everything else: network with cache fallback.
  event.respondWith(fetch(req).catch(() => caches.match(req)));
});
