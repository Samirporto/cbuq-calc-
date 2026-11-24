const cachePrefix = 'pavcalc:' + self.registration.scope + ':';
const cacheName = cachePrefix + '2.4';
const assets = ['./', './index.html', './manifest.json', './icon.png', './icon512.png'];
const urls = new Set(assets.map(path => new URL(path, self.registration.scope).href));

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    await cache.addAll(assets.map(path => new Request(path, {cache:'reload'})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith(cachePrefix) && key !== cacheName) await caches.delete(key);
      if (['pavcalc-v23','pavcalc-v22','pavcalc-v21','pavcalc-v2','cbuq-v1'].includes(key)) {
        const legacy = await caches.open(key);
        for (const request of await legacy.keys()) {
          if (urls.has(request.url)) await legacy.delete(request);
        }
        if (!(await legacy.keys()).length) await caches.delete(key);
      }
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || !url.href.startsWith(self.registration.scope)) return;
  if (request.mode !== 'navigate' && !urls.has(url.href)) return;
  event.respondWith((async () => {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request, {ignoreSearch:request.mode === 'navigate'});
    if (cached) return cached;
    try {
      return await fetch(request);
    } catch (error) {
      if (request.mode === 'navigate') return (await cache.match('./index.html')) || Response.error();
      throw error;
    }
  })());
});
