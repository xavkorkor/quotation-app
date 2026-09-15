// Alan's United Auto - workflow suite
// Smart vehicle history, reusable job templates, pre-send checks and quotation revisions.
(function(){
  const $=id=>document.getElementById(id);
  const clone=value=>{try{return JSON.parse(JSON.stringify(value))}catch{return value}};
  const text=value=>String(value??'').trim();
  const esc=value=>String(value??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const normVehicle=value=>text(value).toUpperCase().replace(/[^A-Z0-9]/g,'');
  const normDesc=value=>text(value).toUpperCase().replace(/\s+/g,' ');
  const money=value=>Number(value||0).toLocaleString('en-SG',{minimumFractionDigits:2,maximumFractionDigits:2});
  const TEMPLATE_KEY='auaJobTemplatesV1';
  const MAX_REVISIONS=25;
  let revisions=[];
  let revisionHooksInstalled=false;
  let baseState=null,baseLoadRecord=null,baseNewQuote=null,baseDuplicateQuote=null;
  let pdfInspectionInstalled=false,lastPdfInspection=null;

  function records(){try{return typeof getRecent==='function'?(getRecent()||[]):[]}catch{return[]}}
  function staffName(){
    const raw=text($('cloudUser')?.textContent).replace(/^Signed in as\s+/i,'');
    const email=raw.toLowerCase();
    if(email.includes('xavkqw@gmail.com'))return'Xavier';
    if(email.includes('khong.shijie@gmail.com'))return'Shijie';
    return raw||'Staff';
  }
  function markAutofill(el){if(el&&text(el.value))el.dataset.auaHistoryAutofill='1'}
  function setField(id,value,mark=true){const el=$(id);if(!el||value===undefined||value===null||value==='')return;el.value=String(value);if(mark)markAutofill(el)}

  function addStyles(){
    if($('auaWorkflowSuiteStyles'))return;
    const style=document.createElement('style');
    style.id='auaWorkflowSuiteStyles';
    style.textContent=`
      #auaVehicleSuggestion{display:none!important}
      .aua-smart-vehicle{display:none;margin-top:7px;padding:10px;border:1px solid #bfdbfe;border-radius:10px;background:#f8fbff;box-shadow:0 5px 18px rgba(37,99,235,.07)}
      .aua-smart-vehicle.show{display:block}.aua-smart-vehicle-head{display:flex;justify-content:space-between;gap:10px;align-items:center}.aua-smart-vehicle-title{font-size:12px;font-weight:900;color:#172033}.aua-smart-vehicle-count{font-size:9.5px;font-weight:800;color:#2563eb}.aua-smart-vehicle-meta{margin-top:3px;color:#64748b;font-size:10.5px}.aua-smart-vehicle-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}.aua-smart-vehicle-actions button{min-height:31px;padding:6px 9px;font-size:9.5px}.aua-smart-vehicle-matches{display:grid;gap:5px}.aua-smart-match{width:100%;display:flex;justify-content:space-between;gap:10px;align-items:center;padding:8px 9px;border:1px solid #dbe5f0;border-radius:8px;background:#fff;color:#334155;text-align:left;cursor:pointer}.aua-smart-match b{font-size:11px}.aua-smart-match span{font-size:9.5px;color:#64748b}
      .aua-sections-topbar{gap:8px}.aua-template-trigger{margin-left:auto}.aua-sections-topbar #auaAddSectionTop{margin-left:0!important}.aua-template-panel{display:none;margin:0 0 10px;padding:11px;border:1px solid #d9e3ee;border-radius:10px;background:#fff}.aua-template-panel.show{display:block}.aua-template-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:9px}.aua-template-head b{font-size:11px;color:#334155}.aua-template-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.aua-template-card{display:flex;align-items:center;justify-content:space-between;gap:7px;border:1px solid #dbe3ed;border-radius:9px;padding:8px;background:#f8fafc}.aua-template-use{flex:1;border:0;background:transparent;text-align:left;cursor:pointer;color:#172033}.aua-template-use b{display:block;font-size:10.5px}.aua-template-use span{display:block;margin-top:2px;font-size:8.5px;color:#64748b}.aua-template-delete{border:0;background:transparent;color:#94a3b8;cursor:pointer;font-size:14px}.aua-template-foot{display:flex;gap:7px;align-items:center;margin-top:9px;padding-top:9px;border-top:1px solid #eef2f7}.aua-template-foot .btn{font-size:9.5px;min-height:31px}
      .aua-revision-strip{display:flex;gap:8px;align-items:center;margin-top:9px;padding:7px 9px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;font-size:9.5px;color:#64748b}.aua-revision-strip b{color:#334155}.aua-revision-dirty{color:#b45309!important}.aua-pdf-revision{font-weight:700}
      .aua-ready-button{width:100%;margin-top:9px;min-height:36px;background:#eef6ff!important;color:#1d4ed8!important;border:1px solid #bfdbfe!important}
      .aua-preflight-overlay{position:fixed;inset:0;z-index:16000;display:none;place-items:center;padding:18px;background:rgba(15,23,42,.55)}.aua-preflight-overlay.show{display:grid}.aua-preflight-card{width:min(620px,100%);max-height:min(760px,90vh);overflow:auto;border-radius:16px;background:#fff;box-shadow:0 28px 80px rgba(15,23,42,.3)}.aua-preflight-head{padding:18px 20px;border-bottom:1px solid #e2e8f0}.aua-preflight-head h3{margin:0;font-size:19px;color:#0f2747}.aua-preflight-head p{margin:4px 0 0;font-size:10.5px;color:#64748b}.aua-preflight-body{padding:16px 20px}.aua-preflight-status{padding:11px;border-radius:10px;font-size:11px;font-weight:800}.aua-preflight-status.good{background:#ecfdf3;color:#166534;border:1px solid #bbf7d0}.aua-preflight-status.bad{background:#fff1f2;color:#9f1239;border:1px solid #fecdd3}.aua-preflight-status.warn{background:#fffbeb;color:#92400e;border:1px solid #fde68a}.aua-preflight-group{margin-top:13px}.aua-preflight-group b{font-size:10px;text-transform:uppercase;color:#475569}.aua-preflight-group ul{margin:6px 0 0;padding-left:20px;font-size:10.5px;line-height:1.5;color:#475569}.aua-preflight-foot{display:flex;justify-content:flex-end;padding:13px 20px;border-top:1px solid #e2e8f0}
      .aua-history-revisions{margin:14px 0;padding:12px;border:1px solid #dbe3ed;border-radius:11px;background:#f8fafc}.aua-history-revisions-title{display:flex;justify-content:space-between;align-items:center;margin-bottom:7px}.aua-history-revisions-title b{font-size:10px;color:#334155;text-transform:uppercase}.aua-history-revisions-title span{font-size:9px;color:#64748b}.aua-history-revision{padding:8px 0;border-top:1px solid #e5eaf0}.aua-history-revision:first-of-type{border-top:0}.aua-history-revision summary{cursor:pointer;font-size:10px;font-weight:800;color:#334155}.aua-history-revision-meta{margin:3px 0 5px;font-size:8.8px;color:#64748b}.aua-history-revision ul{margin:0;padding-left:17px;font-size:9.5px;line-height:1.45;color:#475569}
      @media(max-width:620px){.aua-template-grid{grid-template-columns:1fr}.aua-smart-vehicle-actions{display:grid;grid-template-columns:1fr}.aua-smart-vehicle-actions button{width:100%}}
      @media print{.aua-smart-vehicle,.aua-template-panel,.aua-revision-strip,.aua-preflight-overlay{display:none!important}}
    `;
    document.head.appendChild(style);
  }

  // Smart vehicle/customer history lookup.
  function groupedVehicleMatches(query){
    const key=normVehicle(query);if(!key)return[];
    const groups=new Map();
    records().slice().sort((a,b)=>Number(b.ts||0)-Number(a.ts||0)).forEach(record=>{
      const vehicle=text(record?.data?.vehicle),vkey=normVehicle(vehicle);
      if(!vkey||!vkey.includes(key))return;
      if(!groups.has(vkey))groups.set(vkey,{vehicle,records:[]});
      groups.get(vkey).records.push(record);
    });
    return Array.from(groups.values()).sort((a,b)=>Number(b.records[0]?.ts||0)-Number(a.records[0]?.ts||0));
  }
  function renderSmartVehicle(){
    const input=$('vehicle'),box=$('auaSmartVehicleLookup');if(!input||!box)return;
    const key=normVehicle(input.value);if(key.length<2){box.classList.remove('show');box.innerHTML='';return}
    const groups=groupedVehicleMatches(key),exact=groups.find(g=>normVehicle(g.vehicle)===key);
    if(exact){
      const latest=exact.records[0],d=latest?.data||{},count=exact.records.length;
      box.innerHTML=`<div class="aua-smart-vehicle-head"><div class="aua-smart-vehicle-title">${esc(exact.vehicle)}</div><div class="aua-smart-vehicle-count">${count} previous quotation${count===1?'':'s'}</div></div><div class="aua-smart-vehicle-meta">${esc(d.customer||'Customer not recorded')}${d.model?' · '+esc(d.model):''}</div><div class="aua-smart-vehicle-actions"><button class="btn outline" type="button" data-aua-vehicle-action="details">Use Customer Details</button><button class="btn outline" type="button" data-aua-vehicle-action="history">View History</button><button class="btn secondary" type="button" data-aua-vehicle-action="copy">Copy Previous Quote</button></div>`;
      box.classList.add('show');
      box.querySelector('[data-aua-vehicle-action="details"]').onclick=()=>useCustomerDetails(latest);
      box.querySelector('[data-aua-vehicle-action="history"]').onclick=()=>openVehicleHistory(exact.vehicle);
      box.querySelector('[data-aua-vehicle-action="copy"]').onclick=()=>copyPreviousQuote(latest,exact.vehicle);
      return;
    }
    const matches=groups.slice(0,5);
    if(!matches.length){box.classList.remove('show');box.innerHTML='';return}
    box.innerHTML=`<div class="aua-smart-vehicle-matches">${matches.map(g=>{const d=g.records[0]?.data||{};return`<button class="aua-smart-match" type="button" data-aua-vehicle-match="${esc(g.vehicle)}"><b>${esc(g.vehicle)}</b><span>${esc(d.customer||d.model||'Previous quotation')} · ${g.records.length}</span></button>`}).join('')}</div>`;
    box.classList.add('show');
    box.querySelectorAll('[data-aua-vehicle-match]').forEach(button=>button.onclick=()=>{input.value=button.dataset.auaVehicleMatch||'';input.dispatchEvent(new Event('input',{bubbles:true}));renderSmartVehicle()});
  }
  function useCustomerDetails(record){
    const d=record?.data||{};setField('customer',d.customer);setField('phone',d.phone);setField('model',d.model);if(typeof upd==='function')upd();
    $('auaSmartVehicleLookup')?.classList.remove('show');
  }
  async function openVehicleHistory(vehicle){
    if(typeof window.auaOpenHistory==='function')await window.auaOpenHistory();
    for(let i=0;i<30;i++){
      const search=$('auaHistorySearch');if(search){search.value=vehicle;search.dispatchEvent(new Event('input',{bubbles:true}));return}
      await new Promise(r=>setTimeout(r,100));
    }
  }
  function copyPreviousQuote(record,vehicle){
    if(!record?.data||typeof loadRecord!=='function')return;
    if(!confirm(`Copy the latest quotation items for ${vehicle} into this new quotation?`))return;
    const data=clone(record.data),currentQuote=text($('auaQuoteNumber')?.value),today=new Date().toISOString().slice(0,10);
    data.quoteNumber=currentQuote||undefined;data.status='Draft';data.date=today;data.vehicle=vehicle;data.mileage='';data.revisions=[];data.revision=0;data.audit={createdBy:'',createdAt:'',lastEditedBy:'',lastEditedAt:''};delete data.archived;delete data.archivedAt;
    loadRecord(data);
    setTimeout(()=>{if($('vehicle'))$('vehicle').value=vehicle;if($('date'))$('date').value=today;if($('mileage'))$('mileage').value='';if(typeof upd==='function')upd();renderSmartVehicle()},0);
  }
  function installSmartVehicle(){
    const input=$('vehicle');if(!input||$('auaSmartVehicleLookup'))return;
    const box=document.createElement('div');box.id='auaSmartVehicleLookup';box.className='aua-smart-vehicle';(input.parentElement||input).appendChild(box);
    input.addEventListener('input',()=>setTimeout(renderSmartVehicle,0));input.addEventListener('focus',()=>setTimeout(renderSmartVehicle,0));
    document.addEventListener('click',event=>{if(!box.contains(event.target)&&event.target!==input)box.classList.remove('show')});
    document.addEventListener('aua-history-updated',()=>{if(document.activeElement===input)renderSmartVehicle()});
  }

  // Favourite/reusable workshop job templates.
  const BUILTIN_TEMPLATES=[
    {id:'service',name:'Normal Servicing',section:{title:'NORMAL SERVICING',items:[{q:'',d:'ENGINE OIL',p:''},{q:'',d:'OIL FILTER',p:''},{q:'',d:'LABOUR',p:''}]}},
    {id:'brakes',name:'Brake Pad Replacement',section:{title:'BRAKE REPAIR',items:[{q:'',d:'BRAKE PADS',p:''},{q:'',d:'LABOUR',p:''}]}},
    {id:'aircon-coil',name:'Aircon Cooling Coil',section:{title:'AIRCON REPAIR',items:[{q:'',d:'COOLING COIL',p:''},{q:'',d:'EXPANSION VALVE',p:''},{q:'',d:'AIRCON GAS',p:''},{q:'',d:'LABOUR',p:''}]}}
  ];
  function customTemplates(){try{const value=JSON.parse(localStorage.getItem(TEMPLATE_KEY)||'[]');return Array.isArray(value)?value:[]}catch{return[]}}
  function saveCustomTemplates(list){localStorage.setItem(TEMPLATE_KEY,JSON.stringify(list.slice(0,30)))}
  function templateItemCount(t){return Array.isArray(t?.section?.items)?t.section.items.filter(x=>text(x?.d)||text(x?.p)).length:0}
  function templatePanelHtml(){
    const all=[...BUILTIN_TEMPLATES,...customTemplates()];
    return `<div class="aua-template-head"><b>FAVOURITE JOB TEMPLATES</b><button id="auaTemplateClose" class="btn outline" type="button">Close</button></div><div class="aua-template-grid">${all.map(t=>`<div class="aua-template-card"><button class="aua-template-use" type="button" data-aua-template="${esc(t.id)}"><b>${esc(t.name)}</b><span>${templateItemCount(t)} item${templateItemCount(t)===1?'':'s'}${String(t.id).startsWith('custom-')?' · Saved template':' · Built-in'}</span></button>${String(t.id).startsWith('custom-')?`<button class="aua-template-delete" type="button" title="Delete template" data-aua-template-delete="${esc(t.id)}">×</button>`:''}</div>`).join('')}</div><div class="aua-template-foot"><button id="auaSaveSectionTemplate" class="btn outline" type="button">★ Save Current Section as Template</button></div>`;
  }
  function renderTemplatePanel(){
    const panel=$('auaTemplatePanel');if(!panel)return;panel.innerHTML=templatePanelHtml();
    $('auaTemplateClose').onclick=()=>panel.classList.remove('show');
    panel.querySelectorAll('[data-aua-template]').forEach(button=>button.onclick=()=>insertTemplate(button.dataset.auaTemplate));
    panel.querySelectorAll('[data-aua-template-delete]').forEach(button=>button.onclick=()=>deleteTemplate(button.dataset.auaTemplateDelete));
    $('auaSaveSectionTemplate').onclick=saveCurrentSectionTemplate;
  }
  function selectedSectionIndex(){
    try{if(typeof activeItem!=='undefined'&&activeItem&&Number.isInteger(activeItem.i)&&S[activeItem.i])return activeItem.i}catch{}
    if(typeof S!=='undefined'&&S.length===1)return 0;if(typeof S==='undefined'||!S.length)return 0;
    const choices=S.map((s,i)=>`${i+1}. ${s.title||'Section'}`).join('\n'),answer=prompt(`Which section do you want to save as a template?\n\n${choices}`,'1'),index=Number(answer)-1;
    return Number.isInteger(index)&&S[index]?index:-1;
  }
  function saveCurrentSectionTemplate(){
    if(typeof S==='undefined'||!S.length)return;const index=selectedSectionIndex();if(index<0)return;
    const source=S[index],hasItems=(source.items||[]).some(x=>text(x.d)||text(x.p));if(!hasItems){alert('Add at least one quotation item before saving a template.');return}
    const name=text(prompt('Template name:',source.title||'Workshop Job'));if(!name)return;
    const list=customTemplates();list.unshift({id:`custom-${Date.now()}`,name,section:clone(source),savedAt:new Date().toISOString()});saveCustomTemplates(list);renderTemplatePanel();
  }
  function deleteTemplate(id){saveCustomTemplates(customTemplates().filter(t=>t.id!==id));renderTemplatePanel()}
  function isBlankSection(s){return!!s&&!(s.items||[]).some(x=>text(x.d)||text(x.p))}
  function insertTemplate(id){
    if(typeof S==='undefined'||typeof section!=='function')return;const template=[...BUILTIN_TEMPLATES,...customTemplates()].find(t=>t.id===id);if(!template)return;
    const next=section(clone(template.section));if(S.length===1&&isBlankSection(S[0]))S.splice(0,1,next);else S.push(next);
    if(typeof render==='function')render();if(typeof upd==='function')upd();$('auaTemplatePanel')?.classList.remove('show');
  }
  function installTemplates(){
    const top=document.querySelector('.sections-panel .aua-sections-topbar');if(!top||$('auaTemplateTrigger'))return;
    const trigger=document.createElement('button');trigger.id='auaTemplateTrigger';trigger.className='btn outline aua-template-trigger';trigger.type='button';trigger.textContent='★ Job Templates';
    top.insertBefore(trigger,$('auaAddSectionTop')||null);
    const panel=document.createElement('div');panel.id='auaTemplatePanel';panel.className='aua-template-panel';top.insertAdjacentElement('afterend',panel);renderTemplatePanel();
    trigger.onclick=()=>{panel.classList.toggle('show');if(panel.classList.contains('show'))renderTemplatePanel()};
  }

  // Revision history stored inside the existing quotation record.
  function normalizeRevision(entry,index){
    const rev=Number(entry?.rev)||index+1;return{rev,at:text(entry?.at),by:text(entry?.by)||'Staff',summary:Array.isArray(entry?.summary)?entry.summary.map(text).filter(Boolean):[text(entry?.summary)].filter(Boolean),snapshot:clone(entry?.snapshot||{}),signature:text(entry?.signature)};
  }
  function currentBaseSnapshot(){
    if(typeof baseState!=='function')return{};const data=clone(baseState());delete data.revisions;delete data.revision;delete data.audit;delete data.archived;delete data.archivedAt;
    try{data._grand=Number(typeof totals==='function'?totals().grand:0)}catch{data._grand=0}return data;
  }
  function signatureOf(snapshot){try{return JSON.stringify(snapshot)}catch{return''}}
  function flatItems(snapshot){
    const map=new Map();(snapshot?.sections||[]).forEach((s,si)=>(s.items||[]).forEach((x,ii)=>{const d=normDesc(x.d||x.desc);if(!d)return;map.set(`${si}|${d}`,{d,q:text(x.q??x.qty),p:Number(x.p??x.price||0),included:!!x.included,section:text(s.title),index:ii})}));return map;
  }
  function summarizeChanges(previous,current){
    if(!previous||!Object.keys(previous).length)return['Initial saved quotation'];const changes=[];
    [['customer','Customer'],['vehicle','Vehicle'],['model','Model'],['phone','Phone'],['mileage','Mileage'],['date','Date'],['status','Status']].forEach(([key,label])=>{if(text(previous[key])!==text(current[key]))changes.push(`${label} changed`)});
    if(Boolean(previous.gstOn)!==Boolean(current.gstOn))changes.push('GST setting changed');
    if(text(previous.overallType)!==text(current.overallType)||text(previous.overallDisc)!==text(current.overallDisc))changes.push('Overall discount changed');
    if(text(previous.remarks)!==text(current.remarks)||text(previous.remarksRich)!==text(current.remarksRich))changes.push('Remarks changed');
    if(Math.abs(Number(previous._grand||0)-Number(current._grand||0))>.009)changes.push(`Total S$ ${money(previous._grand)} → S$ ${money(current._grand)}`);
    const a=flatItems(previous),b=flatItems(current);
    b.forEach((item,key)=>{if(!a.has(key))changes.push(`Added: ${item.d}`);else{const old=a.get(key);if(old.p!==item.p)changes.push(`${item.d}: S$ ${money(old.p)} → S$ ${money(item.p)}`);else if(old.q!==item.q)changes.push(`${item.d}: quantity changed`)}});
    a.forEach((item,key)=>{if(!b.has(key))changes.push(`Removed: ${item.d}`)});
    if(!changes.length)changes.push('Quotation updated');const unique=[...new Set(changes)];return unique.length>6?[...unique.slice(0,6),`+ ${unique.length-6} more change${unique.length-6===1?'':'s'}`]:unique;
  }
  function latestRevision(){return revisions[revisions.length-1]||null}
  function revisionDirty(){const last=latestRevision();if(!last)return true;return signatureOf(currentBaseSnapshot())!==(last.signature||signatureOf(last.snapshot))}
  function updateRevisionUi(){
    let strip=$('auaRevisionStrip');const panel=$('auaQuoteWorkflowPanel');if(panel&&!strip){strip=document.createElement('div');strip.id='auaRevisionStrip';strip.className='aua-revision-strip';panel.appendChild(strip)}
    const last=latestRevision(),dirty=revisionDirty();if(strip)strip.innerHTML=last?`<span>Revision</span><b>Rev ${last.rev}</b><span class="${dirty?'aua-revision-dirty':''}">${dirty?'Unsaved changes':'Saved'}</span>`:'<span>Revision</span><b>Not saved yet</b>';
    const quoteWrap=$('pQuoteNumberWrap');if(quoteWrap&&!$('pRevisionWrap')){const span=document.createElement('span');span.id='pRevisionWrap';span.className='aua-pdf-revision';quoteWrap.appendChild(span)}
    const p=$('pRevisionWrap');if(p){if(!last)p.textContent='';else if(dirty)p.textContent='  |  Revision: UNSAVED DRAFT';else p.textContent=`  |  Revision: Rev ${last.rev}`}
  }
  function stageRevision(){
    const snapshot=currentBaseSnapshot(),sig=signatureOf(snapshot),last=latestRevision();if(last&&(last.signature||signatureOf(last.snapshot))===sig)return false;
    revisions.push({rev:(Number(last?.rev)||0)+1,at:new Date().toISOString(),by:staffName(),summary:summarizeChanges(last?.snapshot,snapshot),snapshot,signature:sig});
    if(revisions.length>MAX_REVISIONS)revisions=revisions.slice(-MAX_REVISIONS);updateRevisionUi();return true;
  }
  function installRevisionHooks(){
    if(revisionHooksInstalled)return true;
    if(document.readyState!=='complete'||typeof window.state!=='function'||typeof window.loadRecord!=='function'||typeof window.saveRecord!=='function')return false;
    revisionHooksInstalled=true;baseState=window.state;baseLoadRecord=window.loadRecord;baseNewQuote=window.newQuote;baseDuplicateQuote=window.duplicateQuote;
    window.state=function(){const data=baseState.apply(this,arguments);data.revisions=clone(revisions);data.revision=Number(latestRevision()?.rev||0);return data};
    window.loadRecord=function(data){revisions=Array.isArray(data?.revisions)?data.revisions.map(normalizeRevision):[];const result=baseLoadRecord.apply(this,arguments);setTimeout(updateRevisionUi,0);return result};
    if(typeof baseNewQuote==='function')window.newQuote=function(){const before=signatureOf(currentBaseSnapshot()),result=baseNewQuote.apply(this,arguments);setTimeout(()=>{if(signatureOf(currentBaseSnapshot())!==before){revisions=[];updateRevisionUi()}},80);return result};
    if(typeof baseDuplicateQuote==='function')window.duplicateQuote=function(){const result=baseDuplicateQuote.apply(this,arguments);setTimeout(()=>{revisions=[];updateRevisionUi()},80);return result};
    const baseSave=window.saveRecord;
    window.saveRecord=async function(){const before=clone(revisions);stageRevision();try{const result=await baseSave.apply(this,arguments);if(result===false){revisions=before;updateRevisionUi()}return result}catch(error){revisions=before;updateRevisionUi();throw error}};
    document.addEventListener('input',()=>requestAnimationFrame(updateRevisionUi),true);document.addEventListener('change',()=>requestAnimationFrame(updateRevisionUi),true);updateRevisionUi();return true;
  }
  function revisionDate(value){const d=new Date(value||0);return Number.isNaN(d.getTime())?'':d.toLocaleString('en-SG',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}
  function decorateHistoryRevisions(){
    const preview=$('auaHistoryPreview'),selected=document.querySelector('.aua-history-row.selected[data-aua-key]');if(!preview)return;
    preview.querySelector('.aua-history-revisions')?.remove();if(!selected)return;
    const record=records().find(r=>String(r?.key||'')===String(selected.dataset.auaKey||'')),list=Array.isArray(record?.data?.revisions)?record.data.revisions.map(normalizeRevision):[];if(!list.length)return;
    const card=document.createElement('section');card.className='aua-history-revisions';card.innerHTML=`<div class="aua-history-revisions-title"><b>Revision History</b><span>${list.length} revision${list.length===1?'':'s'}</span></div>${list.slice().reverse().map((r,i)=>`<details class="aua-history-revision" ${i===0?'open':''}><summary>Rev ${r.rev} · ${esc(r.by||'Staff')}</summary><div class="aua-history-revision-meta">${esc(revisionDate(r.at))}</div><ul>${(r.summary?.length?r.summary:['Saved quotation']).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></details>`).join('')}`;
    const items=preview.querySelector('.aua-history-items'),stats=preview.querySelector('.aua-history-stats');if(items)preview.insertBefore(card,items);else if(stats)stats.insertAdjacentElement('afterend',card);else preview.appendChild(card);
  }
  function installHistoryRevisionObserver(){
    const attach=()=>{const preview=$('auaHistoryPreview');if(!preview||preview.dataset.auaRevisionObserved)return false;preview.dataset.auaRevisionObserved='1';new MutationObserver(()=>queueMicrotask(decorateHistoryRevisions)).observe(preview,{childList:true,subtree:true});decorateHistoryRevisions();return true};
    if(attach())return;const observer=new MutationObserver(()=>{if(attach())observer.disconnect()});observer.observe(document.body,{childList:true,subtree:true});document.addEventListener('aua-history-updated',()=>setTimeout(decorateHistoryRevisions,0));
  }

  // Ready-to-send preflight. Blank/zero quantity is intentionally valid for labour.
  function collectQuoteIssues(){
    const errors=[],warnings=[],seen=new Map();let used=0;
    try{(S||[]).forEach((sectionData,si)=>(sectionData.items||[]).forEach((itemData,ii)=>{
      const d=text(itemData.d||itemData.desc),p=text(itemData.p??itemData.price),included=!!itemData.included;if(!d&&!p)return;used++;
      if(d&&!included&&p==='')errors.push(`${sectionData.title||'Section '+(si+1)}: ${d} has no price.`);
      if(p!==''&&!d)errors.push(`${sectionData.title||'Section '+(si+1)}: item ${ii+1} has a price but no description.`);
      if(d){const key=`${si}|${normDesc(d)}`;if(!seen.has(key))seen.set(key,{description:normDesc(d),section:sectionData.title||`Section ${si+1}`,count:0});seen.get(key).count++}
    }));}catch{}
    if(!used)errors.push('No quotation items have been entered.');
    seen.forEach(info=>{if(info.count>1)warnings.push(`Duplicate item in ${info.section}: ${info.description} appears ${info.count} times.`)});
    try{const audit=typeof window.auaCalculationAudit==='function'?window.auaCalculationAudit(false):null;if(audit&&!audit.ok)(audit.issues||[]).forEach(issue=>errors.push(issue))}catch{}
    return{errors:[...new Set(errors)],warnings:[...new Set(warnings)]};
  }
  function layoutInspection(){
    const paper=document.querySelector('.paper');if(!paper)return{estimatedPages:1,contentBottomMm:0,horizontalOverflow:false};
    const rect=paper.getBoundingClientRect(),mmPerPx=rect.width?210/rect.width:0;let bottom=0,horizontalOverflow=false;
    Array.from(paper.children).forEach(child=>{const style=getComputedStyle(child);if(style.display==='none'||style.visibility==='hidden')return;const r=child.getBoundingClientRect();bottom=Math.max(bottom,r.bottom-rect.top);if(r.left<rect.left-2||r.right>rect.right+2)horizontalOverflow=true});
    const contentBottomMm=bottom*mmPerPx,estimatedPages=Math.max(1,Math.ceil(Math.max(0,contentBottomMm-.5)/297));return{estimatedPages,contentBottomMm,horizontalOverflow};
  }
  async function inspectPdfBlob(blob){
    let actualPages=0;try{const bytes=new Uint8Array(await blob.arrayBuffer()),source=new TextDecoder('latin1').decode(bytes);actualPages=(source.match(/\/Type\s*\/Page\b/g)||[]).length}catch{}
    const layout=layoutInspection(),blankTrailing=actualPages>1&&layout.contentBottomMm<=296.5?actualPages-1:Math.max(0,actualPages-layout.estimatedPages-1);
    return{actualPages:actualPages||layout.estimatedPages,blankTrailing,estimatedPages:layout.estimatedPages,contentBottomMm:layout.contentBottomMm,horizontalOverflow:layout.horizontalOverflow};
  }
  function installPdfInspection(){
    if(pdfInspectionInstalled)return true;if(typeof window.makePdfBlob!=='function')return false;pdfInspectionInstalled=true;const base=window.makePdfBlob;
    window.makePdfBlob=async function(){const blob=await base.apply(this,arguments),meta=await inspectPdfBlob(blob);lastPdfInspection=meta;if(meta.blankTrailing>0)throw new Error(`PDF layout check detected ${meta.blankTrailing} trailing blank page${meta.blankTrailing===1?'':'s'}. PDF creation was stopped.`);if(meta.horizontalOverflow)throw new Error('PDF layout check detected content extending outside the quotation page width.');return blob};
    window.makePdfBlob.__auaWorkflowPdfInspection=true;return true;
  }
  function ensurePreflightModal(){
    if($('auaPreflightOverlay'))return;const overlay=document.createElement('div');overlay.id='auaPreflightOverlay';overlay.className='aua-preflight-overlay';overlay.innerHTML='<div class="aua-preflight-card"><div class="aua-preflight-head"><h3>Ready to Send</h3><p>Quotation, calculation and PDF checks</p></div><div id="auaPreflightBody" class="aua-preflight-body"></div><div class="aua-preflight-foot"><button id="auaPreflightClose" class="btn primary" type="button">Close</button></div></div>';document.body.appendChild(overlay);$('auaPreflightClose').onclick=()=>overlay.classList.remove('show');overlay.onclick=e=>{if(e.target===overlay)overlay.classList.remove('show')};
  }
  function showPreflight(result){
    ensurePreflightModal();const overlay=$('auaPreflightOverlay'),body=$('auaPreflightBody'),errors=result.errors||[],warnings=result.warnings||[],pdf=result.pdf;
    const tone=errors.length?'bad':warnings.length?'warn':'good',headline=errors.length?'Not ready to send':warnings.length?'Ready with warnings':'Ready to send';
    body.innerHTML=`<div class="aua-preflight-status ${tone}">${headline}${pdf?` · PDF ${pdf.actualPages} page${pdf.actualPages===1?'':'s'}`:''}</div>${errors.length?`<div class="aua-preflight-group"><b>Fix before sending</b><ul>${errors.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`:''}${warnings.length?`<div class="aua-preflight-group"><b>Warnings</b><ul>${warnings.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`:''}${pdf&&pdf.blankTrailing?`<div class="aua-preflight-group"><b>PDF layout</b><ul><li>${pdf.blankTrailing} trailing blank page detected.</li></ul></div>`:''}`;overlay.classList.add('show');
  }
  function syncValidationBox(result){const box=$('validationBox');if(!box)return;const issues=[...(result.errors||[]),...(result.warnings||[])];box.style.display=issues.length?'block':'none';box.innerHTML=issues.length?`<b>Please check:</b><br>${issues.map(x=>'• '+esc(x)).join('<br>')}`:''}
  function installValidationOverride(){window.confirmValidation=function(){const result=collectQuoteIssues();syncValidationBox(result);if(result.errors.length){showPreflight(result);return false}if(result.warnings.length)return confirm(`Ready-to-send check found ${result.warnings.length} warning${result.warnings.length===1?'':'s'}:\n\n${result.warnings.join('\n')}\n\nContinue anyway?`);return true}}
  async function runFullPreflight(){
    const result=collectQuoteIssues();syncValidationBox(result);if(result.errors.length){showPreflight(result);return false}
    try{const blob=await window.makePdfBlob(),pdf=lastPdfInspection||await inspectPdfBlob(blob);result.pdf=pdf;if(pdf.blankTrailing>0)result.errors.push(`${pdf.blankTrailing} trailing blank PDF page detected.`);if(pdf.horizontalOverflow)result.errors.push('PDF content extends beyond the page width.')}catch(error){result.errors.push(error?.message||'Unable to generate PDF for checking.')}
    showPreflight(result);return result.errors.length===0;
  }
  function installReadyButton(){
    const body=$('auaActionsBody');if(!body||$('auaReadyCheckButton'))return;const button=document.createElement('button');button.id='auaReadyCheckButton';button.className='btn aua-ready-button';button.type='button';button.textContent='✓ Ready to Send Check';
    button.onclick=async()=>{button.disabled=true;const old=button.textContent;button.textContent='Checking…';try{await runFullPreflight()}finally{button.disabled=false;button.textContent=old}};body.appendChild(button);
  }
  window.AUAReadyToSend={check:runFullPreflight,collect:collectQuoteIssues,get lastPdf(){return lastPdfInspection}};

  function installCoreUi(){addStyles();installSmartVehicle();installTemplates();installReadyButton();ensurePreflightModal();installValidationOverride();installHistoryRevisionObserver()}
  function installLateFeatures(attempt=0){const revisionsReady=installRevisionHooks(),pdfReady=installPdfInspection();updateRevisionUi();if((!revisionsReady||!pdfReady)&&attempt<30)setTimeout(()=>installLateFeatures(attempt+1),150)}
  function install(){installCoreUi();setTimeout(()=>installLateFeatures(),80)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
  window.addEventListener('load',()=>setTimeout(()=>installLateFeatures(),120),{once:true});
})();
