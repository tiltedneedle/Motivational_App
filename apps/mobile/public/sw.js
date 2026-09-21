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
 *
 * The statics live in a cache named for the shell that loaded them. When a
 * fresh `index.html` arrives that differs from the one kept, it is a new
 * deploy: the old statics' cache is dropped and the new bundle is fetched
 * once. Without this every deploy left its four megabytes behind, for good.
 */
const SHELL = 'morrow-shell-v2';
const MARKER = '/__shell-version';
// Hashed: their names change when their contents do, so cache-first.
const STATIC = /^\/(?:_expo\/static\/|assets\/)/;
// Unhashed and small: network-first, the cache behind it for offline.
const NAMED = /^\/(?:icons\/|manifest\.webmanifest$|favicon\.ico$|og\.png$)/;

function hash(text) {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

async function version() {
  const shell = await caches.open(SHELL);
  const hit = await shell.match(MARKER);
  return hit ? hit.text() : 'boot';
}

async function statics() {
  return caches.open(`morrow-static-${await version()}`);
}

/**
 * A fresh shell: keep it, and if it is a new deploy, let the old statics go
 * and fetch the scripts this shell names, so the app opens offline after
 * its first load and not only after its second. Only a page is a shell: a
 * navigation that lands on the worker file or the manifest is not kept.
 */
async function keepShell(res) {
  if (!/text\/html/i.test(res.headers.get('content-type') || '')) return;
  const html = await res.text();
  const next = hash(html);
  const shell = await caches.open(SHELL);
  const prev = await version();
  await shell.put('/index.html', new Response(html, { headers: res.headers }));
  if (prev === next) return;
  await shell.put(MARKER, new Response(next));
  const keys = await caches.keys();
  await Promise.all(keys.filter((k) => k.startsWith('morrow-static-') && k !== `morrow-static-${next}`).map((k) => caches.delete(k)));
  const scripts = [...html.matchAll(/(?:src|href)="(\/_expo\/static\/[^"]+)"/g)].map((m) => m[1]);
  if (scripts.length) {
    const cache = await caches.open(`morrow-static-${next}`);
    await cache.addAll(scripts).catch(() => undefined);
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    fetch('/index.html')
      .then((res) => (res.ok ? keepShell(res) : undefined))
      .catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL && !k.startsWith('morrow-static-')).map((k) => caches.delete(k))))
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
        .then(async (res) => {
          // Kept before the page is handed over, so the statics it asks for
          // next land in the cache named for this shell, not the last one.
          if (res.ok) await keepShell(res.clone()).catch(() => undefined);
          return res;
        })
        .catch(() => caches.open(SHELL).then((shell) => shell.match('/index.html')).then((hit) => hit ?? Response.error())),
    );
    return;
  }

  if (STATIC.test(url.pathname)) {
    event.respondWith(
      statics().then((cache) =>
        cache.match(req).then(
          (hit) =>
            hit ??
            fetch(req).then((res) => {
              if (res.ok) cache.put(req, res.clone()).catch(() => undefined);
              return res;
            }),
        ),
      ),
    );
    return;
  }

  if (NAMED.test(url.pathname)) {
    event.respondWith(
      statics().then((cache) =>
        fetch(req)
          .then((res) => {
            if (res.ok) cache.put(req, res.clone()).catch(() => undefined);
            return res;
          })
          .catch(() => cache.match(req).then((hit) => hit ?? Response.error())),
      ),
    );
  }
});
