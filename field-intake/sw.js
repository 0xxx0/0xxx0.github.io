const CACHE = 'poly-field-intake-v04';
const ASSETS = ["./", "./index.html", "./app.css", "./core-1.js", "./core-2.js", "./core-3.js", "./core-4a.js", "./core-4b.js", "./app-1a.js", "./app-1b.js", "./app-2.js", "./app-3.js", "./app-4.js", "./app-5.js", "./manifest.webmanifest", "./icon.svg"];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('poly-field-intake-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    const copy = response.clone();
    caches.open(CACHE).then(cache => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match('./index.html'))));
});