// Alan's United Auto - make discounts explicit on the quotation preview/PDF.
(function(){
  let refreshing=false;
  function money(n){return Number(n||0).toLocaleString('en-SG',{minimumFractionDigits:2,maximumFractionDigits:2})}
  function refresh(){
    if(refreshing)return;refreshing=true;
    try{
      // S is a global lexical binding from index.html; access it directly rather than window.S.
      const cards=[...document.querySelectorAll('#psecs .secprint')];
      S.forEach((sec,i)=>{
        const card=cards[i];if(!card)return;
        const row=[...card.querySelectorAll('.adjust')].find(x=>/section discount/i.test(x.textContent||''));
        if(!row)return;
        const value=Number(sec.dv||0);
        const spans=row.children;
        if(spans[0])spans[0].textContent=sec.dt==='percent'&&value>0?`SECTION DISCOUNT (${value}%)`:'SECTION DISCOUNT';
        // Keep the amount calculated by the main app; only normalize spacing/prefix.
        if(spans[1]&&spans[1].textContent){
          const n=Math.abs(Number(String(spans[1].textContent).replace(/[^0-9.-]/g,''))||0);
          if(n>0)spans[1].textContent=`- S$ ${money(n)}`;
        }
      });
      const row=document.getElementById('overallRow'),amtEl=document.getElementById('overallAmt');
      if(row&&row.style.display!=='none'&&amtEl){
        const type=document.getElementById('overallType')?.value,value=Number(document.getElementById('overallDisc')?.value||0),name=row.querySelector('span:first-child');
        if(name)name.textContent=type==='percent'&&value>0?`Overall Discount (${value}%)`:'Overall Discount';
      }
    }catch(e){console.error('Discount preview refresh failed',e)}finally{refreshing=false}
  }
  function install(){
    // Run after every normal preview update so the app cannot overwrite the percentage label.
    if(typeof window.upd==='function'&&!window.__auaDiscountPreviewPatched){
      window.__auaDiscountPreviewPatched=true;
      const old=window.upd;
      window.upd=function(){const r=old.apply(this,arguments);requestAnimationFrame(refresh);return r};
    }
    refresh();
    document.addEventListener('input',e=>{if(e.target.closest('.disc,.item-disc'))setTimeout(refresh,0)});
    document.addEventListener('change',e=>{if(e.target.closest('.disc,.item-disc'))setTimeout(refresh,0)});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,450));else setTimeout(install,450);
})();