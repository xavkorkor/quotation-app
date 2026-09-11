// Loader for Alan's United Auto automotive intelligence.
(function(){
  function load(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=reject;document.head.appendChild(s)})}
  function prepareRecentForLegacySync(){
    const key='auaRecentQuotesV1';
    try{
      const list=JSON.parse(localStorage.getItem(key)||'[]');
      if(!Array.isArray(list)||list.length<2)return;
      const seen=new Set(),deduped=[];
      list.slice().sort((a,b)=>Number(b?.ts||0)-Number(a?.ts||0)).forEach(record=>{
        const d=record?.data||{},vehicle=String(d.vehicle||'').trim().toLowerCase(),customer=String(d.customer||'').trim().toLowerCase();
        const legacy=vehicle?`${customer}|${vehicle}`:`${customer}|${String(d.date||'').trim().toLowerCase()}`;
        if(seen.has(legacy))return;
        seen.add(legacy);deduped.push(record);
      });
      if(deduped.length!==list.length)localStorage.setItem(key,JSON.stringify(deduped));
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
  prepareRecentForLegacySync();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',disableCustomerVehicleHistory);
  else disableCustomerVehicleHistory();
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
    .catch(err=>console.error('Automotive intelligence failed to load',err));
})();