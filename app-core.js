// Alan's United Auto - production runtime bundle.
// Source modules remain in the repository for development/reference.

/* ===== item-drag-drop.js ===== */
(function(){
  let dragSource=null,dropRow=null,dropPosition='before',applying=false;
  function keyFor(row){const field=row?.querySelector?.('[data-desc],[data-qty]'),raw=field?.dataset?.desc||field?.dataset?.qty||'',match=String(raw).match(/^(\d+)-(\d+)$/);return match?{si:Number(match[1]),ii:Number(match[2])}:null}
  function injectStyles(){if(document.getElementById('auaItemDragStyles'))return;const style=document.createElement('style');style.id='auaItemDragStyles';style.textContent=`#sections .item{position:relative;padding-left:29px!important}.aua-item-drag-handle{position:absolute;left:6px;top:11px;width:17px;height:32px;display:grid;place-items:center;border:1px solid #d0d5dd;border-radius:6px;background:#f8fafc;color:#64748b;font-size:13px;font-weight:900;line-height:1;cursor:grab;user-select:none;z-index:3}.aua-item-drag-handle:hover{background:#e9eef5;color:#334155;border-color:#b8c2cf}.aua-item-drag-handle:active{cursor:grabbing}#sections .item.aua-drag-source{opacity:.42}#sections .item.aua-drop-before{box-shadow:inset 0 3px 0 #2563eb}#sections .item.aua-drop-after{box-shadow:inset 0 -3px 0 #2563eb}@media(max-width:600px){#sections .item{padding-left:27px!important}.aua-item-drag-handle{left:5px;top:9px;width:16px;height:30px;font-size:12px}}`;document.head.appendChild(style)}
  function decorate(row){const key=keyFor(row);if(!key)return;row.dataset.auaDragSection=String(key.si);row.dataset.auaDragItem=String(key.ii);if(row.querySelector(':scope > .aua-item-drag-handle'))return;const handle=document.createElement('span');handle.className='aua-item-drag-handle';handle.textContent='⋮⋮';handle.title='Drag to reorder item';handle.setAttribute('aria-label','Drag to reorder item');handle.setAttribute('role','button');handle.setAttribute('draggable','true');row.appendChild(handle)}
  function apply(){if(applying)return;applying=true;requestAnimationFrame(()=>{document.querySelectorAll('#sections .section-card .item').forEach(decorate);applying=false})}
  function clearDropIndicators(){if(dropRow){dropRow.classList.remove('aua-drop-before','aua-drop-after');dropRow=null}}
  function cleanup(){clearDropIndicators();document.querySelectorAll('#sections .aua-drag-source').forEach(el=>el.classList.remove('aua-drag-source'));dragSource=null}
  function moveDraggedItem(target,position){if(!dragSource||!target||typeof S==='undefined'||typeof render!=='function'||typeof upd!=='function')return;const fromSection=S[dragSource.si],toSection=S[target.si],moving=fromSection?.items?.[dragSource.ii];if(!fromSection||!toSection||!moving)return;let insertAt=target.ii+(position==='after'?1:0);fromSection.items.splice(dragSource.ii,1);if(dragSource.si===target.si){if(dragSource.ii<insertAt)insertAt--;insertAt=Math.max(0,Math.min(insertAt,fromSection.items.length));fromSection.items.splice(insertAt,0,moving)}else{insertAt=Math.max(0,Math.min(insertAt,toSection.items.length));toSection.items.splice(insertAt,0,moving);if(!fromSection.items.length)fromSection.items.push(typeof item==='function'?item():{q:'1 pc',d:'',p:'',dt:'percent',dv:'',open:false,included:false});toSection.collapsed=false}if(typeof activeItem!=='undefined')activeItem={i:target.si,j:insertAt};render();upd()}
  function install(){injectStyles();const root=document.getElementById('sections');if(!root){setTimeout(install,200);return}if(root.dataset.auaDragInstalled==='1')return;root.dataset.auaDragInstalled='1';apply();root.addEventListener('dragstart',event=>{const handle=event.target?.closest?.('.aua-item-drag-handle');if(!handle||!root.contains(handle))return;const row=handle.closest('.item'),key=keyFor(row);if(!row||!key)return;dragSource=key;row.classList.add('aua-drag-source');if(event.dataTransfer){event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',`${key.si}:${key.ii}`)}});root.addEventListener('dragover',event=>{if(!dragSource)return;const row=event.target?.closest?.('.item');if(!row||!root.contains(row))return;event.preventDefault();if(event.dataTransfer)event.dataTransfer.dropEffect='move';if(dropRow!==row)clearDropIndicators();dropRow=row;const rect=row.getBoundingClientRect();dropPosition=event.clientY>rect.top+rect.height/2?'after':'before';row.classList.toggle('aua-drop-before',dropPosition==='before');row.classList.toggle('aua-drop-after',dropPosition==='after')});root.addEventListener('drop',event=>{if(!dragSource)return;const row=event.target?.closest?.('.item');if(!row||!root.contains(row)){cleanup();return}event.preventDefault();moveDraggedItem(keyFor(row),dropPosition);cleanup()});root.addEventListener('dragend',cleanup);new MutationObserver(apply).observe(root,{childList:true,subtree:true})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,80),{once:true});else setTimeout(install,80)
})();

/* ===== typography-uppercase.js ===== */
(function(){
  let busy=false;
  function injectStyle(){if(document.getElementById('auaTypographyStyles'))return;const s=document.createElement('style');s.id='auaTypographyStyles';s.textContent=`.editor input,.editor select,.editor textarea{font-size:14.5px}.item-main input{font-size:14.5px}.section-head input{font-size:14.5px;font-weight:700}.panel-title{font-size:11.5px}.small{font-size:11px}.line{font-size:11.2px;line-height:1.35}.sectitle{font-size:10.8px}.meta{font-size:12px}.summary-head,.summary-row,.adjust{font-size:10.5px}.totals{font-size:11.5px}.notes{font-size:10px}.item-main input[type="text"],.section-head input[type="text"],#customer,#vehicle,#model,#remarks{text-transform:uppercase}`;document.head.appendChild(s)}
  function isUpperField(el){if(!el)return false;const id=el.id||'';if(['phone','date','mileage','overallDisc'].includes(id))return false;if(el.type==='number'||el.type==='date'||el.type==='tel')return false;return el.matches('.item-main input[type="text"],.section-head input[type="text"],#customer,#vehicle,#model,#remarks')}
  function bind(el){if(!isUpperField(el)||el.dataset.auaUpperBound==='1')return;el.dataset.auaUpperBound='1';el.addEventListener('change',()=>{const up=String(el.value||'').toUpperCase();if(el.value!==up)el.value=up});el.addEventListener('blur',()=>{const up=String(el.value||'').toUpperCase();if(el.value!==up){el.value=up;el.dispatchEvent(new Event('change',{bubbles:true}))}})}
  function bindAll(){document.querySelectorAll('.editor input,.editor textarea').forEach(bind)}
  function apply(){if(busy)return;busy=true;requestAnimationFrame(()=>{bindAll();busy=false})}
  function install(){injectStyle();bindAll();const target=document.querySelector('.editor')||document.body;new MutationObserver(apply).observe(target,{childList:true,subtree:true})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,320));else setTimeout(install,320)
})();

/* ===== memory-sanitizer.js ===== */
(function(){
  const MEM='auaItemMemoryV2',META='auaItemMetaV1',RESET='auaDescriptionMemoryHardReset_2026_08_04_v2';
  function clean(v){return String(v||'').replace(/\s+/g,' ').trim().toUpperCase()}
  function valid(v){const d=clean(v);if(!d||d.length<4||d.length>100)return false;if(!/[A-Z]/.test(d))return false;if(/^\d+(?:[.,]\d+)?$/.test(d))return false;if(/^(TEST(?:ING)?|ABC(?:D)?|ASD(?:F)?|QWERTY|XXX+|ZZZ+|AAAA+|BBBB+|ITEMS?|PARTS?|DESCRIPTION|DESC|PRICE|AMOUNT|NIL|NONE|NA|N\/A|TBC|TBA|OK|YES|NO)$/i.test(d))return false;if(/^(.)\1{2,}$/i.test(d))return false;const letters=(d.match(/[A-Z]/g)||[]).length;if(letters<3)return false;const tokens=d.split(/\s+/).filter(Boolean);if(tokens.length===1&&/^[A-Z]{1,3}$/.test(tokens[0]))return false;if(tokens.every(t=>/^[A-Z]{1,2}$/.test(t)))return false;if((d.match(/[^A-Z0-9 .,+\-/()&]/g)||[]).length>2)return false;return true}
  function hardResetOnce(){if(localStorage.getItem(RESET)==='1')return;localStorage.removeItem(MEM);localStorage.removeItem(META);localStorage.setItem(RESET,'1');try{if(typeof refreshMemory==='function')refreshMemory()}catch{}}
  function sanitizeStore(){try{const raw=JSON.parse(localStorage.getItem(MEM)||'{}'),out={};Object.entries(raw).forEach(([k,v])=>{const d=clean(k);if(valid(d))out[d]=v});localStorage.setItem(MEM,JSON.stringify(out))}catch{localStorage.setItem(MEM,'{}')}try{const raw=JSON.parse(localStorage.getItem(META)||'{}'),out={};Object.entries(raw).forEach(([k,v])=>{const d=clean(v?.description||k);if(valid(d)){v.description=d;out[d.toLowerCase()]=v}});localStorage.setItem(META,JSON.stringify(out))}catch{localStorage.setItem(META,'{}')}}
  function patchRemember(){if(window.__auaMemorySanitized||typeof window.rememberItem!=='function')return;window.__auaMemorySanitized=true;const old=window.rememberItem;window.rememberItem=function(x){const d=clean(x?.d);if(!valid(d))return;const copy=Object.assign({},x,{d}),r=old.call(this,copy);sanitizeStore();return r}}
  function cleanDatalist(){const dl=document.getElementById('itemMemoryList');if(!dl)return;[...dl.options].forEach(o=>{if(!valid(o.value))o.remove()})}
  function install(){hardResetOnce();sanitizeStore();patchRemember();try{if(typeof refreshMemory==='function')refreshMemory()}catch{}cleanDatalist();new MutationObserver(cleanDatalist).observe(document.getElementById('itemMemoryList')||document.body,{childList:true,subtree:true})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,420));else setTimeout(install,420)
})();

/* ===== discount-preview.js ===== */
(function(){
  let refreshing=false;function money(n){return Number(n||0).toLocaleString('en-SG',{minimumFractionDigits:2,maximumFractionDigits:2})}
  function refresh(){if(refreshing)return;refreshing=true;try{const cards=[...document.querySelectorAll('#psecs .secprint')];S.forEach((sec,i)=>{const card=cards[i];if(!card)return;const lines=[...card.querySelectorAll('.line')];(sec.items||[]).forEach((item,j)=>{const line=lines[j];if(!line)return;const desc=line.children[1];if(!desc)return;let base=desc.dataset.auaBaseDesc;if(!base){base=(desc.textContent||'').replace(/\s*\([^)]*discount\)\s*$/i,'').trim();desc.dataset.auaBaseDesc=base}const v=Number(item.dv||0);if(v>0&&!item.included)desc.textContent=item.dt==='percent'?`${base} (${v}% DISCOUNT)`:`${base} (S$ ${money(v)} DISCOUNT)`;else desc.textContent=base});const row=[...card.querySelectorAll('.adjust')].find(x=>/section discount/i.test(x.textContent||''));if(row){const value=Number(sec.dv||0),spans=row.children;if(spans[0])spans[0].textContent=sec.dt==='percent'&&value>0?`SECTION DISCOUNT (${value}%)`:'SECTION DISCOUNT';if(spans[1]&&spans[1].textContent){const n=Math.abs(Number(String(spans[1].textContent).replace(/[^0-9.-]/g,''))||0);if(n>0)spans[1].textContent=`- S$ ${money(n)}`}}});const summary=document.getElementById('summaryBox');if(summary){const rows=[...summary.querySelectorAll('.summary-row')].filter(r=>!r.classList.contains('summary-total'));rows.forEach((r,i)=>{const sec=S[i],name=r.children[0];if(!sec||!name)return;let base=name.dataset.auaBaseTitle;if(!base){base=(name.textContent||'').replace(/\s*\([^)]*discount\)\s*$/i,'').trim();name.dataset.auaBaseTitle=base}const v=Number(sec.dv||0);if(v>0)name.textContent=sec.dt==='percent'?`${base} (${v}% DISCOUNT)`:`${base} (S$ ${money(v)} DISCOUNT)`;else name.textContent=base})}const overallRow=document.getElementById('overallRow'),amtEl=document.getElementById('overallAmt');if(overallRow&&overallRow.style.display!=='none'&&amtEl){const type=document.getElementById('overallType')?.value,value=Number(document.getElementById('overallDisc')?.value||0),name=overallRow.querySelector('span:first-child');if(name)name.textContent=type==='percent'&&value>0?`Overall Discount (${value}%)`:'Overall Discount'}}catch(e){console.error('Discount preview refresh failed',e)}finally{refreshing=false}}
  function install(){if(typeof window.upd==='function'&&!window.__auaDiscountPreviewPatched){window.__auaDiscountPreviewPatched=true;const old=window.upd;window.upd=function(){const r=old.apply(this,arguments);requestAnimationFrame(refresh);return r}}refresh();document.addEventListener('input',e=>{if(e.target.closest('.disc,.item-disc'))setTimeout(refresh,0)});document.addEventListener('change',e=>{if(e.target.closest('.disc,.item-disc'))setTimeout(refresh,0)})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,450));else setTimeout(install,450)
})();

/* ===== preview-editor.js ===== */
(function(){
 const $=id=>document.getElementById(id),undo=[],clone=o=>JSON.parse(JSON.stringify(o));let queued=false;
 function sections(){try{return typeof S!=='undefined'&&Array.isArray(S)?S:null}catch{return null}}
 function snap(){const ss=sections();return{fields:['customer','phone','vehicle','mileage','model','date','remarks','overallType','overallDisc'].reduce((o,id)=>(o[id]=$(id)?.value||'',o),{}),sections:ss?clone(ss):[]}}
 function pushUndo(){undo.push(snap());if(undo.length>40)undo.shift()}
 function refresh(){try{render()}catch{}try{upd()}catch{}}
 function restore(s){if(!s)return;Object.entries(s.fields||{}).forEach(([id,v])=>{if($(id))$(id).value=v});const ss=sections();if(ss)ss.splice(0,ss.length,...clone(s.sections||[]));refresh()}
 window.auaPushUndo=pushUndo;window.auaUndoRight=()=>{const s=undo.pop();if(!s)return false;restore(s);return true};
 function style(){if($('auaPreviewEditStyles'))return;const s=document.createElement('style');s.id='auaPreviewEditStyles';s.textContent=`.paper .aua-editable{cursor:text;border-radius:3px;min-height:1em}.paper .aua-editable:hover{background:#eff6ff;outline:1px dashed #60a5fa}.paper .aua-editing{background:#fff!important;outline:2px solid #2563eb!important;padding:1px 3px;min-width:28px!important;display:inline-block!important}.paper .meta span.aua-editable{display:inline-block;min-width:52px;min-height:14px}.paper .line>div.aua-editable{min-height:16px;padding:0 2px}.paper .sectitle.aua-editable{display:inline-block;min-width:55px;padding:1px 3px}.paper .summary,.paper .totals,.paper .line>div:nth-child(4){cursor:default}.paper .aua-empty-phone{display:inline!important}@media print{.paper .aua-editable:hover,.paper .aua-editing{background:transparent!important;outline:none!important;padding:0}.paper .aua-empty-phone{display:none!important}}`;document.head.appendChild(s)}
 function commit(el,get,set,opts={}){if(!el||el.dataset.auaEditing==='1')return;el.dataset.auaEditing='1';el.classList.add('aua-editing');el.contentEditable='true';const original=String(get()??'');el.textContent=original;el.focus();const r=document.createRange();r.selectNodeContents(el);r.collapse(false);const sel=getSelection();sel.removeAllRanges();sel.addRange(r);let done=false;function finish(cancel){if(done)return;done=true;el.contentEditable='false';el.classList.remove('aua-editing');delete el.dataset.auaEditing;if(!cancel){let v=el.textContent.trim();if(opts.upper)v=v.toUpperCase();if(opts.number)v=v.replace(/[^0-9.]/g,'');if(v!==original){pushUndo();set(v)}}queueMark()}el.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();finish(false)}else if(e.key==='Escape'){e.preventDefault();el.textContent=original;finish(true)}};el.onblur=()=>finish(false)}
 function bind(el,handler,title='Click to edit'){if(!el)return;el.classList.add('aua-editable');el.title=title;if(el.dataset.auaEditBound==='1')return;el.dataset.auaEditBound='1';el.onclick=e=>{e.preventDefault();e.stopPropagation();handler(el)}}
 function mark(){const ss=sections();if(!ss)return;const phone=$('phone'),wrap=$('pphoneWrap');if(wrap&&phone&&!phone.value.trim()){wrap.classList.add('aua-empty-phone');wrap.style.display='inline'}const map={pc:'customer',pphone:'phone',pv:'vehicle',pm:'mileage',pmod:'model'};Object.entries(map).forEach(([pid,iid])=>{const p=$(pid),input=$(iid);if(p&&input)bind(p,el=>commit(el,()=>input.value,v=>{input.value=v;upd()},{upper:!['phone','mileage'].includes(iid)}))});const pd=$('pd'),date=$('date');if(pd&&date)bind(pd,el=>commit(el,()=>date.value,v=>{date.value=v;upd()}));const remarks=$('pRemarks'),rin=$('remarks');if(remarks&&rin){if(!rin.value){remarks.style.display='block';remarks.style.minHeight='18px'}bind(remarks,el=>commit(el,()=>rin.value,v=>{rin.value=v;upd()},{upper:true}))}document.querySelectorAll('#psecs .secprint').forEach((card,si)=>{const sec=ss[si];if(!sec)return;bind(card.querySelector('.sectitle'),el=>commit(el,()=>sec.title||'',v=>{sec.title=v.toUpperCase();refresh()},{upper:true}));card.querySelectorAll('.line').forEach((line,ii)=>{const item=sec.items?.[ii];if(!item)return;const c=line.children;if(c[0])bind(c[0],el=>commit(el,()=>item.q??'',v=>{item.q=v;refresh()}));if(c[1])bind(c[1],el=>commit(el,()=>item.d??'',v=>{item.d=v.toUpperCase();refresh()},{upper:true}));if(c[2])bind(c[2],el=>commit(el,()=>item.p??'',v=>{item.p=v;refresh()},{number:true}))})})}
 function queueMark(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;mark()})}
 function install(){style();queueMark();if(typeof window.upd==='function'&&!window.__auaPreviewUpdPatched){window.__auaPreviewUpdPatched=true;const old=window.upd;window.upd=function(){const r=old.apply(this,arguments);queueMark();return r}}if(typeof window.render==='function'&&!window.__auaPreviewRenderPatched){window.__auaPreviewRenderPatched=true;const old=window.render;window.render=function(){const r=old.apply(this,arguments);queueMark();return r}}document.addEventListener('keydown',e=>{if(!(e.ctrlKey||e.metaKey)||e.key.toLowerCase()!=='z'||e.shiftKey)return;const a=document.activeElement,typing=a&&(a.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/i.test(a.tagName));if(typing||!undo.length)return;e.preventDefault();e.stopImmediatePropagation();window.auaUndoRight()},true)}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,650));else setTimeout(install,650)
})();

/* ===== calculation-audit.js ===== */
(function(){
 const $=id=>document.getElementById(id),EPS=0.01,num=v=>{const n=parseFloat(String(v??'').replace(/[^0-9.-]/g,''));return Number.isFinite(n)?n:0},priceOf=x=>Math.max(0,num(x?.p??x?.price??x?.unitPrice)),qtyOf=x=>{const q=num(x?.q??x?.qty??x?.quantity);return q>0?q:1},eq=(a,b)=>Math.abs(Number(a||0)-Number(b||0))<=EPS;
 function disc(base,type,value){const v=Math.max(0,num(value));return Math.min(base,type==='percent'?base*Math.min(100,v)/100:v)}
 function independent(){const issues=[];let subtotal=0;const secs=(typeof S!=='undefined'&&Array.isArray(S)?S:[]).map((s,si)=>{let itemNet=0;const items=(s.items||[]).map((x,ii)=>{const price=priceOf(x),qty=qtyOf(x),base=price>0?price*qty:0,idisc=price>0?disc(base,x.dt,x.dv):0,net=Math.max(0,base-idisc);if(price>0&&net<=0&&base>0&&idisc<base-EPS)issues.push(`Section ${si+1}, item ${ii+1}: priced item produced zero amount.`);if(price>0&&x.included)issues.push(`Section ${si+1}, item ${ii+1}: priced item is still marked Included.`);itemNet+=net;return{price,qty,base,discount:idisc,net}});const sd=disc(itemNet,s.dt,s.dv),net=Math.max(0,itemNet-sd);subtotal+=net;return{items,itemNet,sectionDiscount:sd,net}});const otype=$('overallType')?.value||'percent',oval=num($('overallDisc')?.value),od=disc(subtotal,otype,oval),taxable=Math.max(0,subtotal-od),gstOn=$('gstOn')?.checked!==false,gst=gstOn?taxable*.09:0,grand=taxable+gst;return{secs,subtotal,overallDiscount:od,taxable,gst,grand,issues}}
 function live(){try{return typeof totals==='function'?totals():null}catch{return null}}
 function audit(){const a=independent(),b=live(),issues=[...a.issues];if(!b){issues.push('Main quotation calculation is unavailable.');return{ok:false,issues,a,b}}if(!eq(a.subtotal,b.subtotal))issues.push(`Subtotal mismatch: audit S$ ${a.subtotal.toFixed(2)} vs app S$ ${Number(b.subtotal||0).toFixed(2)}.`);if(!eq(a.overallDiscount,b.od))issues.push(`Overall discount mismatch: audit S$ ${a.overallDiscount.toFixed(2)} vs app S$ ${Number(b.od||0).toFixed(2)}.`);if(!eq(a.gst,b.g))issues.push(`GST mismatch: audit S$ ${a.gst.toFixed(2)} vs app S$ ${Number(b.g||0).toFixed(2)}.`);if(!eq(a.grand,b.grand))issues.push(`Grand total mismatch: audit S$ ${a.grand.toFixed(2)} vs app S$ ${Number(b.grand||0).toFixed(2)}.`);a.secs.forEach((s,i)=>{const z=b.secs?.[i];if(!z){issues.push(`Section ${i+1} is missing from app calculation.`);return}if(!eq(s.net,z.net))issues.push(`Section ${i+1} total mismatch: audit S$ ${s.net.toFixed(2)} vs app S$ ${Number(z.net||0).toFixed(2)}.`);s.items.forEach((x,j)=>{const y=z.items?.[j];if(!y){issues.push(`Section ${i+1}, item ${j+1} is missing from app calculation.`);return}if(x.price>0&&!eq(x.net,y.net))issues.push(`Section ${i+1}, item ${j+1} amount mismatch: audit S$ ${x.net.toFixed(2)} vs app S$ ${Number(y.net||0).toFixed(2)}.`)})});return{ok:issues.length===0,issues,a,b}}
 function show(result){let box=$('auaAuditBox');if(!box){box=document.createElement('div');box.id='auaAuditBox';box.style.cssText='display:none;margin-top:9px;padding:10px;border-radius:9px;font-size:11px;line-height:1.45';const panel=document.querySelector('.action-panel')||document.querySelector('.remarks-panel');panel?.appendChild(box)}if(!box)return;if(result.ok){box.style.display='none';box.innerHTML='';return}box.style.display='block';box.style.background='#fff1f2';box.style.border='1px solid #fda4af';box.style.color='#9f1239';box.innerHTML='<b>Calculation check failed. PDF/export blocked.</b><br>'+result.issues.map(x=>'• '+x).join('<br>')}
 function check(showUI=true){const r=audit();if(showUI)show(r);return r}window.auaCalculationAudit=check;
 function protect(name){const fn=window[name];if(typeof fn!=='function'||fn.__auaAuditWrapped)return;const wrapped=async function(){const r=check(true);if(!r.ok){alert('Calculation check failed. Please review the quotation before exporting or sharing.');return}return await fn.apply(this,arguments)};wrapped.__auaAuditWrapped=true;window[name]=wrapped}
 function install(){protect('downloadPdf');protect('sharePdfWhatsApp');protect('saveRecord');document.addEventListener('change',()=>setTimeout(()=>check(false),150),true)}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,1500));else setTimeout(install,1500)
})();

/* ===== quotation-audit.js ===== */
(function(){
  const STAFF_BY_EMAIL={'xavkqw@gmail.com':'Xavier','khong.shijie@gmail.com':'Shijie'},emptyAudit=()=>({createdBy:'',createdAt:'',lastEditedBy:'',lastEditedAt:'',legacy:false});let auditMeta=emptyAudit(),lastStampMs=0;
  function currentStaff(){const label=String(document.getElementById('cloudUser')?.textContent||'').trim(),match=label.match(/^Signed in as\s+(.+)$/i);return STAFF_BY_EMAIL[String(match?.[1]||'').trim().toLowerCase()]||''}
  function cleanAudit(source){const a=source?.audit||{},createdBy=String(a.createdBy||'').trim(),createdAt=String(a.createdAt||'').trim();let lastEditedBy=String(a.lastEditedBy||source?.savedBy||source?.lastUpdatedBy||'').trim(),lastEditedAt=String(a.lastEditedAt||'').trim();if(createdBy&&lastEditedBy===createdBy&&createdAt&&lastEditedAt){const gap=Math.abs(new Date(lastEditedAt).getTime()-new Date(createdAt).getTime());if(Number.isFinite(gap)&&gap<5000){lastEditedBy='';lastEditedAt=''}}return{createdBy,createdAt,lastEditedBy,lastEditedAt,legacy:!createdBy}}
  function stampSave(){const staff=currentStaff();if(!staff)return;const nowMs=Date.now();if(nowMs-lastStampMs<1500)return;lastStampMs=nowMs;const now=new Date(nowMs).toISOString();if(!auditMeta.createdBy){auditMeta={createdBy:staff,createdAt:now,lastEditedBy:'',lastEditedAt:'',legacy:false};return}auditMeta.lastEditedBy=staff;auditMeta.lastEditedAt=now}
  function installDataHooks(){if(typeof state!=='function'||typeof loadRecord!=='function'||typeof newQuote!=='function'||typeof duplicateQuote!=='function'||typeof saveRecord!=='function'||typeof saveRecent!=='function')return false;if(state.__auaAuditStableV3)return true;const baseState=state,baseLoadRecord=loadRecord,baseNewQuote=newQuote,baseDuplicateQuote=duplicateQuote,baseSaveRecord=saveRecord,baseSaveRecent=saveRecent;state=function(){const data=baseState();data.audit={createdBy:auditMeta.createdBy,createdAt:auditMeta.createdAt,lastEditedBy:auditMeta.lastEditedBy,lastEditedAt:auditMeta.lastEditedAt};return data};state.__auaAuditStableV3=true;loadRecord=function(data){auditMeta=cleanAudit(data||{});lastStampMs=0;return baseLoadRecord(data)};newQuote=function(){auditMeta=emptyAudit();lastStampMs=0;return baseNewQuote()};duplicateQuote=function(){auditMeta=emptyAudit();lastStampMs=0;return baseDuplicateQuote()};saveRecord=function(){stampSave();return baseSaveRecord.apply(this,arguments)};saveRecent=function(){stampSave();return baseSaveRecent.apply(this,arguments)};return true}
  function installCloudSaveHook(){const button=document.getElementById('cloudSave');if(!button)return false;if(button.dataset.auaAuditSaveHook)return true;button.dataset.auaAuditSaveHook='1';button.addEventListener('click',stampSave,true);return true}
  function displayAudit(audit){if(audit.lastEditedBy)return{label:'Last edited by',name:audit.lastEditedBy};if(audit.createdBy)return{label:'Made by',name:audit.createdBy};return{label:'Made by',name:'Not recorded'}}
  function getRecord(key){try{return(typeof getRecent==='function'?getRecent():[]).find(r=>String(r?.key||'')===String(key||''))}catch{return null}}
  window.AUAQuotationAudit=Object.assign(window.AUAQuotationAudit||{},{stampSave});
  function ensureStyles(){if(document.getElementById('auaQuotationAuditStyles'))return;const style=document.createElement('style');style.id='auaQuotationAuditStyles';style.textContent=`.aua-history-audit-line{display:block;margin:0;font-size:8.8px;font-weight:700;color:#64748b;line-height:1.25;white-space:nowrap}.aua-history-audit-card{margin:0 0 18px;padding:11px 12px;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc}.aua-history-audit-card span{display:block;font-size:8.5px;font-weight:800;text-transform:uppercase;color:#64748b;margin-bottom:3px}.aua-history-audit-card b{font-size:11px;color:#0f2747}.aua-history-quote-ref{display:none!important}.aua-history-updated-cell{display:flex;flex-direction:column;align-items:flex-end;justify-content:center;gap:4px;min-width:0;text-align:right}.aua-history-updated-cell .aua-history-updated{display:block;margin:0;line-height:1.25;white-space:nowrap}.aua-history-updated-cell .aua-history-status-badge{display:block;min-width:72px;width:max-content;margin:0;padding:3px 8px;text-align:center;line-height:1.2}@media(max-width:900px){.aua-history-updated-cell{display:none}}`;document.head.appendChild(style)}
  function refreshHistoryAudit(){const overlay=document.getElementById('auaHistoryOverlay');if(!overlay||overlay.hidden)return;overlay.querySelectorAll('.aua-history-row[data-aua-key]').forEach(row=>{const record=getRecord(row.dataset.auaKey),view=displayAudit(cleanAudit(record?.data||{})),cell=row.querySelector('.aua-history-updated-cell');if(!cell)return;const statuses=Array.from(row.querySelectorAll('.aua-history-status-badge')),status=statuses.pop();statuses.forEach(extra=>extra.remove());if(status)cell.appendChild(status);let line=cell.querySelector('.aua-history-audit-line');if(!line){line=document.createElement('span');line.className='aua-history-audit-line'}line.textContent=`${view.label} ${view.name}`;cell.appendChild(line)});const selected=overlay.querySelector('.aua-history-row.selected[data-aua-key]'),preview=document.getElementById('auaHistoryPreview');if(!preview)return;const old=preview.querySelector('.aua-history-audit-card');if(!selected){old?.remove();return}const view=displayAudit(cleanAudit(getRecord(selected.dataset.auaKey)?.data||{}));let card=old;if(!card){card=document.createElement('div');card.className='aua-history-audit-card';const stats=preview.querySelector('.aua-history-stats');if(stats)preview.insertBefore(card,stats);else preview.prepend(card)}card.innerHTML=`<span>${view.label}</span><b>${view.name}</b>`}
  function install(attempt=0){ensureStyles();const dataReady=installDataHooks(),cloudReady=installCloudSaveHook();if(dataReady&&!document.documentElement.dataset.auaAuditHistoryEvent){document.documentElement.dataset.auaAuditHistoryEvent='1';document.addEventListener('aua-history-updated',refreshHistoryAudit)}if(dataReady&&cloudReady)return;if(attempt<20)setTimeout(()=>install(attempt+1),200)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>install());else install()
})();

/* ===== startup-fresh-quote.js ===== */
(function(){
  let initialised=false;
  function blankQuote(){const today=new Date().toISOString().slice(0,10);return{customer:'',phone:'',date:today,vehicle:'',mileage:'',model:'',useHeader:true,gstOn:true,summaryOn:true,remarks:'',overallType:'percent',overallDisc:'',sections:[{title:'REPAIR / SERVICE',dt:'percent',dv:'',collapsed:false,items:[{}]}],audit:{createdBy:'',createdAt:'',lastEditedBy:'',lastEditedAt:''}}}
  function resetToFreshQuote(force=false){if(initialised&&!force)return true;if(typeof loadRecord!=='function')return false;loadRecord(blankQuote());initialised=true;requestAnimationFrame(()=>document.getElementById('customer')?.focus());return true}
  function install(){if(!resetToFreshQuote())setTimeout(install,200)}
  window.addEventListener('pageshow',event=>{if(event.persisted){initialised=false;resetToFreshQuote(true)}});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install()
})();

/* ===== quote-workflow.js ===== */
// Stable quotation workflow metadata: status, quotation number and vehicle lookup.
(function(){
  const STATUS_OPTIONS=['Draft','Sent','Approved','Job In Progress','Completed','Cancelled'];
  let quoteNumber='';
  let quoteStatus='Draft';

  const byId=id=>document.getElementById(id);
  const pad=n=>String(n).padStart(2,'0');
  const normalVehicle=value=>String(value||'').toUpperCase().replace(/\s+/g,'').trim();

  function generateQuoteNumber(){
    const d=new Date();
    const date=`${String(d.getFullYear()).slice(-2)}${pad(d.getMonth()+1)}${pad(d.getDate())}`;
    const time=`${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
    return `AUA${date}${time}`;
  }

  function ensureMeta(){
    if(!quoteNumber)quoteNumber=generateQuoteNumber();
    if(!STATUS_OPTIONS.includes(quoteStatus))quoteStatus='Draft';
  }

  function ensureStyles(){
    if(byId('auaQuoteWorkflowStyles'))return;
    const style=document.createElement('style');
    style.id='auaQuoteWorkflowStyles';
    style.textContent=`
      .aua-quote-workflow-panel{border-left-color:#64748b}
      #auaQuoteNumber{background:#f8fafc;color:#475569;font-weight:700}
      .aua-vehicle-suggestion{margin-top:5px;display:none}
      .aua-vehicle-suggestion button{width:100%;text-align:left;border:1px solid #bfdbfe;background:#eff6ff;color:#1e40af;border-radius:8px;padding:7px 8px;font-size:10.5px;font-weight:700;cursor:pointer}
      .aua-preview-quote-ref{font-weight:700}
    `;
    document.head.appendChild(style);
  }

  function ensureUi(){
    let panel=byId('auaQuoteWorkflowPanel');
    if(!panel){
      const customerPanel=document.querySelector('.customer-panel');
      if(!customerPanel)return false;
      panel=document.createElement('div');
      panel.id='auaQuoteWorkflowPanel';
      panel.className='panel settings-panel aua-quote-workflow-panel';
      panel.innerHTML=`<div class="panel-title">QUOTATION DETAILS</div><div class="grid"><div><label>Quotation No.</label><input id="auaQuoteNumber" data-preserve-case readonly></div><div><label>Status</label><select id="auaQuoteStatus">${STATUS_OPTIONS.map(x=>`<option value="${x}">${x}</option>`).join('')}</select></div></div>`;
      customerPanel.insertAdjacentElement('afterend',panel);
    }

    ensureStyles();

    const status=byId('auaQuoteStatus');
    if(status){
      const options=Array.from(status.options).map(option=>option.value||option.textContent);
      if(options.join('|')!==STATUS_OPTIONS.join('|')){
        status.innerHTML=STATUS_OPTIONS.map(value=>`<option value="${value}">${value}</option>`).join('');
      }
    }
    if(status&&status.dataset.auaStatusBound!=='1'){
      status.dataset.auaStatusBound='1';
      status.addEventListener('change',e=>{
        quoteStatus=e.target.value||'Draft';
        window.auaSyncWorkspaceHeader?.();
      });
    }

    const meta=document.querySelector('.paper .meta');
    if(meta&&!byId('pQuoteNumberWrap')){
      const row=document.createElement('div');
      row.id='pQuoteNumberWrap';
      row.className='aua-preview-quote-ref';
      row.innerHTML='Quotation No.: <span id="pQuoteNumber"></span>';
      meta.prepend(row);
    }

    injectVehicleLookup();
    syncUi();
    return true;
  }

  function syncUi(){
    ensureMeta();
    const q=byId('auaQuoteNumber'),s=byId('auaQuoteStatus'),p=byId('pQuoteNumber');
    if(q&&q.value!==quoteNumber)q.value=quoteNumber;
    if(s&&s.value!==quoteStatus)s.value=quoteStatus;
    if(p&&p.textContent!==quoteNumber)p.textContent=quoteNumber;
    window.auaSyncWorkspaceHeader?.();
  }

  function records(){
    try{return typeof getRecent==='function'?(getRecent()||[]):[]}catch{return[]}
  }

  function markAutofill(input){
    if(input&&String(input.value||'')!=='')input.dataset.auaHistoryAutofill='1';
  }

  function injectVehicleLookup(){
    const input=byId('vehicle');
    if(!input)return;

    let list=byId('auaVehicleLookupList');
    if(!list){
      list=document.createElement('datalist');
      list.id='auaVehicleLookupList';
      document.body.appendChild(list);
      input.setAttribute('list','auaVehicleLookupList');
    }

    if(input.dataset.auaVehicleListBound==='1')return;
    input.dataset.auaVehicleListBound='1';

    let lastSignature='';
    const refreshList=()=>{
      const seen=new Set(),items=[];
      records().slice().sort((a,b)=>Number(b.ts||0)-Number(a.ts||0)).forEach(record=>{
        const vehicle=String(record?.data?.vehicle||'').trim();
        const key=normalVehicle(vehicle);
        if(!key||seen.has(key))return;
        seen.add(key);items.push(vehicle);
      });
      const next=items.slice(0,100),signature=next.join('|');
      if(signature===lastSignature)return;
      lastSignature=signature;
      list.innerHTML=next.map(v=>`<option value="${String(v).replace(/&/g,'&amp;').replace(/"/g,'&quot;')}"></option>`).join('');
    };

    input.addEventListener('focus',refreshList);
    document.addEventListener('aua-history-updated',refreshList);
  }

  function installHooks(){
    if(typeof state!=='function'||typeof loadRecord!=='function'||typeof newQuote!=='function'||typeof duplicateQuote!=='function')return false;
    if(state.__auaQuoteWorkflow)return true;

    const baseState=state;
    const baseLoadRecord=loadRecord;
    const baseNewQuote=newQuote;
    const baseDuplicateQuote=duplicateQuote;

    ensureMeta();

    state=function(){
      const data=baseState();
      ensureMeta();
      data.quoteNumber=quoteNumber;
      data.status=quoteStatus;
      return data;
    };
    state.__auaQuoteWorkflow=true;

    loadRecord=function(data){
      quoteNumber=String(data?.quoteNumber||'').trim()||generateQuoteNumber();
      quoteStatus=STATUS_OPTIONS.includes(data?.status)?data.status:'Draft';
      const result=baseLoadRecord(data);
      setTimeout(syncUi,0);
      return result;
    };

    newQuote=function(){
      const before=JSON.stringify(baseState());
      const previousNumber=quoteNumber,previousStatus=quoteStatus;
      const result=baseNewQuote.apply(this,arguments);
      setTimeout(()=>{
        const after=JSON.stringify(baseState());
        if(after!==before){quoteNumber=generateQuoteNumber();quoteStatus='Draft'}
        else{quoteNumber=previousNumber;quoteStatus=previousStatus}
        syncUi();
      },0);
      return result;
    };

    duplicateQuote=function(){
      const result=baseDuplicateQuote.apply(this,arguments);
      quoteNumber=generateQuoteNumber();
      quoteStatus='Draft';
      setTimeout(syncUi,0);
      return result;
    };
    return true;
  }

  function install(){
    const hooks=installHooks();
    const ui=ensureUi();
    if(!hooks||!ui){setTimeout(install,120);return}
    syncUi();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();

/* ===== unsaved-protection.js ===== */
(function(){
  let cleanSnapshot='',forcedDirty=false;
  function snapshot(){try{return typeof state==='function'?JSON.stringify(state()):''}catch{return''}}
  function markClean(){cleanSnapshot=snapshot();forcedDirty=false}
  function isDirty(){const current=snapshot();return forcedDirty||!!(cleanSnapshot&&current&&current!==cleanSnapshot)}
  function confirmDiscard(message){return!isDirty()||window.confirm(message||'You have unsaved quotation changes. Continue without saving?')}
  function cloudSaveConfirmed(){const status=document.getElementById('cloudStatus'),message=String(status?.textContent||'');return status?.dataset?.tone==='success'&&(/Saved online/i.test(message)||/Saved quotation/i.test(message))}
  function markRecordWhenConfirmed(result){const check=()=>{if(cloudSaveConfirmed())markClean()};if(result&&typeof result.then==='function')result.then(()=>setTimeout(check,20)).catch(()=>{});else setTimeout(check,80);return result}
  window.AUAUnsavedProtection=Object.assign(window.AUAUnsavedProtection||{},{markClean,isDirty,confirmDiscard});
  function installFunctionHooks(){if(typeof state!=='function'||typeof loadRecord!=='function'||typeof newQuote!=='function'||typeof duplicateQuote!=='function'||typeof saveRecord!=='function'||typeof saveRecent!=='function')return false;if(state.__auaUnsavedProtection)return true;const baseState=state,baseLoadRecord=loadRecord,baseNewQuote=newQuote,baseDuplicateQuote=duplicateQuote,baseSaveRecord=saveRecord,baseSaveRecent=saveRecent;state=function(){return baseState.apply(this,arguments)};state.__auaUnsavedProtection=true;loadRecord=function(){const result=baseLoadRecord.apply(this,arguments);setTimeout(markClean,40);return result};newQuote=function(){const before=snapshot(),result=baseNewQuote.apply(this,arguments);setTimeout(()=>{if(snapshot()!==before)markClean()},60);return result};duplicateQuote=function(){const result=baseDuplicateQuote.apply(this,arguments);setTimeout(()=>{forcedDirty=true},20);return result};saveRecord=function(){return markRecordWhenConfirmed(baseSaveRecord.apply(this,arguments))};saveRecent=function(){return baseSaveRecent.apply(this,arguments)};return true}
  function installNavigationHooks(){const history=document.getElementById('cloudRecordsTab'),recordFile=document.getElementById('recordFile');if(!history||!recordFile)return false;if(history.dataset.auaUnsavedProtection)return true;history.dataset.auaUnsavedProtection='1';history.addEventListener('click',event=>{if(confirmDiscard('This quotation has unsaved changes. Open History anyway?'))return;event.preventDefault();event.stopImmediatePropagation()},true);recordFile.addEventListener('click',event=>{if(confirmDiscard('This quotation has unsaved changes. Load another record anyway?'))return;event.preventDefault();event.stopImmediatePropagation()},true);const cloudSave=document.getElementById('cloudSave');if(cloudSave&&!cloudSave.dataset.auaUnsavedSaveHook){cloudSave.dataset.auaUnsavedSaveHook='1';cloudSave.addEventListener('click',()=>{const before=String(document.getElementById('cloudStatus')?.textContent||'');setTimeout(()=>{const after=String(document.getElementById('cloudStatus')?.textContent||'');if(after!==before&&cloudSaveConfirmed())markClean()},500)})}window.addEventListener('beforeunload',event=>{if(!isDirty())return;event.preventDefault();event.returnValue=''});return true}
  function install(){const functions=installFunctionHooks(),navigation=installNavigationHooks();if(!functions||!navigation){setTimeout(install,250);return}setTimeout(markClean,100)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install()
})();

/* ===== cloud-record-integrity.js ===== */
// Unique quotation history, recoverable archive, and strict explicit-save bridge.
// No quotation record is created by background saveRecent/PDF/startup activity.
(function(){
  const LOCAL_KEY='auaRecentQuotesV1';
  let clientPromise=null;
  let installed=false;

  const clone=value=>{try{return JSON.parse(JSON.stringify(value))}catch{return value}};
  const text=value=>String(value??'').trim();
  const quoteKey=data=>data?.quoteNumber?`quote|${text(data.quoteNumber).toLowerCase()}`:'';
  const legacyKey=data=>{
    const vehicle=text(data?.vehicle).toLowerCase(),customer=text(data?.customer).toLowerCase();
    return vehicle?`${customer}|${vehicle}`:[customer,data?.date].map(v=>text(v).toLowerCase()).join('|');
  };
  const rawRecords=()=>{try{return typeof getRecent==='function'?(getRecent()||[]):[]}catch{return[]}};

  function cloudStatus(message,tone='normal'){
    const el=document.getElementById('cloudStatus');
    if(!el)return;
    el.textContent=message;
    el.dataset.tone=tone;
  }

  async function cloudClient(){
    if(clientPromise)return clientPromise;
    clientPromise=(async()=>{
      if(!window.supabase?.createClient)throw new Error('Online storage library is unavailable.');
      const response=await fetch('./online-storage.js',{cache:'force-cache'});
      if(!response.ok)throw new Error('Online storage configuration could not be read.');
      const source=await response.text();
      const url=source.match(/\burl\s*:\s*'([^']+)'/)?.[1];
      const key=source.match(/\bkey\s*:\s*'([^']+)'/)?.[1];
      if(!url||!key)throw new Error('Online storage configuration is unavailable.');
      return window.supabase.createClient(url,key);
    })();
    return clientPromise;
  }

  async function sessionAndClient(){
    const client=await cloudClient();
    const {data,error}=await client.auth.getSession();
    if(error)throw error;
    const user=data?.session?.user;
    if(!user)throw new Error('Sign in before saving a quotation.');
    return{client,user};
  }

  function promoteLocal(data,total){
    const key=quoteKey(data);
    if(!key)return;
    let list=[];
    try{list=JSON.parse(localStorage.getItem(LOCAL_KEY)||'[]')}catch{}
    const legacy=legacyKey(data),quote=text(data.quoteNumber).toLowerCase();
    list=list.filter(record=>{
      const existingQuote=text(record?.data?.quoteNumber).toLowerCase();
      return String(record?.key||'')!==legacy&&String(record?.key||'')!==key&&(!quote||existingQuote!==quote);
    });
    list.unshift({key,ts:Date.now(),total:Number(total||0),data:clone(data)});
    localStorage.setItem(LOCAL_KEY,JSON.stringify(list.slice(0,100)));
  }

  async function cleanupLegacy(client,key,alias){
    if(!alias||alias===key)return false;
    try{
      const {data:source}=await client.from('quotations').select('pdf_path').eq('record_key',alias).maybeSingle();
      if(source?.pdf_path)await client.from('quotations').update({pdf_path:source.pdf_path}).eq('record_key',key);
      const {error}=await client.from('quotations').delete().eq('record_key',alias);
      if(error)throw error;
      return true;
    }catch(error){
      console.warn('Legacy quotation cleanup was deferred.',error);
      return false;
    }
  }

  async function persistUnique(data,total,sourceKey){
    const key=quoteKey(data);
    if(!key)throw new Error('Quotation number is missing. Start a fresh quotation and try again.');
    const {client,user}=await sessionAndClient();
    const alias=sourceKey||legacyKey(data);
    let pdfPath=null;
    if(alias&&alias!==key){
      const {data:source,error:sourceError}=await client.from('quotations').select('pdf_path').eq('record_key',alias).maybeSingle();
      if(sourceError&&sourceError.code!=='PGRST116')console.warn('Unable to read existing quotation file link.',sourceError);
      pdfPath=source?.pdf_path||null;
    }
    const row={
      user_id:user.id,
      record_key:key,
      customer:text(data.customer),
      vehicle:text(data.vehicle),
      quote_date:data.date||null,
      model:text(data.model),
      total:Number(total||0),
      data:clone(data),
      updated_at:new Date().toISOString()
    };
    if(pdfPath)row.pdf_path=pdfPath;
    const {error}=await client.from('quotations').upsert(row,{onConflict:'record_key'});
    if(error)throw error;
    if(alias&&alias!==key)await cleanupLegacy(client,key,alias);
    return true;
  }

  async function explicitSave(){
    try{
      window.AUAQuotationAudit?.stampSave?.();
      try{if(typeof S!=='undefined'&&typeof rememberItem==='function')S.forEach(section=>(section.items||[]).forEach(rememberItem))}catch{}
      const data=clone(state()),total=Number(totals()?.grand||0);
      cloudStatus('Saving quotation…');
      await persistUnique(data,total);
      promoteLocal(data,total);
      cloudStatus(`Saved quotation${data.vehicle?' for '+data.vehicle:''}.`,'success');
      window.AUAUnsavedProtection?.markClean?.();
      return true;
    }catch(error){
      cloudStatus(error?.message||'Unable to save quotation.','error');
      return false;
    }
  }

  async function setArchived(record,archived){
    if(!record?.data)return false;
    const data=clone(record.data);
    data.archived=!!archived;
    if(archived)data.archivedAt=new Date().toISOString();else delete data.archivedAt;
    if(quoteKey(data)){
      await persistUnique(data,record.total,record.key);
      promoteLocal(data,record.total);
    }else{
      const {client}=await sessionAndClient();
      const {error}=await client.from('quotations').update({data,updated_at:new Date().toISOString()}).eq('record_key',record.key);
      if(error)throw error;
      let list=[];
      try{list=JSON.parse(localStorage.getItem(LOCAL_KEY)||'[]')}catch{}
      list.forEach(item=>{if(String(item?.key||'')===String(record.key||''))item.data=clone(data)});
      localStorage.setItem(LOCAL_KEY,JSON.stringify(list));
    }
    return true;
  }

  async function cleanupCloudDuplicates(){
    const {client}=await sessionAndClient();
    const {data,error}=await client.from('quotations').select('record_key,data').limit(500);
    if(error)throw error;
    const rows=data||[],preferred=new Map();
    rows.forEach(row=>{
      const ref=text(row?.data?.quoteNumber).toLowerCase();
      if(ref&&String(row.record_key||'').startsWith('quote|'))preferred.set(ref,row.record_key);
    });
    let removed=0;
    for(const row of rows){
      const ref=text(row?.data?.quoteNumber).toLowerCase(),target=ref?preferred.get(ref):'';
      if(!target||target===row.record_key)continue;
      if(await cleanupLegacy(client,target,row.record_key))removed++;
    }
    return removed;
  }

  function installSaveHooks(){
    if(installed)return true;
    if(typeof state!=='function'||typeof totals!=='function')return false;

    // Strict rule: background calls must never create quotation records.
    saveRecent=function(){return false};
    saveRecord=function(){return explicitSave()};

    // PDF/WhatsApp generation stays local-only and must not auto-create an online record.
    

    const cloudSave=document.getElementById('cloudSave');
    if(cloudSave){
      cloudSave.textContent='Save Quotation';
      cloudSave.onclick=()=>saveRecord();
    }
    const mainSave=document.querySelector('button[onclick*="saveRecord"]');
    if(mainSave)mainSave.textContent='Save Quotation';

    installed=true;
    return true;
  }

  function preferredQuoteKeys(){
    const map=new Map();
    rawRecords().forEach(record=>{
      const ref=text(record?.data?.quoteNumber).toLowerCase();
      if(!ref)return;
      const current=map.get(ref);
      if(!current||String(record?.key||'').startsWith('quote|'))map.set(ref,String(record?.key||''));
    });
    return map;
  }

  function ensureHistoryUi(){
    const advanced=document.getElementById('auaHistoryAdvanced');
    if(advanced&&!document.getElementById('auaHistArchive')){
      const field=document.createElement('div');
      field.className='aua-history-filter-field';
      field.innerHTML='<label>Records</label><select id="auaHistArchive"><option value="active">Active</option><option value="archived">Archived</option><option value="all">All</option></select>';
      const reset=document.getElementById('auaHistReset');
      advanced.insertBefore(field,reset||null);
      document.getElementById('auaHistArchive').addEventListener('change',decorateHistory);
    }
    if(!document.getElementById('auaIntegrityStyles')){
      const style=document.createElement('style');style.id='auaIntegrityStyles';
      style.textContent='.aua-history-quote-ref{display:block;margin-top:4px;font-size:8.8px;font-weight:700;color:#64748b;letter-spacing:.02em}.aua-history-row[hidden]{display:none!important}.aua-history-archive-note{display:block;margin-top:4px;font-size:8.5px;font-weight:800;color:#b45309}';
      document.head.appendChild(style);
    }
  }

  function decorateHistory(){
    const overlay=document.getElementById('auaHistoryOverlay');
    if(!overlay||overlay.hidden)return;
    ensureHistoryUi();
    const mode=document.getElementById('auaHistArchive')?.value||'active';
    const preferred=preferredQuoteKeys();
    overlay.querySelectorAll('.aua-history-row[data-aua-key]').forEach(row=>{
      const record=rawRecords().find(r=>String(r?.key||'')===String(row.dataset.auaKey||''));
      if(!record){row.hidden=false;return}
      const ref=text(record?.data?.quoteNumber),archived=!!record?.data?.archived;
      const preferredKey=ref?preferred.get(ref.toLowerCase()):'';
      const duplicate=!!preferredKey&&preferredKey!==String(record.key||'');
      const modeHidden=mode==='active'?archived:mode==='archived'?!archived:false;
      row.hidden=duplicate||modeHidden;
      const holder=row.children?.[1];
      if(holder&&ref){
        let label=holder.querySelector('.aua-history-quote-ref');
        if(!label){label=document.createElement('span');label.className='aua-history-quote-ref';holder.appendChild(label)}
        label.textContent=ref;
      }
      if(holder){
        let note=holder.querySelector('.aua-history-archive-note');
        if(archived){if(!note){note=document.createElement('span');note.className='aua-history-archive-note';holder.appendChild(note)}note.textContent='ARCHIVED'}else note?.remove();
      }
    });
    const selected=overlay.querySelector('.aua-history-row.selected[data-aua-key]');
    const action=document.getElementById('auaHistoryDelete');
    if(selected&&action){
      const record=rawRecords().find(r=>String(r?.key||'')===String(selected.dataset.auaKey||''));
      if(record){
        const archived=!!record?.data?.archived;
        action.textContent=archived?'Restore':'Archive';
        action.classList.remove('aua-history-delete');
        action.onclick=async()=>{
          action.disabled=true;const old=action.textContent;action.textContent=archived?'Restoring…':'Archiving…';
          try{await setArchived(record,!archived);document.getElementById('auaHistoryRefresh')?.click()}
          catch(error){alert(error?.message||'Unable to update archive status.');action.disabled=false;action.textContent=old}
        };
      }
    }
    const visible=Array.from(overlay.querySelectorAll('.aua-history-row[data-aua-key]')).filter(row=>!row.hidden&&row.style.display!=='none').length;
    const count=document.getElementById('auaHistoryCount');
    if(count&&!String(document.getElementById('auaHistorySearch')?.value||'').trim())count.textContent=`${visible} shown`;
  }

  window.AUACloudIntegrity={
    setArchived,
    saveQuotation:explicitSave,
    cleanupCloudDuplicates,
    isArchived:record=>!!record?.data?.archived,
    uniqueKeyForData:quoteKey
  };

  function start(){
    installSaveHooks();ensureHistoryUi();decorateHistory();
    document.addEventListener('aua-history-updated',decorateHistory);
    document.getElementById('cloudRecordsTab')?.addEventListener('click',()=>{
      requestAnimationFrame(decorateHistory);
      setTimeout(async()=>{
        try{
          const removed=await cleanupCloudDuplicates();
          if(removed)document.getElementById('auaHistoryRefresh')?.click();
        }catch{}
      },700);
    });
    document.getElementById('auaHistorySearch')?.addEventListener('input',()=>requestAnimationFrame(decorateHistory));
  }
  if(document.readyState==='complete')start();else window.addEventListener('load',start,{once:true});
})();

/* ===== ui-topbar-v2.js ===== */
// Compact signed-in utility bar for the quotation workspace.
// UI-only: no quotation storage, calculation, PDF or history logic is changed here.
(function(){
  const byId=id=>document.getElementById(id);

  function displayName(raw){
    const value=String(raw||'').toLowerCase();
    if(value.includes('xavkqw@gmail.com'))return 'Xavier';
    if(value.includes('khong.shijie@gmail.com'))return 'Shijie';
    const match=String(raw||'').match(/^Signed in as\s+(.+)$/i);
    return match?.[1]||'Staff';
  }

  function ensureStyles(){
    if(byId('auaCompactTopbarStyles'))return;
    const style=document.createElement('style');
    style.id='auaCompactTopbarStyles';
    style.textContent=`
      html:not(.cloud-auth-gate) #cloudPanel{
        margin:0 0 11px;
        padding:8px 10px;
        border:1px solid #d9e3ee;
        border-radius:12px;
        background:rgba(255,255,255,.86);
        box-shadow:0 2px 8px rgba(15,39,71,.035);
      }
      html:not(.cloud-auth-gate) #cloudPanelTitle{display:none!important}
      html:not(.cloud-auth-gate) #cloudSignedIn:not([hidden]){
        display:grid;
        grid-template-columns:minmax(96px,1fr) repeat(5,auto);
        gap:5px;
        align-items:center;
      }
      html:not(.cloud-auth-gate) #cloudSignedIn>.toolbar{display:contents}
      html:not(.cloud-auth-gate) #cloudSave,
      html:not(.cloud-auth-gate) #cloudRecordsTab{display:none!important}
      html:not(.cloud-auth-gate) #cloudRecordsPanel{display:none!important}
      html:not(.cloud-auth-gate) #cloudUser{
        display:flex;
        min-width:0;
        align-items:center;
        gap:7px;
        margin:0;
        overflow:hidden;
        color:#334155;
        font-size:0!important;
        font-weight:800;
        white-space:nowrap;
      }
      html:not(.cloud-auth-gate) #cloudUser::before{
        overflow:hidden;
        content:attr(data-aua-display);
        font-size:10.5px;
        text-overflow:ellipsis;
      }
      html:not(.cloud-auth-gate) #cloudUser::after{
        flex:0 0 auto;
        content:'ONLINE';
        padding:3px 6px;
        border:1px solid #bbf7d0;
        border-radius:999px;
        background:#ecfdf3;
        color:#15803d;
        font-size:7.5px;
        font-weight:900;
        letter-spacing:.06em;
      }
      html:not(.cloud-auth-gate) #cloudRefresh,
      html:not(.cloud-auth-gate) #cloudExport,
      html:not(.cloud-auth-gate) #cloudSignOut,
      html:not(.cloud-auth-gate) #auaVehicleMasterManagerBtn,
      html:not(.cloud-auth-gate) #auaSystemHealthBtn{
        width:auto;
        min-height:29px;
        margin:0;
        padding:5px 8px;
        border-radius:8px;
        background:#fff;
        color:#475569;
        border:1px solid #d5dee9;
        box-shadow:none;
        font-size:9px;
        font-weight:750;
        white-space:nowrap;
      }
      html:not(.cloud-auth-gate) #cloudRefresh:hover,
      html:not(.cloud-auth-gate) #cloudExport:hover,
      html:not(.cloud-auth-gate) #cloudSignOut:hover,
      html:not(.cloud-auth-gate) #auaVehicleMasterManagerBtn:hover,
      html:not(.cloud-auth-gate) #auaSystemHealthBtn:hover{background:#f8fafc;border-color:#bdcad8;transform:none}
      html:not(.cloud-auth-gate) #cloudSignOut{color:#64748b}
      html:not(.cloud-auth-gate) #cloudStatus{
        margin:6px 0 0;
        padding:6px 8px;
        border-radius:8px;
        background:#f8fafc;
        font-size:9px;
        line-height:1.25;
      }
      html:not(.cloud-auth-gate) #cloudStatus.aua-cloud-quiet{display:none!important}
      html:not(.cloud-auth-gate) .aua-workspace-header{
        top:0;
        margin:0 -18px 14px;
        padding-top:13px;
      }
      @media(max-width:1120px){
        html:not(.cloud-auth-gate) .aua-workspace-header{margin:0 -16px 14px}
      }
      @media(max-width:620px){
        html:not(.cloud-auth-gate) #cloudSignedIn:not([hidden]){grid-template-columns:repeat(3,minmax(0,1fr))}
        html:not(.cloud-auth-gate) #cloudUser{grid-column:1/-1}
        html:not(.cloud-auth-gate) #cloudRefresh,
        html:not(.cloud-auth-gate) #cloudExport,
        html:not(.cloud-auth-gate) #cloudSignOut,
        html:not(.cloud-auth-gate) #auaVehicleMasterManagerBtn,
        html:not(.cloud-auth-gate) #auaSystemHealthBtn{width:100%}
      }
      @media(max-width:520px){
        html:not(.cloud-auth-gate) #cloudPanel{padding:7px 8px;margin-bottom:8px}
        html:not(.cloud-auth-gate) #cloudSignedIn:not([hidden]){grid-template-columns:1fr 1fr}
        html:not(.cloud-auth-gate) #cloudUser{grid-column:1/-1}
        html:not(.cloud-auth-gate) #cloudUser::after{display:none}
        html:not(.cloud-auth-gate) #cloudRefresh,
        html:not(.cloud-auth-gate) #cloudExport,
        html:not(.cloud-auth-gate) #cloudSignOut,
        html:not(.cloud-auth-gate) #auaVehicleMasterManagerBtn,
        html:not(.cloud-auth-gate) #auaSystemHealthBtn{padding:6px 7px;font-size:9px}
        html:not(.cloud-auth-gate) .aua-workspace-header{margin:0 -11px 10px}
      }
      @media print{#cloudPanel{display:none!important}}
    `;
    document.head.appendChild(style);
  }

  function polishCloudBar(){
    const user=byId('cloudUser');
    const refresh=byId('cloudRefresh'),exportButton=byId('cloudExport'),signOut=byId('cloudSignOut');
    const status=byId('cloudStatus');
    if(!user||!refresh||!exportButton||!signOut||!status)return false;

    const raw=String(user.textContent||'').trim();
    user.dataset.auaDisplay=displayName(raw);
    refresh.textContent='Refresh';
    exportButton.textContent='Export';
    signOut.textContent='Sign Out';

    const message=String(status.textContent||'').trim();
    const quiet=status.dataset.tone==='success'&&(/ready/i.test(message)||/saved online/i.test(message)||/loaded\s+\d+\s+online quotation/i.test(message));
    status.classList.toggle('aua-cloud-quiet',quiet);
    return true;
  }

  function installButtonRefreshes(){
    const panel=byId('cloudPanel');
    if(!panel||panel.dataset.auaCompactTopbarEvents)return;
    panel.dataset.auaCompactTopbarEvents='1';
    panel.addEventListener('click',()=>{
      setTimeout(polishCloudBar,80);
      setTimeout(polishCloudBar,900);
      setTimeout(polishCloudBar,2200);
    });
  }

  function install(attempt=0){
    ensureStyles();
    const ready=polishCloudBar();
    installButtonRefreshes();
    if(!ready&&attempt<20)setTimeout(()=>install(attempt+1),200);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>install(),{once:true});else install();
})();

/* ===== remarks-rich-format.js ===== */
(function(){
  const byId=id=>document.getElementById(id);let editor=null,richHtml='';const escapeHtml=value=>String(value??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c])),plainToHtml=value=>escapeHtml(String(value??'').replace(/\r\n?/g,'\n')).replace(/\n/g,'<br>');
  function nodeHtml(node){if(node.nodeType===Node.TEXT_NODE)return escapeHtml(node.nodeValue||'');if(node.nodeType!==Node.ELEMENT_NODE)return'';const tag=node.tagName.toLowerCase(),children=Array.from(node.childNodes).map(nodeHtml).join('');if(tag==='br')return'<br>';if(tag==='b'||tag==='strong')return`<strong>${children}</strong>`;if(tag==='span'){const weight=String(node.style?.fontWeight||'').toLowerCase(),bold=weight==='bold'||weight==='bolder'||(!Number.isNaN(Number(weight))&&Number(weight)>=600);return bold?`<strong>${children}</strong>`:children}if(tag==='div'||tag==='p')return`${children}<br>`;if(tag==='li')return`• ${children}<br>`;if(tag==='ul'||tag==='ol')return children;return children}
  function sanitize(html){const template=document.createElement('template');template.innerHTML=String(html||'');let safe=Array.from(template.content.childNodes).map(nodeHtml).join('');return safe.replace(/(?:<br>){3,}$/,'<br><br>')}
  function plainFromHtml(html){const box=document.createElement('div');box.innerHTML=String(html||'').replace(/<br\s*\/?>/gi,'\n');return(box.textContent||'').replace(/\u00a0/g,' ')}
  function printText(value){return escapeHtml(String(value??'')).replace(/\t/g,'&nbsp;&nbsp;&nbsp;&nbsp;').replace(/ {2,}/g,spaces=>'&nbsp;'.repeat(spaces.length))}
  function printBodyHtml(html){const template=document.createElement('template');template.innerHTML=sanitize(html);const lines=[[]];function walk(node,bold=false){if(node.nodeType===Node.TEXT_NODE){const content=printText(node.nodeValue||'');if(content)lines[lines.length-1].push(bold?`<strong>${content}</strong>`:content);return}if(node.nodeType!==Node.ELEMENT_NODE)return;const tag=node.tagName.toLowerCase();if(tag==='br'){lines.push([]);return}const nextBold=bold||tag==='b'||tag==='strong';Array.from(node.childNodes).forEach(child=>walk(child,nextBold));if((tag==='div'||tag==='p'||tag==='li')&&lines[lines.length-1].length)lines.push([])}Array.from(template.content.childNodes).forEach(node=>walk(node,false));while(lines.length>1&&!lines[lines.length-1].length)lines.pop();return lines.map(parts=>`<div class="aua-remarks-line">${parts.join('')||'&nbsp;'}</div>`).join('')}
  function currentSafeHtml(){if(editor)richHtml=sanitize(editor.innerHTML);return sanitize(richHtml||plainToHtml(byId('remarks')?.value||''))}
  function renderPreview(){const preview=byId('pRemarks');if(!preview)return;const safe=currentSafeHtml(),hasText=plainFromHtml(safe).trim().length>0;preview.style.display=hasText?'block':'none';preview.innerHTML=hasText?`<div class="aua-remarks-print-title">Remarks</div><div class="aua-remarks-print-body">${printBodyHtml(safe)}</div>`:''}
  function syncFromEditor(){if(!editor)return;richHtml=sanitize(editor.innerHTML);const backing=byId('remarks');if(backing)backing.value=plainFromHtml(richHtml);try{if(typeof window.upd==='function')window.upd()}catch{}renderPreview()}
  function prepareForExport(){if(editor){richHtml=sanitize(editor.innerHTML);const backing=byId('remarks');if(backing)backing.value=plainFromHtml(richHtml)}renderPreview()}
  function setEditor(html,plain){if(!editor)return;richHtml=sanitize(html||plainToHtml(plain||''));editor.innerHTML=richHtml;const backing=byId('remarks');if(backing)backing.value=plainFromHtml(richHtml);renderPreview()}
  function ensureUi(){const backing=byId('remarks'),panel=document.querySelector('.remarks-panel');if(!backing||!panel)return false;if(byId('auaRemarksEditor')){editor=byId('auaRemarksEditor');return true}const toolbar=document.createElement('div');toolbar.className='aua-remarks-toolbar';toolbar.innerHTML='<button id="auaRemarksBold" class="btn outline" type="button" title="Bold selected text"><strong>B</strong>&nbsp; Bold</button><span>Formatting, spacing and new lines are preserved in the PDF.</span>';editor=document.createElement('div');editor.id='auaRemarksEditor';editor.className='aua-remarks-editor';editor.contentEditable='true';editor.setAttribute('role','textbox');editor.setAttribute('aria-multiline','true');editor.dataset.placeholder='Key in notes to appear on the quotation';backing.style.display='none';backing.setAttribute('aria-hidden','true');backing.insertAdjacentElement('beforebegin',toolbar);toolbar.insertAdjacentElement('afterend',editor);byId('auaRemarksBold').addEventListener('mousedown',event=>event.preventDefault());byId('auaRemarksBold').addEventListener('click',()=>{editor.focus();try{document.execCommand('bold',false,null)}catch{}syncFromEditor()});editor.addEventListener('input',syncFromEditor);editor.addEventListener('blur',()=>{richHtml=sanitize(editor.innerHTML);editor.innerHTML=richHtml;syncFromEditor()});editor.addEventListener('paste',()=>setTimeout(syncFromEditor,0));setEditor('',backing.value);return true}
  function ensureStyles(){if(byId('auaRemarksRichStyles'))return;const style=document.createElement('style');style.id='auaRemarksRichStyles';style.textContent=`.aua-remarks-toolbar{display:flex;align-items:center;gap:9px;margin-bottom:8px}.aua-remarks-toolbar .btn{min-height:32px;padding:5px 10px;font-size:10.5px}.aua-remarks-toolbar span{color:#64748b;font-size:9.5px;line-height:1.3}.aua-remarks-editor{min-height:115px;width:100%;padding:11px;border:1px solid #cfd9e5;border-radius:10px;background:#fff;color:#172033;font:inherit;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere;outline:none}.aua-remarks-editor:hover{border-color:#aebed1}.aua-remarks-editor:focus{border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.13)}.aua-remarks-editor:empty:before{content:attr(data-placeholder);color:#94a3b8;pointer-events:none}.aua-remarks-editor strong{font-weight:800}.remark-print{white-space:normal!important;line-height:1.5!important}.aua-remarks-print-title{margin-bottom:5px;font-weight:800}.aua-remarks-print-body{display:block;white-space:normal!important;overflow-wrap:anywhere}.aua-remarks-line{display:block;min-height:1.5em;line-height:1.5;white-space:normal}.aua-remarks-line strong{font-weight:800}@media print{.aua-remarks-print-body,.aua-remarks-line{white-space:normal!important}}`;document.head.appendChild(style)}
  function installHooks(){if(typeof window.state!=='function'||typeof window.loadRecord!=='function'||typeof window.newQuote!=='function')return false;if(window.state.__auaRichRemarks)return true;const baseState=window.state,baseLoadRecord=window.loadRecord,baseNewQuote=window.newQuote,baseDuplicateQuote=typeof window.duplicateQuote==='function'?window.duplicateQuote:null,baseUpd=typeof window.upd==='function'?window.upd:null,baseMakePdfBlob=typeof window.makePdfBlob==='function'?window.makePdfBlob:null;window.state=function(){const data=baseState.apply(this,arguments);if(editor){richHtml=sanitize(editor.innerHTML);data.remarks=plainFromHtml(richHtml);if(richHtml)data.remarksRich=richHtml;else delete data.remarksRich}return data};window.state.__auaRichRemarks=true;window.loadRecord=function(data){const result=baseLoadRecord.apply(this,arguments);setTimeout(()=>setEditor(data?.remarksRich||'',data?.remarks||''),0);return result};window.newQuote=function(){const before=byId('remarks')?.value||'',result=baseNewQuote.apply(this,arguments);setTimeout(()=>{const after=byId('remarks')?.value||'';if(after!==before)setEditor('',after)},0);return result};if(baseDuplicateQuote)window.duplicateQuote=function(){const result=baseDuplicateQuote.apply(this,arguments);setTimeout(renderPreview,0);return result};if(baseUpd&&!baseUpd.__auaRichRemarks){window.upd=function(){const result=baseUpd.apply(this,arguments);renderPreview();return result};window.upd.__auaRichRemarks=true}if(baseMakePdfBlob&&!baseMakePdfBlob.__auaRichRemarksExport){window.makePdfBlob=async function(){prepareForExport();try{return await baseMakePdfBlob.apply(this,arguments)}finally{renderPreview()}};window.makePdfBlob.__auaRichRemarksExport=true}return true}
  function install(attempt=0){ensureStyles();const ui=ensureUi(),hooks=installHooks();if(ui&&hooks){renderPreview();return}if(attempt<20)setTimeout(()=>install(attempt+1),200)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>install(),{once:true});else install()
})();

/* ===== remarks-private-settlement.js ===== */
(function(){
  const byId=id=>document.getElementById(id),CLAUSE_KEY='PRIVATE SETTLEMENT / GOODWILL QUOTATION',CLAUSE_HTML=`<strong>PRIVATE SETTLEMENT / GOODWILL QUOTATION</strong><br><br>This quotation is issued strictly for the purpose of facilitating an amicable <strong>private settlement</strong> between the parties.<br><br>The prices stated in this quotation include <strong>special goodwill and commercial concessions offered solely for the purpose of private settlement</strong>. Such prices, including the prices of parts, labour and repair works, may be lower than the workshop's prevailing standard rates and <strong>shall not be regarded as the applicable rates for an insurance or third-party claim</strong>.<br><br>Should the matter subsequently proceed as an insurance or third-party claim, the private-settlement concessions stated herein shall no longer apply. Parts, labour and repair charges may instead be assessed based on the <strong>prevailing parts prices, supplier/OEM pricing, workshop rates, repair methodology, surveyor or insurer requirements and the actual scope of repairs applicable at the relevant time</strong>.<br><br>To preserve the vehicle in its pre-repair condition and comply with the applicable insurance inspection process, the damaged parts have <strong>not been dismantled, removed or disturbed</strong> at the time this quotation is prepared.<br><br>Accordingly, this quotation is based primarily on damage that is reasonably visible and identifiable during the initial inspection. <strong>Additional, consequential or hidden damage may only become apparent upon dismantling or during the course of repairs.</strong> Any additional parts, labour, materials or repairs subsequently found to be necessary shall be treated as supplementary items and charged accordingly.<br><br>In the event that the matter is referred to an insurer, solicitor, motor surveyor, loss adjuster or other claims representative, a <strong>separate repair quotation, supplementary quotation and/or final repair invoice may be issued</strong>, and the amount may differ from this private-settlement quotation.<br><br>Accordingly, the amount stated herein <strong>should not be relied upon as representing the final repair cost or quantum of any subsequent insurance or third-party claim</strong>.<br><br>This quotation does not constitute an admission of liability by any party.`;
  function ensureStyles(){if(byId('auaPrivateSettlementStyles'))return;const style=document.createElement('style');style.id='auaPrivateSettlementStyles';style.textContent=`.aua-remarks-presets{display:flex;align-items:center;gap:8px;margin-top:9px}.aua-private-settlement-btn{min-height:34px;padding:7px 11px;border:1px solid #cbd5e1!important;background:#f8fafc!important;color:#334155!important;font-size:10.5px}.aua-private-settlement-btn:hover{border-color:#94a3b8!important;background:#f1f5f9!important}`;document.head.appendChild(style)}
  function insertClause(){const editor=byId('auaRemarksEditor');if(!editor)return;const existing=String(editor.innerText||editor.textContent||'').toUpperCase();if(existing.includes(CLAUSE_KEY)){alert('Private Settlement wording is already included in Remarks.');return}const hasExisting=String(editor.innerText||editor.textContent||'').trim().length>0;editor.innerHTML=`${editor.innerHTML}${hasExisting?'<br><br>':''}${CLAUSE_HTML}`;editor.dispatchEvent(new Event('input',{bubbles:true}));editor.focus()}
  function install(attempt=0){ensureStyles();const editor=byId('auaRemarksEditor');if(!editor){if(attempt<20)setTimeout(()=>install(attempt+1),200);return}if(byId('auaPrivateSettlementButton'))return;const row=document.createElement('div');row.className='aua-remarks-presets';row.innerHTML='<button id="auaPrivateSettlementButton" class="btn outline aua-private-settlement-btn" type="button">Private Settlement</button>';editor.insertAdjacentElement('afterend',row);byId('auaPrivateSettlementButton').addEventListener('click',insertClause)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>install(),{once:true});else install()
})();

/* ===== quotation-readability.js ===== */
(function(){if(document.getElementById('auaQuotationReadabilityStyles'))return;const style=document.createElement('style');style.id='auaQuotationReadabilityStyles';style.textContent=`.paper .company-sub{font-size:12.75px;line-height:1.28}.paper .meta{font-size:12.25px;line-height:1.3}.paper .thead{font-size:10.25px}.paper .line{font-size:11.25px;line-height:1.32}.paper .sectitle{font-size:10.75px;line-height:1.3}.paper .adjust{font-size:10.75px;line-height:1.3}.paper .summary-head,.paper .summary-row{font-size:10.75px;line-height:1.3}.paper .totals{font-size:11.75px;line-height:1.3}.paper .remark-print{font-size:10.75px;line-height:1.55!important}.paper .notes{font-size:10px;line-height:1.4}`;document.head.appendChild(style)})();

/* ===== whatsapp-share-fix.js ===== */
// Reliable WhatsApp/PDF sharing.
// First click prepares the current PDF. On browsers that support file sharing,
// the second click invokes the native share sheet while user activation is intact.
(function(){
  let prepared=null;
  let preparing=false;

  function shareButton(){
    return document.querySelector('.aua-workspace-wa')
      || document.querySelector('button[onclick*="sharePdfWhatsApp"]');
  }

  function setButton(label,disabled=false){
    const button=shareButton();
    if(!button)return;
    button.textContent=label;
    button.disabled=disabled;
    button.dataset.auaWhatsappState=disabled?'preparing':(prepared?'ready':'idle');
  }

  function stableSignature(){
    try{
      const data=typeof window.state==='function'?window.state():{};
      const copy=JSON.parse(JSON.stringify(data||{}));
      delete copy.revisions;
      delete copy.revision;
      delete copy.audit;
      delete copy.archived;
      delete copy.archivedAt;
      delete copy.savedAt;
      delete copy.updatedAt;
      return JSON.stringify(copy);
    }catch{
      return [
        document.getElementById('customer')?.value||'',
        document.getElementById('vehicle')?.value||'',
        document.getElementById('date')?.value||''
      ].join('|');
    }
  }

  function nativeFileShareSupported(file){
    if(typeof navigator.share!=='function')return false;
    if(typeof navigator.canShare!=='function')return true;
    try{return navigator.canShare({files:[file]})}catch{return false}
  }

  async function preparePdf(sig){
    if(preparing)return null;
    preparing=true;
    setButton('Preparing PDF…',true);
    try{
      if(typeof window.makePdfBlob!=='function')throw new Error('PDF generator is not ready yet.');
      const blob=await window.makePdfBlob();
      if(!blob)throw new Error('PDF could not be created.');
      const latest=stableSignature();
      if(latest!==sig){
        prepared=null;
        setButton('WhatsApp PDF');
        throw new Error('Quotation changed while the PDF was being prepared. Please click WhatsApp again.');
      }
      const name=typeof window.pdfFileName==='function'?window.pdfFileName():'Quotation.pdf';
      const file=new File([blob],name,{type:'application/pdf'});
      prepared={sig,file,blob};
      setButton(nativeFileShareSupported(file)?'Share PDF Now':'WhatsApp PDF');
      return prepared;
    }finally{
      preparing=false;
      const button=shareButton();
      if(button)button.disabled=false;
    }
  }

  function fallbackDownloadAndWhatsApp(entry){
    const url=URL.createObjectURL(entry.blob);
    const anchor=document.createElement('a');
    anchor.href=url;
    anchor.download=entry.file.name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(()=>URL.revokeObjectURL(url),2500);

    const message=typeof window.whatsappMessage==='function'?window.whatsappMessage():'Quotation attached.';
    const popup=window.open('https://wa.me/?text='+encodeURIComponent(message),'_blank');
    if(!popup){
      alert('PDF downloaded. Please allow pop-ups, then attach the downloaded PDF in WhatsApp.');
    }
    prepared=null;
    setButton('WhatsApp PDF');
  }

  async function sharePrepared(entry){
    const title='Quotation - '+(
      document.getElementById('vehicle')?.value
      || document.getElementById('customer')?.value
      || "Alan's United"
    );
    const message=typeof window.whatsappMessage==='function'?window.whatsappMessage():'Quotation attached.';
    let promise;
    try{
      promise=navigator.share({title,text:message,files:[entry.file]});
    }catch(error){
      if(error?.name!=='AbortError')alert(error?.message||'Unable to share PDF.');
      return;
    }
    try{
      await promise;
      prepared=null;
      setButton('WhatsApp PDF');
    }catch(error){
      if(error?.name==='AbortError'){
        setButton('Share PDF Now');
        return;
      }
      setButton('Share PDF Now');
      if(!/user gesture|activation|notallowed/i.test(String(error?.message||''))){
        alert(error?.message||'Unable to share PDF.');
      }
    }
  }

  async function sharePdf(){
    if(preparing)return;
    const sig=stableSignature();

    if(prepared&&prepared.sig===sig){
      if(nativeFileShareSupported(prepared.file)){
        const entry=prepared;
        await sharePrepared(entry);
      }else{
        fallbackDownloadAndWhatsApp(prepared);
      }
      return;
    }

    prepared=null;
    if(typeof window.confirmValidation==='function')window.confirmValidation();

    try{
      const entry=await preparePdf(sig);
      if(!entry)return;
      if(!nativeFileShareSupported(entry.file))fallbackDownloadAndWhatsApp(entry);
      // Native file sharing intentionally waits for the user's next click.
    }catch(error){
      prepared=null;
      setButton('WhatsApp PDF');
      if(error?.message)alert(error.message);
    }
  }

  function invalidatePrepared(event){
    if(preparing||!prepared)return;
    if(event?.target?.closest?.('#auaHistoryOverlay,#auaVehicleMasterOverlay,#auaPreflightOverlay'))return;
    prepared=null;
    setButton('WhatsApp PDF');
  }

  function install(){
    window.sharePdfWhatsApp=sharePdf;
    const button=shareButton();
    if(button&&!button.dataset.auaWhatsappRuntime){
      button.dataset.auaWhatsappRuntime='1';
      button.textContent='WhatsApp PDF';
    }
    document.addEventListener('input',invalidatePrepared,true);
    document.addEventListener('change',invalidatePrepared,true);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
  window.addEventListener('load',()=>setTimeout(install,0),{once:true});
})();
