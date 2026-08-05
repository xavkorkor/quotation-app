// Alan's United Auto - authoritative pricing engine.
// ABSOLUTE RULE: if Unit Price > 0, the item MUST be included in Amount, Section Total,
// Section Summary, Subtotal, GST and Grand Total. Qty blank/0 is treated as 1 for calculation.
// INCLUDED is only valid for an item with no unit price.
(function(){
 const $=id=>document.getElementById(id);
 const num=v=>{const n=parseFloat(String(v??'').replace(/[^0-9.-]/g,''));return Number.isFinite(n)?n:0};
 const money=n=>'S$ '+Number(n||0).toLocaleString('en-SG',{minimumFractionDigits:2,maximumFractionDigits:2});
 const priceOf=x=>Math.max(0,num(x?.p ?? x?.price ?? x?.unitPrice));
 const qtyOf=x=>{const q=num(x?.q ?? x?.qty ?? x?.quantity);return q>0?q:1};
 function discount(base,type,value){const v=Math.max(0,num(value));return Math.min(base,type==='percent'?base*Math.min(100,v)/100:v)}
 function calcItem(x){
   const price=priceOf(x),qty=qtyOf(x);
   // A priced item can never be treated as Included.
   if(price>0 && x?.included)x.included=false;
   if(price<=0)return {...x,base:0,disc:0,net:0};
   const base=qty*price,dd=discount(base,x?.dt,x?.dv),net=Math.max(0,base-dd);
   return {...x,base,disc:dd,net};
 }
 function masterTotals(){
   let subtotal=0;
   const secs=S.map(s=>{
     let itemNet=0;
     const items=(s.items||[]).map(x=>{const c=calcItem(x);itemNet+=c.net;return c});
     const sd=discount(itemNet,s.dt,s.dv),net=Math.max(0,itemNet-sd);
     subtotal+=net;
     return {s,items,itemNet,sd,net};
   });
   const od=discount(subtotal,overallType.value,overallDisc.value),tax=Math.max(0,subtotal-od),g=gstOn.checked?tax*.09:0;
   return {secs,subtotal,od,tax,g,grand:tax+g};
 }
 function forceCoreTotals(){
   try{
     // Replace the app's original totals() function so render(), upd(), PDF, recent records and summaries
     // all use one calculation source instead of a second overlay calculation.
     totals=masterTotals;
     window.auaMasterTotals=masterTotals;
     window.auaItemNet=x=>calcItem(x).net;
     window.auaSectionCalc=s=>{const r=masterTotals().secs.find(z=>z.s===s);return r||{itemNet:0,sd:0,net:0}};
   }catch(e){console.error('Unable to install AUA master pricing engine',e)}
 }
 function refresh(){
   try{
     forceCoreTotals();
     if(typeof upd==='function')upd();
     // Hide service quantities visually only; never change their calculation.
     const noQty=/labou?r|workmanship|diagnos|inspection fee|outside service|program|coding|calibrat|road test|service charge|recharge/i;
     document.querySelectorAll('#psecs .secprint').forEach((card,si)=>{
       const sec=S[si]; if(!sec)return;
       [...card.querySelectorAll('.line')].forEach((line,ii)=>{
         const x=sec.items?.[ii];if(!x)return;
         if(noQty.test(String(x.d||''))&&line.children[0])line.children[0].textContent='';
       });
     });
   }catch(e){console.error('AUA pricing refresh failed',e)}
 }
 function install(){
   forceCoreTotals();
   refresh();
   ['input','change','blur'].forEach(ev=>document.addEventListener(ev,()=>setTimeout(refresh,0),true));
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,1200));else setTimeout(install,1200);
})();