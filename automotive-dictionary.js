// Loader for Alan's United Auto automotive intelligence.
(function(){
  function load(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=reject;document.head.appendChild(s)})}
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
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>{
      captureLocalPdfGenerator();
      blockLegacyAutoMigration();
      cleanupLegacyState();
      setTimeout(blockBackgroundPersistence,0);
    },{once:true});
    document.addEventListener('DOMContentLoaded',disableCustomerVehicleHistory);
  }else{
    captureLocalPdfGenerator();
    blockLegacyAutoMigration();
    cleanupLegacyState();
    blockBackgroundPersistence();
    disableCustomerVehicleHistory();
  }
  load('./automotive-dictionary-core.js')
    .then(()=>load('./section-layout.js'))
    .then(()=>load('./item-menu.js'))
    .then(()=>load('./typography-uppercase.js'))
    .then(()=>load('./section-discount-menu.js'))
    .then(()=>load('./memory-sanitizer.js'))
    .then(()=>load('./discount-preview.js'))
    .then(()=>load('./service-qty-display.js'))
    .then(()=>load('./preview-editor.js'))
    .then(()=>load('./pricing-integrity.js'))
    .then(()=>load('./calculation-audit.js'))
    .then(()=>load('./history-enhancements.js'))
    .then(()=>load('./history-spacing-polish.js'))
    .then(()=>load('./quotation-audit.js'))
    .then(()=>load('./startup-fresh-quote.js'))
    .then(()=>load('./quote-workflow.js'))
    .then(()=>load('./history-tools.js'))
    .then(()=>load('./unsaved-protection.js'))
    .then(()=>load('./cloud-record-integrity.js'))
    .then(()=>load('./history-permanent-delete.js'))
    .then(()=>load('./ui-workspace-v1.js'))
    .then(()=>load('./customer-vehicle-layout.js'))
    .then(()=>load('./ui-topbar-v2.js'))
    .then(()=>load('./remarks-rich-format.js'))
    .then(()=>load('./remarks-private-settlement.js'))
    .then(()=>load('./quotation-readability.js'))
    .then(()=>load('./history-doubleclick.js'))
    .then(()=>load('./quotation-footer.js'))
    .then(()=>load('./pdf-quality.js'))
    .then(()=>load('./whatsapp-share-fix.js'))
    .catch(err=>console.error('Automotive intelligence failed to load',err));
})();