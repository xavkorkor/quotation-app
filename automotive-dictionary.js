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
      setTimeout(blockBackgroundPersistence,0);
    },{once:true});
    document.addEventListener('DOMContentLoaded',disableCustomerVehicleHistory);
  }else{
    captureLocalPdfGenerator();
    blockLegacyAutoMigration();
    blockBackgroundPersistence();
    disableCustomerVehicleHistory();
  }
  load('./automotive-dictionary-core.js')
    .then(()=>load('./section-layout.js'))
    .then(()=>load('./upgrade-suite.js'))
    .then(()=>load('./item-menu.js'))
    .then(()=>load('./typography-uppercase.js'))
    .then(()=>load('./section-discount-menu.js'))
    .then(()=>load('./memory-sanitizer.js'))
    .then(()=>load('./discount-preview.js'))
    .then(()=>load('./service-qty-display.js'))
    .then(()=>load('./preview-editor.js'))
    .then(()=>load('./workflow-upgrades.js'))
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
    .then(()=>load('./ui-topbar-v2.js'))
    .then(()=>load('./remarks-rich-format.js'))
    .catch(err=>console.error('Automotive intelligence failed to load',err));
})();
