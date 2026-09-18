/*
 * The web app's service worker (PRD §10.4, offline-first): once the site has
 * loaded, it opens without a connection. The store already lives on the
 * device; this keeps the bundle there too.
 *
 * Two rules and no more. The page itself (`index.html`, every route) is
 * network-first, so a new deploy is picked up on the next open and an old
 * shell is what you get only when there is no network at all. The hashed
 * files under `_expo/static` and `assets`, the icons and the manifest are
 * cache-first: their names change when their contents do, so a cached copy
 * is never stale. Nothing here touches the app's data, which never goes
 * through `fetch`. Playwright's walks skip the worker (`navigator.webdriver`),
 * so the tests see the server, not a cache.
 */
const CACHE = 'morrow-shell-v1';
const STATIC = /^\/(?:_expo\/static\/|assets\/|icons\/|manifest\.webmanifest$|favicon\.ico$)/;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add('/index.html').catch(() => undefined)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put('/index.html', copy)).catch(() => undefined);
          return res;
        })
        .catch(() => caches.match('/index.html').then((hit) => hit ?? Response.error())),
    );
    return;
  }

  if (STATIC.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ??
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => undefined);
            }
            return res;
          }),
      ),
    );
  }
});
