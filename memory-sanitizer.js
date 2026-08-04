// Alan's United Auto - hard reset old test description memory once, then only retain sensible future item descriptions.
(function(){
  const MEM='auaItemMemoryV2', META='auaItemMetaV1', RESET='auaDescriptionMemoryHardReset_2026_08_04_v2';

  function clean(v){return String(v||'').replace(/\s+/g,' ').trim().toUpperCase()}
  function valid(v){
    const d=clean(v);
    if(!d || d.length<4 || d.length>100) return false;
    if(!/[A-Z]/.test(d)) return false;
    if(/^\d+(?:[.,]\d+)?$/.test(d)) return false;
    if(/^(TEST(?:ING)?|ABC(?:D)?|ASD(?:F)?|QWERTY|XXX+|ZZZ+|AAAA+|BBBB+|ITEMS?|PARTS?|DESCRIPTION|DESC|PRICE|AMOUNT|NIL|NONE|NA|N\/A|TBC|TBA|OK|YES|NO)$/i.test(d)) return false;
    if(/^(.)\1{2,}$/i.test(d)) return false;
    const letters=(d.match(/[A-Z]/g)||[]).length;
    if(letters<3) return false;
    const tokens=d.split(/\s+/).filter(Boolean);
    // Reject obvious typing fragments / gibberish consisting only of very short meaningless tokens.
    if(tokens.length===1 && /^[A-Z]{1,3}$/.test(tokens[0])) return false;
    if(tokens.every(t=>/^[A-Z]{1,2}$/.test(t))) return false;
    if((d.match(/[^A-Z0-9 .,+\-/()&]/g)||[]).length>2) return false;
    return true;
  }

  function hardResetOnce(){
    if(localStorage.getItem(RESET)==='1') return;
    // User requested removal of all existing redundant/test description memory. Start item memory fresh.
    localStorage.removeItem(MEM);
    localStorage.removeItem(META);
    localStorage.setItem(RESET,'1');
    try{ if(typeof refreshMemory==='function') refreshMemory(); }catch{}
  }

  function sanitizeStore(){
    try{
      const raw=JSON.parse(localStorage.getItem(MEM)||'{}'), out={};
      Object.entries(raw).forEach(([k,v])=>{const d=clean(k);if(valid(d))out[d]=v});
      localStorage.setItem(MEM,JSON.stringify(out));
    }catch{localStorage.setItem(MEM,'{}')}
    try{
      const raw=JSON.parse(localStorage.getItem(META)||'{}'), out={};
      Object.entries(raw).forEach(([k,v])=>{const d=clean(v?.description||k);if(valid(d)){v.description=d;out[d.toLowerCase()]=v}});
      localStorage.setItem(META,JSON.stringify(out));
    }catch{localStorage.setItem(META,'{}')}
  }

  function patchRemember(){
    if(window.__auaMemorySanitized || typeof window.rememberItem!=='function') return;
    window.__auaMemorySanitized=true;
    const old=window.rememberItem;
    window.rememberItem=function(x){
      const d=clean(x?.d);
      if(!valid(d)) return;
      const copy=Object.assign({},x,{d});
      const r=old.call(this,copy);
      sanitizeStore();
      return r;
    };
  }

  function cleanDatalist(){
    const dl=document.getElementById('itemMemoryList');if(!dl)return;
    [...dl.options].forEach(o=>{if(!valid(o.value))o.remove()});
  }

  function install(){
    hardResetOnce();sanitizeStore();patchRemember();
    try{if(typeof refreshMemory==='function')refreshMemory()}catch{}
    cleanDatalist();
    new MutationObserver(cleanDatalist).observe(document.getElementById('itemMemoryList')||document.body,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,420));else setTimeout(install,420);
})();