const CACHE='atlas-dayline-i-v6';
const ASSETS=['./','./index.html','./app.css','./app.js','./field-bridge.js','./manifest.webmanifest','./icon.svg'];
const LIVE_TRUTH=new Set(['/control/CURRENT.json','/control/WAITING.json','/showcase-manifest.json']);
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const url=new URL(event.request.url);
 if(url.origin===self.location.origin&&LIVE_TRUTH.has(url.pathname)){event.respondWith(fetch(event.request));return}
 event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request).then(resp=>{const copy=resp.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return resp}).catch(()=>caches.match('./index.html'))))
});
