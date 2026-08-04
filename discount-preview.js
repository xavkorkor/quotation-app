// Alan's United Auto - explicit item/section/overall discount display in preview/PDF and section summary.
(function(){
  let refreshing=false;
  function money(n){return Number(n||0).toLocaleString('en-SG',{minimumFractionDigits:2,maximumFractionDigits:2})}
  function refresh(){
    if(refreshing)return;refreshing=true;
    try{
      const cards=[...document.querySelectorAll('#psecs .secprint')];
      S.forEach((sec,i)=>{
        const card=cards[i];if(!card)return;

        // Per-item discount note beside description.
        const lines=[...card.querySelectorAll('.line')];
        (sec.items||[]).forEach((item,j)=>{
          const line=lines[j];if(!line)return;
          const desc=line.children[1];if(!desc)return;
          let base=desc.dataset.auaBaseDesc;
          if(!base){base=(desc.textContent||'').replace(/\s*\([^)]*discount\)\s*$/i,'').trim();desc.dataset.auaBaseDesc=base}
          const v=Number(item.dv||0);
          if(v>0&&!item.included){
            desc.textContent=item.dt==='percent' ? `${base} (${v}% DISCOUNT)` : `${base} (S$ ${money(v)} DISCOUNT)`;
          }else desc.textContent=base;
        });

        // Section discount label.
        const row=[...card.querySelectorAll('.adjust')].find(x=>/section discount/i.test(x.textContent||''));
        if(row){
          const value=Number(sec.dv||0),spans=row.children;
          if(spans[0])spans[0].textContent=sec.dt==='percent'&&value>0?`SECTION DISCOUNT (${value}%)`:'SECTION DISCOUNT';
          if(spans[1]&&spans[1].textContent){const n=Math.abs(Number(String(spans[1].textContent).replace(/[^0-9.-]/g,''))||0);if(n>0)spans[1].textContent=`- S$ ${money(n)}`}
        }
      });

      // Section summary discount note.
      const summary=document.getElementById('summaryBox');
      if(summary){
        const rows=[...summary.querySelectorAll('.summary-row')].filter(r=>!r.classList.contains('summary-total'));
        rows.forEach((r,i)=>{
          const sec=S[i],name=r.children[0];if(!sec||!name)return;
          let base=name.dataset.auaBaseTitle;
          if(!base){base=(name.textContent||'').replace(/\s*\([^)]*discount\)\s*$/i,'').trim();name.dataset.auaBaseTitle=base}
          const v=Number(sec.dv||0);
          if(v>0){name.textContent=sec.dt==='percent'?`${base} (${v}% DISCOUNT)`:`${base} (S$ ${money(v)} DISCOUNT)`}else name.textContent=base;
        });
      }

      const overallRow=document.getElementById('overallRow'),amtEl=document.getElementById('overallAmt');
      if(overallRow&&overallRow.style.display!=='none'&&amtEl){
        const type=document.getElementById('overallType')?.value,value=Number(document.getElementById('overallDisc')?.value||0),name=overallRow.querySelector('span:first-child');
        if(name)name.textContent=type==='percent'&&value>0?`Overall Discount (${value}%)`:'Overall Discount';
      }
    }catch(e){console.error('Discount preview refresh failed',e)}finally{refreshing=false}
  }
  function install(){
    if(typeof window.upd==='function'&&!window.__auaDiscountPreviewPatched){window.__auaDiscountPreviewPatched=true;const old=window.upd;window.upd=function(){const r=old.apply(this,arguments);requestAnimationFrame(refresh);return r}}
    refresh();
    document.addEventListener('input',e=>{if(e.target.closest('.disc,.item-disc'))setTimeout(refresh,0)});
    document.addEventListener('change',e=>{if(e.target.closest('.disc,.item-disc'))setTimeout(refresh,0)});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,450));else setTimeout(install,450);
})();