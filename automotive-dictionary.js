// Loader for Alan's United Auto automotive intelligence.
(function(){
  function load(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=reject;document.head.appendChild(s)})}
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
    .catch(err=>console.error('Automotive intelligence failed to load',err));
})();