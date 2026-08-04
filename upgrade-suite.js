// Alan's United Auto - workflow upgrades: cleaner section controls, preflight checks,
// smarter local memory, vehicle recall, revision history and repeat-vehicle workflow.
(function(){
  const ITEMMETA='auaItemMetaV1', VEHICLEMEM='auaVehicleMemoryV1', REVISIONS='auaQuoteRevisionsV1';
  let applying=false;

  function esc(s){return String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]))}
  function read(key,fallback){try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback))}catch{return fallback}}
  function write(key,v){localStorage.setItem(key,JSON.stringify(v))}
  function money(n){return Number(n||0).toLocaleString('en-SG',{minimumFractionDigits:2,maximumFractionDigits:2})}

  // ---------- Section controls: compact dropdown ----------
  function tidySectionHeader(head){
    if(!head || head.dataset.compactSection==='1') return;
    const buttons=[...head.querySelectorAll(':scope > button')];
    if(buttons.length<3) return;
    const toggle=buttons[0];
    const extras=buttons.slice(1);
    const menu=document.createElement('details');
    menu.className='section-menu';
    menu.innerHTML='<summary title="Section options">⋮</summary><div class="section-menu-pop"></div>';
    const pop=menu.querySelector('.section-menu-pop');
    extras.forEach(b=>{b.classList.add('section-menu-action');pop.appendChild(b)});
    head.appendChild(menu);
    head.dataset.compactSection='1';
  }

  function injectStyle(){
    if(document.getElementById('auaUpgradeStyles'))return;
    const s=document.createElement('style');s.id='auaUpgradeStyles';s.textContent=`
      .section-menu{position:relative;margin-left:auto}.section-menu>summary{list-style:none;cursor:pointer;width:34px;height:34px;border:1px solid #d0d5dd;border-radius:8px;background:#fff;display:grid;place-items:center;font-weight:800;color:#475569}.section-menu>summary::-webkit-details-marker{display:none}.section-menu-pop{position:absolute;right:0;top:39px;z-index:20;min-width:150px;padding:7px;background:#fff;border:1px solid #d0d5dd;border-radius:10px;box-shadow:0 10px 24px rgba(15,23,42,.14);display:grid;gap:5px}.section-menu-action{width:100%;text-align:left!important;padding:8px 10px!important}.preflight-panel{border-left:4px solid #64748b}.preflight-ok{background:#f0fdf4;border:1px solid #bbf7d0;color:#166534;padding:9px;border-radius:8px;font-size:11px}.preflight-warn{background:#fff7ed;border:1px solid #fdba74;color:#9a3412;padding:9px;border-radius:8px;font-size:11px;line-height:1.45}.vehicle-suggest{font-size:10.5px;color:#1d4ed8;margin-top:5px;cursor:pointer}.revision-chip{font-size:10px;color:#64748b;margin-top:5px}.repeat-btn{margin-top:8px;width:100%}
    `;document.head.appendChild(s);
  }

  // ---------- Item smart memory ----------
  function captureItemMeta(){
    if(!window.S) return;
    const meta=read(ITEMMETA,{}), now=Date.now();
    S.forEach(sec=>sec.items.forEach(x=>{
      const d=String(x.d||'').trim(); if(!d) return;
      const k=d.toLowerCase(); const old=meta[k]||{description:d,prices:[],sections:{},units:{}};
      old.description=d; old.last=now;
      if(x.p!==''&&!x.included){const p=Number(x.p);if(Number.isFinite(p)&&p>0){old.prices=(old.prices||[]).concat(p).slice(-10)}}
      old.sections=old.sections||{};old.sections[sec.title]=(old.sections[sec.title]||0)+1;
      old.units=old.units||{};old.units[x.q||'1 pc']=(old.units[x.q||'1 pc']||0)+1;
      meta[k]=old;
    }));
    const keys=Object.keys(meta).sort((a,b)=>(meta[b].last||0)-(meta[a].last||0)).slice(0,400),out={};keys.forEach(k=>out[k]=meta[k]);write(ITEMMETA,out);
  }
  function modeKey(obj){return Object.entries(obj||{}).sort((a,b)=>b[1]-a[1])[0]?.[0]||''}
  function median(arr){if(!arr?.length)return 0;const a=[...arr].sort((x,y)=>x-y),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2}
  function enhanceMemoryList(){
    const dl=document.getElementById('itemMemoryList'); if(!dl)return;
    const meta=read(ITEMMETA,{}), existing=new Set([...dl.options].map(o=>o.value.toLowerCase()));
    Object.values(meta).sort((a,b)=>(b.last||0)-(a.last||0)).slice(0,200).forEach(m=>{
      if(existing.has(m.description.toLowerCase()))return;const o=document.createElement('option');o.value=m.description;const sec=modeKey(m.sections),unit=modeKey(m.units),med=median(m.prices);o.label=[sec,unit,med?`S$ ${money(med)}`:''].filter(Boolean).join(' · ');dl.appendChild(o);
    });
  }

  // ---------- Vehicle/customer memory ----------
  function captureVehicle(){
    const v=document.getElementById('vehicle')?.value.trim().toUpperCase(); if(!v)return;
    const mem=read(VEHICLEMEM,{});mem[v]={customer:customer.value.trim(),phone:phone.value.trim(),model:model.value.trim(),mileage:mileage.value.trim(),last:Date.now()};write(VEHICLEMEM,mem);
  }
  function vehicleRecall(){
    const input=document.getElementById('vehicle');if(!input)return;
    const v=input.value.trim().toUpperCase(),hit=read(VEHICLEMEM,{})[v],old=document.getElementById('vehicleRecallHint');if(old)old.remove();
    if(!hit)return;
    const hint=document.createElement('div');hint.id='vehicleRecallHint';hint.className='vehicle-suggest';hint.textContent=`Previous record found${hit.customer?' — '+hit.customer:''}. Click to fill blank details.`;
    hint.onclick=()=>{if(!customer.value)customer.value=hit.customer||'';if(!phone.value)phone.value=hit.phone||'';if(!model.value)model.value=hit.model||'';if(!mileage.value)mileage.value=hit.mileage||'';if(typeof upd==='function')upd();hint.textContent='Previous vehicle details loaded.'};
    input.parentElement.appendChild(hint);
  }

  // ---------- Quote checks ----------
  function quoteIssues(){
    const issues=[], seen=new Map(), meta=read(ITEMMETA,{});
    if(!String(customer.value||'').trim())issues.push('Customer name is blank.');
    S.forEach((sec,si)=>{
      const used=sec.items.filter(x=>String(x.d||'').trim()||String(x.p||'').trim());
      if(!used.length)issues.push(`${sec.title}: section is blank.`);
      let gross=0;
      used.forEach((x,ii)=>{
        const d=String(x.d||'').trim(),q=String(x.q||'').trim(),p=Number(x.p||0);
        if(!d)issues.push(`${sec.title}: item ${ii+1} has no description.`);
        if(!x.included&&d&&!(p>0))issues.push(`${sec.title}: ${d} has no price.`);
        if(d&&!q)issues.push(`${sec.title}: ${d} has no quantity/unit.`);
        const key=d.toLowerCase();if(key){if(seen.has(key))issues.push(`Possible duplicate item: ${d}.`);else seen.set(key,true)}
        if(!x.included&&p>0){gross+=(parseFloat(q)||1)*p;const med=median(meta[key]?.prices);if(med>0&&(p>med*3||p<med/3))issues.push(`${d}: S$${money(p)} is far from your usual price around S$${money(med)}. Please verify.`)}
        if(x.dt==='percent'&&Number(x.dv)>100)issues.push(`${d}: item discount is over 100%.`);
      });
      if(sec.dt==='percent'&&Number(sec.dv)>100)issues.push(`${sec.title}: section discount is over 100%.`);
      if(sec.dt==='dollar'&&Number(sec.dv)>gross&&gross>0)issues.push(`${sec.title}: section discount exceeds section value.`);
    });
    if(overallType.value==='percent'&&Number(overallDisc.value)>100)issues.push('Overall discount is over 100%.');
    return [...new Set(issues)];
  }
  function renderPreflight(){
    const box=document.getElementById('preflightResult');if(!box)return true;const issues=quoteIssues();
    box.innerHTML=issues.length?`<div class="preflight-warn"><b>${issues.length} item${issues.length===1?'':'s'} to check</b><br>${issues.map(x=>'• '+esc(x)).join('<br>')}</div>`:'<div class="preflight-ok">✓ No obvious quotation errors detected.</div>';
    return !issues.length;
  }
  function installPreflightPanel(){
    if(document.getElementById('preflightPanel'))return;
    const remarks=document.querySelector('.remarks-panel');if(!remarks)return;
    const p=document.createElement('div');p.id='preflightPanel';p.className='panel preflight-panel';p.innerHTML='<div class="panel-title">QUOTE CHECK</div><button id="runPreflight" class="btn secondary" style="width:100%">Check Quotation</button><div id="preflightResult" style="margin-top:8px"></div>';
    remarks.parentNode.insertBefore(p,remarks.nextSibling);document.getElementById('runPreflight').onclick=renderPreflight;
  }

  // ---------- Revisions ----------
  function saveRevision(){
    if(typeof state!=='function')return;const d=state(),key=(String(d.customer||'')+'|'+String(d.vehicle||'')).toLowerCase();if(key==='|')return;
    const all=read(REVISIONS,{}),arr=all[key]||[];arr.unshift({ts:Date.now(),data:d,total:typeof totals==='function'?totals().grand:0});all[key]=arr.slice(0,10);write(REVISIONS,all);
  }
  function revisionCount(){const key=(customer.value+'|'+vehicle.value).toLowerCase();return (read(REVISIONS,{})[key]||[]).length}
  function showRevisionChip(){
    let chip=document.getElementById('revisionChip');const action=document.querySelector('.action-panel');if(!action)return;if(!chip){chip=document.createElement('div');chip.id='revisionChip';chip.className='revision-chip';action.appendChild(chip)}const n=revisionCount();chip.textContent=n?`${n} saved revision${n===1?'':'s'} for this customer/vehicle.`:'No saved revisions for this customer/vehicle yet.';
  }

  // ---------- Repeat vehicle quote ----------
  function repeatVehicleQuote(){
    const keep={customer:customer.value,phone:phone.value,vehicle:vehicle.value,model:model.value,mileage:mileage.value};
    if(!confirm('Start a new quotation for the same customer and vehicle? Current items will be cleared.'))return;
    S.splice(0,S.length,section());overallDisc.value='';remarks.value='';date.value=new Date().toISOString().slice(0,10);
    Object.entries(keep).forEach(([k,v])=>{const e=document.getElementById(k);if(e)e.value=v});render();upd();
  }
  function installRepeatButton(){
    const action=document.querySelector('.action-panel');if(!action||document.getElementById('repeatVehicleBtn'))return;
    const b=document.createElement('button');b.id='repeatVehicleBtn';b.className='btn outline repeat-btn';b.textContent='↻ New Quote — Same Vehicle';b.onclick=repeatVehicleQuote;action.appendChild(b);
  }

  // ---------- Wrap save/send actions ----------
  function wrapActions(){
    if(window.__auaWrapped)return;window.__auaWrapped=true;
    if(typeof window.saveRecord==='function'){const old=window.saveRecord;window.saveRecord=function(){captureItemMeta();captureVehicle();saveRevision();const r=old.apply(this,arguments);showRevisionChip();enhanceMemoryList();return r}}
    if(typeof window.downloadPdf==='function'){const old=window.downloadPdf;window.downloadPdf=async function(){captureItemMeta();captureVehicle();const ok=renderPreflight();if(!ok&&!confirm('The quote checker found possible issues. Continue to PDF anyway?'))return;saveRevision();showRevisionChip();return old.apply(this,arguments)}}
    if(typeof window.sharePdfWhatsApp==='function'){const old=window.sharePdfWhatsApp;window.sharePdfWhatsApp=async function(){captureItemMeta();captureVehicle();const ok=renderPreflight();if(!ok&&!confirm('The quote checker found possible issues. Continue to WhatsApp anyway?'))return;saveRevision();showRevisionChip();return old.apply(this,arguments)}}
  }

  function apply(){if(applying)return;applying=true;requestAnimationFrame(()=>{document.querySelectorAll('.section-head').forEach(tidySectionHeader);enhanceMemoryList();showRevisionChip();applying=false})}
  function install(){
    injectStyle();installPreflightPanel();installRepeatButton();wrapActions();apply();
    const v=document.getElementById('vehicle');if(v){v.addEventListener('change',vehicleRecall);v.addEventListener('blur',vehicleRecall)}
    ['customer','vehicle'].forEach(id=>document.getElementById(id)?.addEventListener('input',showRevisionChip));
    const target=document.getElementById('sections')||document.body;new MutationObserver(apply).observe(target,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,150));else setTimeout(install,150);
})();