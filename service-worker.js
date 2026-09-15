const CACHE='au-quotation-v22';
const ASSETS=[
  './',
  './index.html',
  './manifest.webmanifest',
  './header_1.txt',
  './interface-polish.css',
  './automotive-dictionary.js',
  './online-storage.js',
  './automotive-dictionary-core.js',
  './item-menu.js',
  './item-drag-drop.js',
  './typography-uppercase.js',
  './section-discount-menu.js',
  './memory-sanitizer.js',
  './discount-preview.js',
  './service-qty-display.js',
  './quantity-rules.js',
  './preview-editor.js',
  './pricing-integrity.js',
  './calculation-audit.js',
  './history-enhancements.js',
  './history-spacing-polish.js',
  './quotation-audit.js',
  './startup-fresh-quote.js',
  './quote-workflow.js',
  './history-autofill-replace.js',
  './history-tools.js',
  './unsaved-protection.js',
  './cloud-record-integrity.js',
  './history-permanent-delete.js',
  './ui-workspace-v1.js',
  './quotation-actions-collapse.js',
  './section-summary-auto.js',
  './ui-topbar-v2.js',
  './remarks-rich-format.js',
  './remarks-private-settlement.js',
  './quotation-readability.js',
  './pdf-customer-vehicle-layout.js',
  './history-doubleclick.js',
  './quotation-footer.js',
  './pdf-quality.js',
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

  // Navigations remain network-first so a newly deployed index/loader is picked up quickly.
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

  // Static app files are served immediately from cache. A background request refreshes
  // the cached copy without making the user wait on the network for every module.
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
