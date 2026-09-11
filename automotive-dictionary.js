// Loader for Alan's United Auto automotive intelligence.
(function(){
  function load(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=reject;document.head.appendChild(s)})}
  function disableCustomerVehicleHistory(){
    ['customer','phone','vehicle','mileage','model'].forEach(id=>{
      const el=document.getElementById(id);
      if(!el)return;
      el.setAttribute('autocomplete','off');
      el.setAttribute('autocorrect','off');
      el.setAttribute('autocapitalize',id==='vehicle'?'characters':'off');
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',disableCustomerVehicleHistory);
  else disableCustomerVehicleHistory();
  load('./automotive-dictionary-core.js')
    .then(()=>load('./scan-rules.js'))
    .then(()=>load('./collated-list.js'))
    .then(()=>load('./section-layout.js'))
    .then(()=>load('./upgrade-suite.js'))
    .then(()=>load('./item-menu.js'))
    .then(()=>load('./typography-uppercase.js'))
    .then(()=>load('./section-discount-menu.js'))
    .then(()=>load('./memory-sanitizer.js'))
    .then(()=>load('./discount-preview.js'))
    .then(()=>load('./service-qty-display.js'))
    .then(()=>load('./preview-editor.js'))
    .then(()=>load('./collated-input-safeguard.js'))
    .then(()=>load('./workflow-upgrades.js'))
    .then(()=>load('./voice-quote.js'))
    .then(()=>load('./pricing-integrity.js'))
    .then(()=>load('./calculation-audit.js'))
    .then(()=>load('./history-enhancements.js'))
    .catch(err=>console.error('Automotive intelligence failed to load',err));
})();