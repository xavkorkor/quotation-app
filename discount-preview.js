// Alan's United Auto - make discounts explicit on the quotation preview/PDF.
(function(){
  function money(n){return Number(n||0).toLocaleString('en-SG',{minimumFractionDigits:2,maximumFractionDigits:2})}
  function label(type,value,amount){
    const v=Number(value||0),a=Number(amount||0);
    if(!(a>0)) return '';
    return type==='percent' ? `DISCOUNT (${v}%): -S$ ${money(a)}` : `DISCOUNT: -S$ ${money(a)}`;
  }
  function refresh(){
    if(!window.S) return;
    // Section discount rows generated in preview.
    const cards=[...document.querySelectorAll('#psecs .secprint')];
    S.forEach((sec,i)=>{
      const card=cards[i]; if(!card)return;
      const row=[...card.querySelectorAll('.adjust')].find(x=>/discount/i.test(x.textContent||''));
      if(!row)return;
      const gross=(sec.items||[]).reduce((sum,x)=>{if(x.included)return sum;const q=parseFloat(x.q)||1,p=Number(x.p)||0;const base=q*p;const id=typeof disc==='function'?disc(base,x.dt,x.dv):0;return sum+Math.max(0,base-id)},0);
      const amt=typeof disc==='function'?disc(gross,sec.dt,sec.dv):0;
      const spans=row.children;
      if(spans[0])spans[0].textContent=sec.dt==='percent'?`SECTION DISCOUNT (${Number(sec.dv||0)}%)`:'SECTION DISCOUNT';
      if(spans[1])spans[1].textContent=`-S$ ${money(amt)}`;
    });
    // Overall discount row.
    const row=document.getElementById('overallRow'),amtEl=document.getElementById('overallAmt');
    if(row&&row.style.display!=='none'&&amtEl){
      const t=typeof totals==='function'?totals():null;
      const amount=Number(t?.overallDiscount ?? t?.overall ?? t?.od ?? 0) || Math.max(0,Number(String(amtEl.textContent||'').replace(/[^0-9.-]/g,''))||0);
      const name=row.querySelector('span:first-child');
      if(name)name.textContent=document.getElementById('overallType')?.value==='percent'?`Overall Discount (${Number(document.getElementById('overallDisc')?.value||0)}%)`:'Overall Discount';
      if(amount>0)amtEl.textContent=`-S$ ${money(amount)}`;
    }
  }
  function install(){
    refresh();
    const target=document.querySelector('.paper')||document.body;
    new MutationObserver(()=>requestAnimationFrame(refresh)).observe(target,{childList:true,subtree:true,characterData:true});
    document.addEventListener('change',e=>{if(e.target.closest('.disc,.item-disc'))setTimeout(refresh,0)});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,450));else setTimeout(install,450);
})();