const CACHE='au-quotation-v30';

// Normal quotation startup uses compact production bundles.
// History files remain on-demand and are cached after first use.
const ASSETS=[
  './',
  './index.html',
  './manifest.webmanifest',
  './header_1.txt',
  './interface-polish.css',
  './automotive-dictionary.js',
  './app-core.js',
  './workflow-suite.js',
  './cloud-workshop-data.js',
  './online-storage.js'
];

self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));
});

self.addEventListener('activate',event=>{
  event.waitUntil(Promise.all([
    caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))),
    self.clients.claim()
  ]));
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;

  if(request.mode==='navigate'){
    event.respondWith(
      fetch(request).then(response=>{
        const copy=response.clone();
        caches.open(CACHE).then(cache=>cache.put(request,copy));
        return response;
      }).catch(()=>caches.match(request).then(cached=>cached||caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached=>{
      const refresh=fetch(request).then(response=>{
        if(response&&response.ok){
          const copy=response.clone();
          caches.open(CACHE).then(cache=>cache.put(request,copy));
        }
        return response;
      }).catch(()=>cached);
      return cached||refresh;
    })
  );
});
