// Alan's United Auto - service lines do not display quantity on quotation/PDF.
(function(){
  const NO_QTY=/labou?r|workmanship|diagnos|inspection fee|outside service|program|coding|calibrat|road test|service charge/i;
  let busy=false;
  function refresh(){
    if(busy)return;busy=true;
    requestAnimationFrame(()=>{
      try{
        const cards=[...document.querySelectorAll('#psecs .secprint')];
        cards.forEach((card,si)=>{
          const sec=typeof S!=='undefined'?S[si]:null;if(!sec)return;
          const lines=[...card.querySelectorAll('.line')];
          (sec.items||[]).forEach((item,ii)=>{
            const line=lines[ii];if(!line)return;
            const qty=line.children[0];
            if(qty&&NO_QTY.test(String(item.d||'')))qty.textContent='';
          });
        });
      }catch(e){console.error('Service quantity display failed',e)}finally{busy=false}
    });
  }
  function install(){
    if(typeof window.upd==='function'&&!window.__auaServiceQtyPatched){window.__auaServiceQtyPatched=true;const old=window.upd;window.upd=function(){const r=old.apply(this,arguments);setTimeout(refresh,0);return r}}
    refresh();
    const target=document.querySelector('.paper')||document.body;
    new MutationObserver(refresh).observe(target,{childList:true,subtree:true,characterData:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,520));else setTimeout(install,520);
})();