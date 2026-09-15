const CACHE='au-quotation-v24';

// Only files required for the normal quotation workflow are precached.
// History modules are intentionally omitted and are cached only after History is opened.
const ASSETS=[
  './',
  './index.html',
  './manifest.webmanifest',
  './header_1.txt',
  './interface-polish.css',
  './automotive-dictionary.js',
  './online-storage.js',
  './item-drag-drop.js',
  './typography-uppercase.js',
  './memory-sanitizer.js',
  './discount-preview.js',
  './preview-editor.js',
  './calculation-audit.js',
  './quotation-audit.js',
  './startup-fresh-quote.js',
  './quote-workflow.js',
  './unsaved-protection.js',
  './cloud-record-integrity.js',
  './ui-topbar-v2.js',
  './remarks-rich-format.js',
  './remarks-private-settlement.js',
  './quotation-readability.js',
  './whatsapp-share-fix.js'
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

  // Navigations remain network-first so deployments are picked up promptly.
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

  // Active static files and any on-demand History files become cache-first after first use.
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
