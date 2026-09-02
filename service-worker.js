const CACHE_NAME='etf-core-v8-3-compact-dates-final-20260902';
const APP=['./','./index.html','./cloud-sync.js','./firebase-config.js','./README_FINAL.txt'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(APP)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE_NAME).then(c=>c.put(e.request,copy));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))))});
