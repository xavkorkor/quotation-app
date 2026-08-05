// Alan's United Auto - independent calculation audit / self-check.
// Verifies priced items -> section totals -> subtotal -> discounts -> GST -> grand total.
(function(){
 const $=id=>document.getElementById(id);
 const EPS=0.01;
 const num=v=>{const n=parseFloat(String(v??'').replace(/[^0-9.-]/g,''));return Number.isFinite(n)?n:0};
 const priceOf=x=>Math.max(0,num(x?.p ?? x?.price ?? x?.unitPrice));
 const qtyOf=x=>{const q=num(x?.q ?? x?.qty ?? x?.quantity);return q>0?q:1};
 function disc(base,type,value){const v=Math.max(0,num(value));return Math.min(base,type==='percent'?base*Math.min(100,v)/100:v)}
 const eq=(a,b)=>Math.abs(Number(a||0)-Number(b||0))<=EPS;
 function independent(){
   const issues=[];let subtotal=0;
   const secs=(typeof S!=='undefined'&&Array.isArray(S)?S:[]).map((s,si)=>{
     let itemNet=0;
     const items=(s.items||[]).map((x,ii)=>{
       const price=priceOf(x),qty=qtyOf(x);
       const base=price>0?price*qty:0;
       const idisc=price>0?disc(base,x.dt,x.dv):0;
       const net=Math.max(0,base-idisc);
       if(price>0&&net<=0&&base>0&&idisc<base-EPS)issues.push(`Section ${si+1}, item ${ii+1}: priced item produced zero amount.`);
       if(price>0&&x.included)issues.push(`Section ${si+1}, item ${ii+1}: priced item is still marked Included.`);
       itemNet+=net;
       return {price,qty,base,discount:idisc,net};
     });
     const sd=disc(itemNet,s.dt,s.dv),net=Math.max(0,itemNet-sd);subtotal+=net;
     return {items,itemNet,sectionDiscount:sd,net};
   });
   const otype=$('overallType')?.value||'percent',oval=num($('overallDisc')?.value),od=disc(subtotal,otype,oval),taxable=Math.max(0,subtotal-od),gstOn=$('gstOn')?.checked!==false,gst=gstOn?taxable*.09:0,grand=taxable+gst;
   return {secs,subtotal,overallDiscount:od,taxable,gst,grand,issues};
 }
 function live(){try{return typeof totals==='function'?totals():null}catch(e){return null}}
 function audit(){
   const a=independent(),b=live(),issues=[...a.issues];
   if(!b){issues.push('Main quotation calculation is unavailable.');return {ok:false,issues,a,b}}
   if(!eq(a.subtotal,b.subtotal))issues.push(`Subtotal mismatch: audit S$ ${a.subtotal.toFixed(2)} vs app S$ ${Number(b.subtotal||0).toFixed(2)}.`);
   if(!eq(a.overallDiscount,b.od))issues.push(`Overall discount mismatch: audit S$ ${a.overallDiscount.toFixed(2)} vs app S$ ${Number(b.od||0).toFixed(2)}.`);
   if(!eq(a.gst,b.g))issues.push(`GST mismatch: audit S$ ${a.gst.toFixed(2)} vs app S$ ${Number(b.g||0).toFixed(2)}.`);
   if(!eq(a.grand,b.grand))issues.push(`Grand total mismatch: audit S$ ${a.grand.toFixed(2)} vs app S$ ${Number(b.grand||0).toFixed(2)}.`);
   a.secs.forEach((s,i)=>{const z=b.secs?.[i];if(!z){issues.push(`Section ${i+1} is missing from app calculation.`);return}if(!eq(s.net,z.net))issues.push(`Section ${i+1} total mismatch: audit S$ ${s.net.toFixed(2)} vs app S$ ${Number(z.net||0).toFixed(2)}.`);s.items.forEach((x,j)=>{const y=z.items?.[j];if(!y){issues.push(`Section ${i+1}, item ${j+1} is missing from app calculation.`);return}if(x.price>0&&!eq(x.net,y.net))issues.push(`Section ${i+1}, item ${j+1} amount mismatch: audit S$ ${x.net.toFixed(2)} vs app S$ ${Number(y.net||0).toFixed(2)}.`)})});
   return {ok:issues.length===0,issues,a,b};
 }
 function show(result){let box=$('auaAuditBox');if(!box){box=document.createElement('div');box.id='auaAuditBox';box.style.cssText='display:none;margin-top:9px;padding:10px;border-radius:9px;font-size:11px;line-height:1.45';const panel=document.querySelector('.action-panel')||document.querySelector('.remarks-panel');panel?.appendChild(box)}if(!box)return;if(result.ok){box.style.display='none';box.innerHTML='';return}box.style.display='block';box.style.background='#fff1f2';box.style.border='1px solid #fda4af';box.style.color='#9f1239';box.innerHTML='<b>Calculation check failed. PDF/export blocked.</b><br>'+result.issues.map(x=>'• '+x).join('<br>')}
 function check(showUI=true){const r=audit();if(showUI)show(r);return r}
 window.auaCalculationAudit=check;
 function protect(name){const fn=window[name];if(typeof fn!=='function'||fn.__auaAuditWrapped)return;const wrapped=async function(){const r=check(true);if(!r.ok){alert('Calculation check failed. Please review the quotation before exporting or sharing.');return}return await fn.apply(this,arguments)};wrapped.__auaAuditWrapped=true;window[name]=wrapped}
 function install(){protect('downloadPdf');protect('sharePdfWhatsApp');protect('saveRecord');document.addEventListener('change',()=>setTimeout(()=>check(false),150),true)}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,1500));else setTimeout(install,1500);
})();