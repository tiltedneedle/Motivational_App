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
    // The chunks the entry loads on demand (the account library, the
    // browser, printing). Named inside the entry as string literals; kept
    // with it, so an old page outlives a deploy and the app opens offline
    // whole rather than only as far as its first screen.
    // Followed through the chunks they name in turn (a route's chunk names
    // the chunks it loads), with a bound, so the whole bundle is on the
    // device after one visit.
    const seen = new Set(scripts);
    let frontier = scripts.filter((s) => /\.js$/.test(s));
    for (let round = 0; round < 4 && frontier.length; round++) {
      const next = [];
      for (const src of frontier) {
        const text = await cache.match(src).then((r) => (r ? r.text() : '')).catch(() => '');
        for (const m of text.matchAll(/static\/js\/web\/([A-Za-z0-9_+%()[\]-]+\.js)/g)) {
          const p = `/_expo/static/js/web/${m[1]}`;
          if (!seen.has(p)) {
            seen.add(p);
            next.push(p);
          }
        }
      }
      if (next.length) await cache.addAll(next).catch(() => undefined);
      frontier = next;
    }
  }
  // A new deploy, and this was not the first: tell every open page.
  if (prev !== 'boot') {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of clients) c.postMessage({ type: 'morrow:new-version' });
  }
}

/** A fresh shell seen too late to keep: say so to the open pages, and change nothing. */
async function noteShell(res) {
  if (!/text\/html/i.test(res.headers.get('content-type') || '')) return;
  const next = hash(await res.text());
  if (next === (await version())) return;
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const c of clients) c.postMessage({ type: 'morrow:new-version' });
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
      (async () => {
        const shell = await caches.open(SHELL);
        const cached = await shell.match('/index.html');
        const raw = fetch(req);
        // Kept before the page is handed over, so the statics it asks for
        // next land in the cache named for this shell, not the last one.
        const keep = async (res) => {
          if (res.ok) await keepShell(res.clone()).catch(() => undefined);
          return res;
        };
        if (!cached) return raw.then(keep).catch(() => Response.error());
        // A connection that is up but not answering — lie-fi, a captive
        // portal — used to hold a blank ground for the browser's whole
        // timeout while a complete shell sat on the device. Three seconds,
        // then the cached one. A network answer that lands after that is
        // only noted (the page is told a newer build shipped): kept, it
        // would retire the statics the page just served is still loading.
        const timer = new Promise((resolve) => setTimeout(() => resolve(null), 3000));
        const first = await Promise.race([raw.catch(() => null), timer]);
        if (first) return keep(first);
        event.waitUntil(raw.then((res) => (res.ok ? noteShell(res.clone()) : undefined)).catch(() => undefined));
        return cached;
      })(),
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
              // Only what a static is. A chunk from a deploy that has gone
              // came back as index.html with a 200, and that HTML was cached
              // under the script's name for good.
              const type = res.headers.get('content-type') || '';
              if (res.ok && /javascript|font|image|css|json|octet-stream/i.test(type)) cache.put(req, res.clone()).catch(() => undefined);
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
