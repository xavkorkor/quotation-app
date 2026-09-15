// Alan's United Auto runtime bootstrap.
// Current modules download in parallel but execute in a fixed order. The workspace stays
// hidden until the current UI is ready, preventing the legacy/base interface from flashing.
(function(){
  const root=document.documentElement;
  const startedAt=performance.now();

  root.classList.add('aua-runtime-booting');

  const bootStyle=document.createElement('style');
  bootStyle.id='auaRuntimeBootStyle';
  bootStyle.textContent=`
    html.aua-runtime-booting body{overflow:hidden}
    html.aua-runtime-booting .app{visibility:hidden!important}
    html.aua-runtime-booting body::after{
      content:'Loading quotation workspace…';
      position:fixed;
      inset:0;
      z-index:999999;
      display:grid;
      place-items:center;
      background:#f3f6fa;
      color:#64748b;
      font:700 12px/1.4 Arial,Helvetica,sans-serif;
      letter-spacing:.035em;
    }
    html.aua-runtime-ready .app{visibility:visible}
  `;
  document.head.appendChild(bootStyle);

  function domReady(){
    if(document.readyState!=='loading')return Promise.resolve();
    return new Promise(resolve=>document.addEventListener('DOMContentLoaded',resolve,{once:true}));
  }

  // Dynamic classic scripts marked async=false retain insertion/execution order while the
  // browser is free to fetch them concurrently. This removes the previous network waterfall.
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
      try{
        if(String(new Error().stack||'').includes('migrateLocal'))return [];
      }catch{}
      return list;
    };
    window.getRecent.__auaNoAutoMigration=true;
  }

  function blockBackgroundPersistence(){
    if(typeof window.saveRecent==='function')window.saveRecent=function(){return false};
    if(typeof window.__auaBaseMakePdfBlob==='function')window.makePdfBlob=window.__auaBaseMakePdfBlob;
  }

  function cleanupLegacyState(){
    try{
      ['aua_quote_autodraft_v1','auaQuoteRevisionsV1','auaVehicleMemoryV1'].forEach(key=>localStorage.removeItem(key));
    }catch{}
  }

  function disableCustomerVehicleHistory(){
    ['customer','phone','vehicle','mileage','model'].forEach(id=>{
      const el=document.getElementById(id);
      if(!el)return;
      el.setAttribute('autocomplete','off');
      el.setAttribute('autocorrect','off');
      el.setAttribute('autocapitalize',id==='vehicle'?'characters':'off');
    });
  }

  const modules=[
    './automotive-dictionary-core.js',
    // section-layout.js intentionally retired: the current section/action UI supersedes it.
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

  const ready=domReady();
  const scriptsReady=loadOrdered(modules);

  ready.then(()=>{
    captureLocalPdfGenerator();
    blockLegacyAutoMigration();
    cleanupLegacyState();
    disableCustomerVehicleHistory();
    setTimeout(blockBackgroundPersistence,0);
  });

  function currentWorkspaceReady(){
    if(root.classList.contains('cloud-auth-gate'))return !!document.getElementById('cloudPanel');
    const firstItem=document.querySelector('#sections .item');
    return !!(
      document.getElementById('auaWorkspaceHeader')&&
      document.getElementById('auaActionToggle')&&
      document.getElementById('auaAddSectionTop')&&
      (!firstItem||firstItem.querySelector('.aua-item-options'))&&
      (!firstItem||firstItem.querySelector('.aua-item-drag-handle'))
    );
  }

  function waitForCurrentWorkspace(){
    return new Promise(resolve=>{
      const tick=()=>{
        const elapsed=performance.now()-startedAt;
        // Allow the signed-in session a short period to resolve before deciding that the
        // login screen is the final current UI. Current workspace modules have small
        // DOM-ready installers, so 1.2 s is a conservative fallback rather than a delay.
        if(currentWorkspaceReady()&&(!root.classList.contains('cloud-auth-gate')||elapsed>=420))return resolve();
        if(elapsed>=1200)return resolve();
        requestAnimationFrame(tick);
      };
      tick();
    });
  }

  function reveal(){
    root.classList.remove('aua-runtime-booting');
    root.classList.add('aua-runtime-ready');
  }

  Promise.all([ready,scriptsReady])
    .then(waitForCurrentWorkspace)
    .then(reveal)
    .catch(error=>{
      console.error('Quotation runtime failed to initialise',error);
      // Never leave the app permanently hidden if one optional enhancement fails.
      reveal();
    });
})();