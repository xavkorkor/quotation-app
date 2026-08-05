// Alan's United Auto - single authoritative pricing integrity layer.
// RULES:
// 1) Any item with Unit Price > 0 is chargeable and MUST be in section/subtotal/GST/grand total.
// 2) Qty blank or 0 = effective Qty 1 for calculation only.
// 3) INCLUDED applies ONLY to an unpriced line. A priced line can never be suppressed by INCLUDED.
(function(){
 const $=id=>document.getElementById(id), NO_QTY=/labou?r|workmanship|diagnos|inspection fee|outside service|program|coding|calibrat|road test|service charge|recharge/i;
 let busy=false,pending=false;
 const num=v=>{const n=parseFloat(String(v??'').replace(/[^0-9.-]/g,''));return Number.isFinite(n)?n:0};
 const money=n=>'S$ '+Number(n||0).toLocaleString('en-SG',{minimumFractionDigits:2,maximumFractionDigits:2});
 const priceOf=x=>Math.max(0,num(x?.p ?? x?.price ?? x?.unitPrice));
 const rawQty=x=>num(x?.q ?? x?.qty ?? x?.quantity);
 const effectiveQty=x=>rawQty(x)>0?rawQty(x):1;
 function discount(base,type,value){const v=Math.max(0,num(value));return Math.min(base,type==='percent'?base*v/100:v)}
 function itemCalc(x){if(!x)return {price:0,qty:1,base:0,discount:0,net:0};const price=priceOf(x);if(price<=0)return {price:0,qty:effectiveQty(x),base:0,discount:0,net:0};const qty=effectiveQty(x),base=qty*price,d=discount(base,x.dt,x.dv);return {price,qty,base,discount:d,net:Math.max(0,base-d)}}
 function sectionCalc(sec){const itemNet=(sec?.items||[]).reduce((sum,x)=>sum+itemCalc(x).net,0),d=discount(itemNet,sec?.dt,sec?.dv);return {gross:itemNet,discount:d,net:Math.max(0,itemNet-d)}}
 function sections(){try{return typeof S!=='undefined'&&Array.isArray(S)?S:[]}catch(e){return[]}}
 function syncIncludedFlags(ss){ss.forEach(sec=>(sec.items||[]).forEach(x=>{if(priceOf(x)>0&&x.included)x.included=false}))}
 function updatePreviewLines(ss){document.querySelectorAll('#psecs .secprint').forEach((card,si)=>{const sec=ss[si];if(!sec)return;const lines=[...card.querySelectorAll('.line')];(sec.items||[]).forEach((x,ii)=>{const line=lines[ii];if(!line)return;const cells=[...line.children],c=itemCalc(x),desc=String(x.d??x.description??'');if(cells[0]&&NO_QTY.test(desc))cells[0].textContent='';if(cells[2]&&c.price>0)cells[2].textContent=money(c.price).replace(/^S\$\s*/, '');if(cells[3])cells[3].textContent=c.price>0?money(c.net):(x.included?'INCLUDED':money(0))})})}
 function updateEditorTotals(ss){document.querySelectorAll('.section-card').forEach((card,si)=>{const sec=ss[si];if(!sec)return;const c=sectionCalc(sec),el=card.querySelector('.section-mini-total');if(el)el.textContent=money(c.net)})}
 function label(sec,c){let s=String(sec?.title||'SECTION').toUpperCase(),v=num(sec?.dv);if(c.discount>0)s+=sec?.dt==='percent'?` (${v}% DISCOUNT)`:` (${money(c.discount)} DISCOUNT)`;return s}
 const esc=s=>String(s||'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
 function updateSummary(ss,cc,subtotal){const box=$('summaryBox'),on=$('summaryOn');if(!box)return;if(on&&!on.checked){box.style.display='none';box.innerHTML='';return}box.style.display='block';box.innerHTML='<div class="summary-head"><span>SECTION SUMMARY</span><span style="text-align:right">AMOUNT</span></div>'+ss.map((sec,i)=>`<div class="summary-row"><span>${esc(label(sec,cc[i]))}</span><span style="text-align:right">${money(cc[i].net)}</span></div>`).join('')+`<div class="summary-row summary-total"><span>TOTAL</span><span style="text-align:right">${money(subtotal)}</span></div>`}
 function updateTotals(subtotal){const typ=$('overallType')?.value||'percent',val=num($('overallDisc')?.value),od=discount(subtotal,typ,val),after=Math.max(0,subtotal-od),gstOn=$('gstOn')?.checked!==false,gst=gstOn?after*.09:0,grand=after+gst;if($('sub'))$('sub').textContent=money(subtotal);if($('overallRow'))$('overallRow').style.display=od>0?'flex':'none';if($('overallAmt'))$('overallAmt').textContent='-S$ '+od.toLocaleString('en-SG',{minimumFractionDigits:2,maximumFractionDigits:2});if($('gstRow'))$('gstRow').style.display=gstOn?'flex':'none';if($('gst'))$('gst').textContent=money(gst);if($('grand'))$('grand').textContent=money(grand)}
 function run(){pending=false;if(busy)return schedule();busy=true;try{const ss=sections();syncIncludedFlags(ss);const cc=ss.map(sectionCalc),subtotal=cc.reduce((sum,c)=>sum+c.net,0);updatePreviewLines(ss);updateEditorTotals(ss);updateSummary(ss,cc,subtotal);updateTotals(subtotal)}catch(e){console.error('AUA pricing calculation failed',e)}finally{busy=false}}
 function schedule(){if(pending)return;pending=true;setTimeout(run,25)}
 window.auaItemNet=x=>itemCalc(x).net;window.auaSectionCalc=sectionCalc;window.auaPricingApply=run;
 function install(){run();['input','change','blur','keyup'].forEach(ev=>document.addEventListener(ev,schedule,true));new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true,characterData:true});if(typeof window.upd==='function'&&!window.__auaPricingMaster){window.__auaPricingMaster=true;const old=window.upd;window.upd=function(){const r=old.apply(this,arguments);schedule();return r}}}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,1200));else setTimeout(install,1200);
})();