const CACHE = 'km-cache-v4';
const URLS = [
  '/skill-graph/',
  '/skill-graph/index.html',
  '/skill-graph/404.html',
  '/skill-graph/manifest.json',
  '/skill-graph/app.js',
  '/skill-graph/style.css',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE).map(k => caches.delete(k))
    ))
  );
});

self.addEventListener('fetch', e => {
  // Network-first for HTML/JS/CSS to always get latest
  if (e.request.destination === 'document' || e.request.destination === 'script' || e.request.destination === 'style') {
    e.respondWith(
      fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(cache => cache.put(e.request, clone));
        return res;
      }).catch(() => caches.match(e.request).then(cached => cached || caches.match('/skill-graph/')))
    );
    return;
  }
  // Cache-first for other assets
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match('/skill-graph/'));
    })
  );
});
