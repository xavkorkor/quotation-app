// Alan's United Auto - lightweight authoritative pricing engine.
// ABSOLUTE RULE: Unit Price > 0 is always included in all totals. Qty blank/0 calculates as 1.
// INCLUDED only applies to unpriced lines.
(function(){
 const num=v=>{const n=parseFloat(String(v??'').replace(/[^0-9.-]/g,''));return Number.isFinite(n)?n:0};
 const priceOf=x=>Math.max(0,num(x?.p ?? x?.price ?? x?.unitPrice));
 const qtyOf=x=>{const q=num(x?.q ?? x?.qty ?? x?.quantity);return q>0?q:1};
 function discount(base,type,value){const v=Math.max(0,num(value));return Math.min(base,type==='percent'?base*Math.min(100,v)/100:v)}
 function calcItem(x){const price=priceOf(x),qty=qtyOf(x);if(price>0&&x?.included)x.included=false;if(price<=0)return {...x,base:0,disc:0,net:0};const base=qty*price,dd=discount(base,x?.dt,x?.dv);return {...x,base,disc:dd,net:Math.max(0,base-dd)}}
 function masterTotals(){let subtotal=0;const secs=S.map(s=>{let itemNet=0;const items=(s.items||[]).map(x=>{const c=calcItem(x);itemNet+=c.net;return c});const sd=discount(itemNet,s.dt,s.dv),net=Math.max(0,itemNet-sd);subtotal+=net;return{s,items,itemNet,sd,net}});const od=discount(subtotal,overallType.value,overallDisc.value),tax=Math.max(0,subtotal-od),g=gstOn.checked?tax*.09:0;return{secs,subtotal,od,tax,g,grand:tax+g}}
 function install(){try{totals=masterTotals;window.auaMasterTotals=masterTotals;window.auaItemNet=x=>calcItem(x).net;window.auaSectionCalc=s=>{const r=masterTotals().secs.find(z=>z.s===s);return r||{itemNet:0,sd:0,net:0}};if(typeof upd==='function')upd()}catch(e){console.error('Unable to install AUA master pricing engine',e)}}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,1200));else setTimeout(install,1200);
})();