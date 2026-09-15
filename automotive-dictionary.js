// Alan's United Auto runtime bootstrap.
// The base page contains the current UI directly. Only active feature modules are loaded
// at startup; History-only modules are fetched on demand when History is opened.
(function(){
  function loadOrdered(sources){
    return Promise.all(sources.map(src=>new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src=src;
      script.async=false;
      script.onload=()=>resolve(src);
      script.onerror=()=>reject(new Error(`Unable to load ${src}`));
      document.head.appendChild(script);
    })));
  }

  function captureLocalPdfGenerator(){
    if(typeof window.makePdfBlob==='function'&&!window.__auaBaseMakePdfBlob)window.__auaBaseMakePdfBlob=window.makePdfBlob;
  }
  function blockLegacyAutoMigration(){
    if(typeof window.getRecent!=='function'||window.getRecent.__auaNoAutoMigration)return;
    const baseGetRecent=window.getRecent;
    window.getRecent=function(){
      const list=baseGetRecent.apply(this,arguments);
      try{if(String(new Error().stack||'').includes('migrateLocal'))return []}catch{}
      return list;
    };
    window.getRecent.__auaNoAutoMigration=true;
  }
  function blockBackgroundPersistence(){
    if(typeof window.saveRecent==='function')window.saveRecent=function(){return false};
    if(typeof window.__auaBaseMakePdfBlob==='function')window.makePdfBlob=window.__auaBaseMakePdfBlob;
  }
  function cleanupLegacyState(){
    try{['aua_quote_autodraft_v1','auaQuoteRevisionsV1','auaVehicleMemoryV1'].forEach(key=>localStorage.removeItem(key))}catch{}
  }
  function disableCustomerVehicleHistory(){
    ['customer','phone','vehicle','mileage','model'].forEach(id=>{
      const el=document.getElementById(id);if(!el)return;
      el.setAttribute('autocomplete','off');
      el.setAttribute('autocorrect','off');
      el.setAttribute('autocapitalize',id==='vehicle'?'characters':'off');
    });
  }
  function startupGuards(){
    captureLocalPdfGenerator();
    blockLegacyAutoMigration();
    cleanupLegacyState();
    disableCustomerVehicleHistory();
    setTimeout(blockBackgroundPersistence,0);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startupGuards,{once:true});
  else startupGuards();

  const coreModules=[
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

  const historyModules=[
    './history-enhancements.js',
    './history-spacing-polish.js',
    './history-tools.js',
    './history-permanent-delete.js',
    './history-doubleclick.js'
  ];
  let historyPromise=null;

  window.auaOpenHistory=async function(){
    if(!historyPromise)historyPromise=loadOrdered(historyModules).catch(error=>{historyPromise=null;throw error});
    try{
      await historyPromise;
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      document.getElementById('cloudRecordsTab')?.click();
    }catch(error){
      console.error('History could not load',error);
      alert('History could not load. Please refresh and try again.');
    }
  };

  loadOrdered(coreModules).catch(error=>console.error('Quotation runtime failed to initialise',error));

  // Register after the page has loaded so service-worker setup never blocks first paint.
  if('serviceWorker' in navigator){
    window.addEventListener('load',()=>{
      navigator.serviceWorker.register('./service-worker.js').catch(error=>console.warn('Offline cache unavailable',error));
    },{once:true});
  }
})();
