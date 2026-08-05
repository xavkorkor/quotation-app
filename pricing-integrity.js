// Alan's United Auto - authoritative pricing integrity layer.
// CORE RULE: if an item has a unit price greater than zero, it MUST contribute to section/subtotal/GST/grand total.
// Qty blank/0 means one charge. A priced line is never excluded merely because it is labour/service or has an included flag.
(function(){
  const NO_QTY=/labou?r|workmanship|diagnos|inspection fee|outside service|program|coding|calibrat|road test|service charge/i;
  const $=id=>document.getElementById(id);
  let busy=false;
  const num=v=>{const n=parseFloat(String(v??'').replace(/[^0-9.-]/g,''));return Number.isFinite(n)?n:0};
  const money=n=>'S$ '+Number(n||0).toLocaleString('en-SG',{minimumFractionDigits:2,maximumFractionDigits:2});
  function discount(base,type,value){const v=Math.max(0,num(value));return Math.min(base,type==='percent'?base*v/100:v)}
  function priceOf(item){return Math.max(0,num(item?.p ?? item?.price ?? item?.unitPrice))}
  function qtyOf(item){const q=num(item?.q ?? item?.qty ?? item?.quantity);return q>0?q:1}
  function itemNet(item){
    if(!item)return 0;
    const price=priceOf(item);
    // Unit price is authoritative. Any priced item is chargeable, regardless of description/type/included state.
    if(price>0){const base=qtyOf(item)*price;return Math.max(0,base-discount(base,item.dt,item.dv))}
    return 0;
  }
  function sectionCalc(sec){const gross=(sec?.items||[]).reduce((s,x)=>s+itemNet(x),0);const d=discount(gross,sec?.dt,sec?.dv);return {gross,discount:d,net:Math.max(0,gross-d)}}
  function getSections(){try{return (typeof S!=='undefined'&&Array.isArray(S))?S:[]}catch{return[]}}
  function updateLines(sections){const cards=[...document.querySelectorAll('#psecs .secprint')];cards.forEach((card,si)=>{const sec=sections[si];if(!sec)return;const lines=[...card.querySelectorAll('.line')];(sec.items||[]).forEach((item,ii)=>{const line=lines[ii];if(!line)return;const cells=[...line.children],price=priceOf(item);if(cells[0]&&NO_QTY.test(String(item.d||item.description||'')))cells[0].textContent='';if(cells[3])cells[3].textContent=price>0?money(itemNet(item)):(item.included?'INCLUDED':money(0));});});}
  function updateMiniTotals(sections){document.querySelectorAll('.section-card').forEach((card,si)=>{const el=card.querySelector('.section-mini-total');if(el&&sections[si])el.textContent=money(sectionCalc(sections[si]).net)});}
  function summaryLabel(sec,calc){let label=String(sec?.title||'SECTION').toUpperCase();const v=num(sec?.dv);if(calc.discount>0){label+=sec?.dt==='percent'?` (${v}% DISCOUNT)`:` (${money(calc.discount)} DISCOUNT)`}return label}
  function updateSummary(sections,calcs,subtotal){const box=$('summaryBox'),on=$('summaryOn');if(!box)return;if(on&&!on.checked){box.style.display='none';box.innerHTML='';return}box.style.display='block';box.innerHTML='<div class="summary-head"><span>SECTION SUMMARY</span><span style="text-align:right">AMOUNT</span></div>'+sections.map((sec,i)=>`<div class="summary-row"><span>${escapeHtml(summaryLabel(sec,calcs[i]))}</span><span style="text-align:right">${money(calcs[i].net)}</span></div>`).join('')+`<div class="summary-row summary-total"><span>TOTAL</span><span style="text-align:right">${money(subtotal)}</span></div>`;}
  function escapeHtml(s){return String(s||'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]))}
  function updateTotals(subtotal){const oType=$('overallType')?.value||'percent',oVal=num($('overallDisc')?.value),oDisc=discount(subtotal,oType,oVal),after=Math.max(0,subtotal-oDisc),gstOn=$('gstOn')?.checked!==false,gst=gstOn?after*.09:0,grand=after+gst;const sub=$('sub'),oa=$('overallAmt'),orow=$('overallRow'),ge=$('gst'),grow=$('gstRow'),gr=$('grand');if(sub)sub.textContent=money(subtotal);if(orow)orow.style.display=oDisc>0?'flex':'none';if(oa)oa.textContent='-S$ '+oDisc.toLocaleString('en-SG',{minimumFractionDigits:2,maximumFractionDigits:2});if(grow)grow.style.display=gstOn?'flex':'none';if(ge)ge.textContent=money(gst);if(gr)gr.textContent=money(grand)}
  function apply(){if(busy)return;busy=true;requestAnimationFrame(()=>{try{const sections=getSections(),calcs=sections.map(sectionCalc),subtotal=calcs.reduce((s,x)=>s+x.net,0);updateLines(sections);updateMiniTotals(sections);updateSummary(sections,calcs,subtotal);updateTotals(subtotal)}catch(e){console.error('Pricing integrity update failed',e)}finally{busy=false}})}
  window.auaPricingApply=apply;
  window.auaItemNet=itemNet;
  window.auaSectionCalc=sectionCalc;
  function install(){apply();document.addEventListener('input',()=>setTimeout(apply,0),true);document.addEventListener('change',()=>setTimeout(apply,0),true);document.addEventListener('blur',()=>setTimeout(apply,0),true);const paper=document.querySelector('.paper')||document.body;new MutationObserver(apply).observe(paper,{childList:true,subtree:true,characterData:true});const sections=$('sections');if(sections)new MutationObserver(apply).observe(sections,{childList:true,subtree:true});if(typeof window.upd==='function'&&!window.__auaPricingIntegrityPatched){window.__auaPricingIntegrityPatched=true;const old=window.upd;window.upd=function(){const r=old.apply(this,arguments);setTimeout(apply,0);return r}}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,1100));else setTimeout(install,1100);
})();