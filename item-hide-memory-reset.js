// Alan's United Auto - restore per-item Hide/Show and clear test smart-memory once.
(function(){
  const RESET_FLAG='auaSmartMemoryReset_2026_08_04_v1';
  let busy=false;

  function oneTimeMemoryReset(){
    if(localStorage.getItem(RESET_FLAG)==='1') return;
    // Clear only learned/testing memory. Preserve recent quotations and saved revision history.
    ['auaItemMemoryV2','auaItemMetaV1','auaVehicleMemoryV1'].forEach(k=>localStorage.removeItem(k));
    localStorage.setItem(RESET_FLAG,'1');
    try{ if(typeof refreshMemory==='function') refreshMemory(); }catch{}
  }

  function ensureHiddenState(){
    try{S.forEach(sec=>sec.items.forEach(x=>{if(typeof x.hidden!=='boolean')x.hidden=false}))}catch{}
  }

  function toggleHide(i,j){
    if(!S?.[i]?.items?.[j])return;
    S[i].items[j].hidden=!S[i].items[j].hidden;
    try{render();upd()}catch{}
  }
  window.toggleHideItem=toggleHide;

  function injectStyle(){
    if(document.getElementById('auaHideItemStyles'))return;
    const s=document.createElement('style');s.id='auaHideItemStyles';s.textContent=`
      .item.aua-hidden-item{opacity:.58;background:#f8fafc;border-style:dashed}
      .item.aua-hidden-item .item-main{filter:grayscale(.2)}
      .aua-hide-btn{background:#eef2f7!important;color:#475569!important}
      .aua-hide-btn.is-hidden{background:#e2e8f0!important;color:#0f172a!important;font-weight:800}
      .aua-hidden-badge{font-size:10px;font-weight:800;color:#64748b;margin-left:4px;padding:3px 6px;border-radius:999px;background:#e2e8f0}
    `;document.head.appendChild(s);
  }

  function decorateItems(){
    ensureHiddenState();
    document.querySelectorAll('.section-card').forEach((card,i)=>{
      card.querySelectorAll('.item').forEach((row,j)=>{
        const x=S?.[i]?.items?.[j];if(!x)return;
        row.classList.toggle('aua-hidden-item',!!x.hidden);
        const actions=row.querySelector('.item-actions');
        if(actions && !actions.querySelector('.aua-hide-btn')){
          const b=document.createElement('button');b.type='button';b.className='btn aua-hide-btn';
          b.onclick=e=>{e.preventDefault();e.stopPropagation();toggleHide(i,j)};
          actions.appendChild(b);
        }
        const b=actions?.querySelector('.aua-hide-btn');if(b){b.textContent=x.hidden?'Show Item':'Hide Item';b.classList.toggle('is-hidden',!!x.hidden)}
        let badge=row.querySelector('.aua-hidden-badge');
        if(x.hidden&&!badge){badge=document.createElement('span');badge.className='aua-hidden-badge';badge.textContent='HIDDEN';row.querySelector('.item-main')?.appendChild(badge)}
        if(!x.hidden&&badge)badge.remove();
      });
    });
  }

  function patchTotals(){
    if(window.__auaHideTotalsPatched||typeof window.totals!=='function')return;
    window.__auaHideTotalsPatched=true;
    const original=window.totals;
    window.totals=function(){
      // Temporarily mark hidden lines as Included for the original calculator, then restore.
      const touched=[];
      try{S.forEach(sec=>sec.items.forEach(x=>{if(x.hidden){touched.push([x,x.included]);x.included=true}}));return original.apply(this,arguments)}
      finally{touched.forEach(([x,v])=>x.included=v)}
    };
  }

  function patchPreview(){
    if(window.__auaHideUpdPatched||typeof window.upd!=='function')return;
    window.__auaHideUpdPatched=true;
    const original=window.upd;
    window.upd=function(){
      const result=original.apply(this,arguments);
      // Remove hidden editor items from the printed/PDF preview only.
      try{
        const cards=[...document.querySelectorAll('.section-card')];
        const printSecs=[...document.querySelectorAll('#psecs .secprint')];
        S.forEach((sec,si)=>{
          const lines=printSecs[si]?[...printSecs[si].querySelectorAll('.line')]:[];
          sec.items.forEach((x,ii)=>{if(x.hidden&&lines[ii])lines[ii].style.display='none'});
        });
      }catch{}
      return result;
    };
  }

  function patchState(){
    // Existing state() already serializes S, so hidden is preserved automatically.
  }

  function apply(){
    if(busy)return;busy=true;requestAnimationFrame(()=>{decorateItems();busy=false});
  }

  function install(){
    oneTimeMemoryReset();injectStyle();patchTotals();patchPreview();patchState();apply();
    const target=document.getElementById('sections')||document.body;
    new MutationObserver(apply).observe(target,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,250));else setTimeout(install,250);
})();