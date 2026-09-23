const CACHE='au-quotation-v50';

// Normal quotation startup uses compact production bundles.
// History executes on demand; its assets remain available in the offline cache.
const ASSETS=[
  './',
  './index.html',
  './manifest.webmanifest',
  './header_1.txt',
  './interface-polish.css',
  './visual-refresh-v47.css',
  './light-theme-v48.css',
  './automotive-dictionary.js',
  './app-core.js',
  './workflow-suite.js',
  './cloud-workshop-data.js',
  './operations-suite.js',
  './workspace-v46.js',
  './uppercase-pdf-v49.js',
  './system-health.js',
  './online-storage.js',
  './history-enhancements.js',
  './history-spacing-polish.js',
  './history-tools.js',
  './history-permanent-delete.js',
  './history-doubleclick.js'
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
      if(cached)return cached;
      return fetch(request).then(response=>{
        if(response&&response.ok){
          const copy=response.clone();
          caches.open(CACHE).then(cache=>cache.put(request,copy));
        }
        return response;
      });
    })
  );
});