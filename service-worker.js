const CACHE='au-quotation-v1';
const ASSETS=['./','./index.html','./manifest.webmanifest','./header_1.txt','./header_2.txt','./header_3.txt','./header_4.txt'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))));
});
self.addEventListener('fetch',event=>{
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).catch(()=>caches.match('./index.html'))));
});
