// Consolidated History runtime: filters, status, vehicle history and quotation-number search.
(function(){
  const byId=id=>document.getElementById(id);
  const STATUS=['Draft','Sent','Approved','Completed','Cancelled'];
  const text=value=>String(value??'').trim();
  const norm=value=>text(value).toLowerCase();
  const normVehicle=value=>text(value).toUpperCase().replace(/\s+/g,'');
  const compact=value=>text(value).toLowerCase().replace(/[^a-z0-9]/g,'');
  const digits=value=>text(value).replace(/\D/g,'');
  const money=value=>Number(value||0).toLocaleString('en-SG',{minimumFractionDigits:2,maximumFractionDigits:2});
  const esc=value=>String(value??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const clone=value=>{try{return JSON.parse(JSON.stringify(value))}catch{return value}};

  function records(){try{return typeof getRecent==='function'?(getRecent()||[]):[]}catch{return[]}}
  function recordForKey(key){return records().find(r=>String(r?.key||'')===String(key||''))||null}
  function staffFor(record){const d=record?.data||{},a=d.audit||{};return text(a.lastEditedBy||a.createdBy||d.savedBy||d.lastUpdatedBy)}
  function statusFor(record){const value=text(record?.data?.status);return STATUS.includes(value)?value:'Draft'}
  function statusClass(status){
    if(status==='Sent'||status==='Approved')return 'aua-status-green';
    if(status==='Cancelled')return 'aua-status-red';
    if(status==='Completed')return 'aua-status-blue';
    return 'aua-status-grey';
  }
  function dateFor(record){
    const raw=record?.data?.date||record?.ts;
    const d=typeof raw==='number'?new Date(raw):new Date(String(raw||'').length===10?raw+'T00:00:00':raw);
    return Number.isNaN(d.getTime())?new Date(0):d;
  }
  function dateLabel(record){
    const d=dateFor(record);
    return d.getTime()?d.toLocaleDateString('en-SG',{day:'2-digit',month:'short',year:'numeric'}):'No date';
  }
  function updatedLabel(record){
    const d=new Date(record?.ts||0);
    return Number.isNaN(d.getTime())?'':d.toLocaleString('en-SG',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
  }
  function isQuoteQuery(query){const q=compact(query),n=digits(query);return q.startsWith('aua')||n.length>=10}
  function quoteMatches(query){
    if(!isQuoteQuery(query))return[];
    const qCompact=compact(query),qDigits=digits(query);
    return records().filter(record=>{
      const ref=text(record?.data?.quoteNumber);
      if(!ref)return false;
      const rCompact=compact(ref),rDigits=digits(ref);
      if(qCompact.startsWith('aua'))return rCompact.includes(qCompact);
      return qDigits.length>=10&&rDigits.includes(qDigits);
    });
  }

  function emitUpdated(){document.dispatchEvent(new CustomEvent('aua-history-updated'))}
  function frame(fn){requestAnimationFrame(fn)}

  function ensureStyles(){
    if(byId('auaHistoryToolsStyles'))return;
    const style=document.createElement('style');
    style.id='auaHistoryToolsStyles';
    style.textContent=`
      .aua-history-advanced{margin-top:14px;padding-top:14px;border-top:1px solid #eef2f7;display:grid;grid-template-columns:1.15fr 1fr 1fr 1fr auto;gap:9px;align-items:end}
      .aua-history-filter-field label{font-size:8.5px;text-transform:uppercase;letter-spacing:.04em;color:#64748b;margin-bottom:4px}.aua-history-filter-field input,.aua-history-filter-field select{min-height:38px;padding:7px 8px;font-size:11px}.aua-history-filter-reset{min-height:38px;white-space:nowrap}
      .aua-history-status-badge{display:inline-block;margin-top:5px;padding:2px 7px;border-radius:999px;font-size:8.5px;font-weight:800}.aua-history-status-badge.aua-status-grey{background:#f1f5f9;color:#475569;border:1px solid #e2e8f0}.aua-history-status-badge.aua-status-green{background:#dcfce7;color:#166534;border:1px solid #bbf7d0}.aua-history-status-badge.aua-status-red{background:#fee2e2;color:#b91c1c;border:1px solid #fecaca}.aua-history-status-badge.aua-status-blue{background:#e0f2fe;color:#075985;border:1px solid #bae6fd}
      .aua-history-vehicle-card{margin:16px 0;border:1px solid #dbe3ed;border-radius:11px;background:#fbfdff;overflow:hidden}.aua-history-vehicle-head{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:10px 11px;border-bottom:1px solid #e8eef5}.aua-history-vehicle-head b{font-size:11px;color:#0f2747}.aua-history-vehicle-head span{font-size:9.5px;color:#64748b}.aua-history-vehicle-list{max-height:210px;overflow:auto}.aua-history-vehicle-entry{display:grid;grid-template-columns:78px minmax(0,1fr) auto;gap:9px;align-items:center;padding:9px 11px;border-bottom:1px solid #eef2f7;font-size:9.5px}.aua-history-vehicle-entry:last-child{border-bottom:0}.aua-history-vehicle-entry b{font-size:10px;color:#334155}.aua-history-vehicle-entry small{display:block;margin-top:2px;color:#64748b;font-size:8.5px}.aua-history-vehicle-entry strong{font-size:9.5px;color:#0f2747;white-space:nowrap}
      .aua-inline-status-editor{margin:0 0 16px;padding:12px;border:1px solid #dbe3ed;border-radius:10px;background:#fbfdff}.aua-inline-status-editor label{font-size:8.5px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;color:#64748b;margin-bottom:5px}.aua-inline-status-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center}.aua-inline-status-row select{min-height:38px;font-size:11px}.aua-inline-status-row button{min-height:38px;white-space:nowrap}.aua-inline-status-message{min-height:14px;margin-top:6px;font-size:9.5px;color:#64748b}.aua-inline-status-message[data-tone="success"]{color:#166534}.aua-inline-status-message[data-tone="error"]{color:#b42318}
      @media(max-width:900px){.aua-history-advanced{grid-template-columns:1fr 1fr}.aua-inline-status-row{grid-template-columns:1fr}}@media(max-width:520px){.aua-history-advanced{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function ensureControls(){
    const controls=document.querySelector('#auaHistoryOverlay .aua-history-controls');
    if(!controls)return false;
    if(byId('auaHistoryAdvanced'))return true;
    const box=document.createElement('div');
    box.id='auaHistoryAdvanced';box.className='aua-history-advanced';
    box.innerHTML=`<div class="aua-history-filter-field"><label>Customer</label><input id="auaHistCustomer" type="search" data-preserve-case placeholder="Customer"></div><div class="aua-history-filter-field"><label>Vehicle</label><input id="auaHistVehicle" type="search" data-preserve-case placeholder="Vehicle no."></div><div class="aua-history-filter-field"><label>Status</label><select id="auaHistStatus"><option value="">All statuses</option>${STATUS.map(x=>`<option>${x}</option>`).join('')}</select></div><div class="aua-history-filter-field"><label>Staff</label><select id="auaHistStaff"><option value="">All staff</option><option>Xavier</option><option>Shijie</option></select></div><button id="auaHistReset" class="btn outline aua-history-filter-reset" type="button">Reset</button>`;
    controls.appendChild(box);
    byId('auaHistCustomer').addEventListener('input',refreshRows);
    byId('auaHistVehicle').addEventListener('input',refreshRows);
    byId('auaHistStatus').addEventListener('change',refreshRows);
    byId('auaHistStaff').addEventListener('change',refreshRows);
    byId('auaHistReset').onclick=()=>{
      ['auaHistCustomer','auaHistVehicle','auaHistStatus','auaHistStaff'].forEach(id=>{const el=byId(id);if(el)el.value=''});
      refreshRows();
    };
    return true;
  }

  function matches(record){
    const d=record?.data||{};
    const customer=norm(byId('auaHistCustomer')?.value),vehicle=normVehicle(byId('auaHistVehicle')?.value),status=text(byId('auaHistStatus')?.value),staff=text(byId('auaHistStaff')?.value);
    if(customer&&!norm(d.customer).includes(customer))return false;
    if(vehicle&&!normVehicle(d.vehicle).includes(vehicle))return false;
    if(status&&statusFor(record)!==status)return false;
    if(staff&&staffFor(record)!==staff)return false;
    return true;
  }

  function decorateAndFilterRows(){
    const overlay=byId('auaHistoryOverlay');
    if(!overlay||overlay.hidden)return;
    let visible=0;
    overlay.querySelectorAll('.aua-history-row[data-aua-key]').forEach(row=>{
      const record=recordForKey(row.dataset.auaKey);
      const show=!!record&&matches(record);
      row.style.display=show?'':'none';
      if(show)visible++;
      if(!record)return;
      const holder=row.children?.[1];
      if(!holder)return;
      let badge=holder.querySelector('.aua-history-status-badge');
      if(!badge){badge=document.createElement('span');badge.className='aua-history-status-badge';holder.appendChild(badge)}
      const status=statusFor(record);
      badge.textContent=status;
      badge.className=`aua-history-status-badge ${statusClass(status)}`;
    });
    const count=byId('auaHistoryCount');
    if(count&&!isQuoteQuery(byId('auaHistorySearch')?.value)){
      const total=records().length;
      count.textContent=`${visible} shown · ${total} shared quotation${total===1?'':'s'}`;
    }
  }

  function renderVehicleHistory(){
    const overlay=byId('auaHistoryOverlay'),preview=byId('auaHistoryPreview');
    if(!overlay||overlay.hidden||!preview)return;
    const selected=overlay.querySelector('.aua-history-row.selected[data-aua-key]');
    const old=preview.querySelector('.aua-history-vehicle-card');
    if(!selected){old?.remove();return}
    const current=recordForKey(selected.dataset.auaKey),vehicle=text(current?.data?.vehicle),key=normVehicle(vehicle);
    if(!key){old?.remove();return}
    const list=records().filter(r=>normVehicle(r?.data?.vehicle)===key).sort((a,b)=>Number(b.ts||0)-Number(a.ts||0));
    let card=old;
    if(!card){card=document.createElement('div');card.className='aua-history-vehicle-card';const items=preview.querySelector('.aua-history-items');if(items)preview.insertBefore(card,items);else preview.appendChild(card)}
    const rows=list.slice(0,12).map(record=>{const d=record.data||{},ref=text(d.quoteNumber)||'Legacy quotation';return `<div class="aua-history-vehicle-entry"><span>${esc(dateLabel(record))}</span><div><b>${esc(ref)}</b><small>${esc(d.customer||'Unnamed customer')} · ${esc(statusFor(record))}</small></div><strong>S$ ${money(record.total)}</strong></div>`}).join('');
    card.innerHTML=`<div class="aua-history-vehicle-head"><div><b>Vehicle History · ${esc(vehicle)}</b><span>${list.length} saved quotation${list.length===1?'':'s'}</span></div><button class="btn outline" id="auaHistoryUseVehicleFilter" type="button">Filter Vehicle</button></div><div class="aua-history-vehicle-list">${rows||'<div class="aua-history-vehicle-entry">No saved history.</div>'}</div>`;
    byId('auaHistoryUseVehicleFilter').onclick=()=>{const input=byId('auaHistVehicle');if(input)input.value=vehicle;refreshRows()};
  }

  async function saveStatus(key,newStatus,select,button,message){
    const record=recordForKey(key);
    if(!record||!STATUS.includes(newStatus))return;
    const oldStatus=statusFor(record);
    if(newStatus===oldStatus){message.textContent='No change to save.';message.dataset.tone='';return}
    if(typeof state!=='function'||typeof loadRecord!=='function'||typeof saveRecord!=='function'){message.textContent='Status editing is unavailable.';message.dataset.tone='error';select.value=oldStatus;return}
    const previous=clone(state()),updated=clone(record.data||{});updated.status=newStatus;
    select.disabled=true;button.disabled=true;button.textContent='Saving…';message.textContent='Saving status…';message.dataset.tone='';
    try{
      loadRecord(updated);
      const result=saveRecord();if(result&&typeof result.then==='function')await result;
      await new Promise(resolve=>setTimeout(resolve,80));
      const cloud=byId('cloudStatus');if(cloud?.dataset?.tone==='error')throw new Error(cloud.textContent||'Online save failed.');
      if(previous)loadRecord(previous);
      message.textContent=`Status changed to ${newStatus}.`;message.dataset.tone='success';
      refreshRows();
    }catch(error){
      if(previous)try{loadRecord(previous)}catch{}
      select.value=oldStatus;message.textContent=error?.message||'Unable to save status.';message.dataset.tone='error';
    }finally{select.disabled=false;button.disabled=false;button.textContent='Save Status'}
  }

  function renderEditor(){
    const overlay=byId('auaHistoryOverlay'),preview=byId('auaHistoryPreview');
    if(!overlay||overlay.hidden||!preview)return;
    const selected=overlay.querySelector('.aua-history-row.selected[data-aua-key]'),existing=preview.querySelector('.aua-inline-status-editor');
    if(!selected){existing?.remove();return}
    const record=recordForKey(selected.dataset.auaKey);if(!record){existing?.remove();return}
    if(existing?.dataset?.auaKey===selected.dataset.auaKey)return;
    existing?.remove();
    const editor=document.createElement('div');editor.className='aua-inline-status-editor';editor.dataset.auaKey=selected.dataset.auaKey;
    const stats=preview.querySelector('.aua-history-stats');if(stats)preview.insertBefore(editor,stats);else preview.prepend(editor);
    const status=statusFor(record);
    editor.innerHTML=`<label>Edit Status</label><div class="aua-inline-status-row"><select id="auaInlineStatusSelect">${STATUS.map(x=>`<option value="${x}"${x===status?' selected':''}>${x}</option>`).join('')}</select><button id="auaInlineStatusSave" class="btn primary" type="button">Save Status</button></div><div id="auaInlineStatusMessage" class="aua-inline-status-message"></div>`;
    const select=byId('auaInlineStatusSelect'),button=byId('auaInlineStatusSave'),message=byId('auaInlineStatusMessage');
    if(select&&button&&message)button.onclick=event=>{event.stopPropagation();saveStatus(selected.dataset.auaKey,select.value,select,button,message)};
  }

  function refreshRows(){frame(()=>{decorateAndFilterRows();renderVehicleHistory();renderEditor();emitUpdated()})}

  function renderQuoteResults(query,selectedKey=''){
    const list=byId('auaHistoryList'),count=byId('auaHistoryCount');if(!list)return;
    const matchesList=quoteMatches(query);
    list.innerHTML=matchesList.length?matchesList.map(record=>{
      const d=record.data||{},status=statusFor(record),selected=String(record.key)===String(selectedKey);
      return `<button class="aua-history-row${selected?' selected':''}" type="button" data-aua-key="${esc(record.key)}"><span class="aua-history-date">${esc(dateLabel(record))}</span><span><span class="aua-history-vehicle">${esc(d.vehicle||'NO VEHICLE')}</span><span class="aua-history-sub">${esc(d.customer||'Unnamed customer')}</span><span class="aua-history-status-badge ${statusClass(status)}">${esc(status)}</span></span><span class="aua-history-model-cell"><span class="aua-history-model">${esc(d.model||'—')}</span></span><span class="aua-history-total">S$ ${money(record.total)}</span><span class="aua-history-updated-cell"><span class="aua-history-updated">${esc(updatedLabel(record))}</span></span></button>`;
    }).join(''):'<div class="aua-history-no-results">No quotation matches that quotation number.</div>';
    if(count)count.textContent=`${matchesList.length} quotation number match${matchesList.length===1?'':'es'}`;
    list.querySelectorAll('.aua-history-row[data-aua-key]').forEach(row=>row.onclick=()=>openQuotePreview(row.dataset.auaKey,query));
    refreshRows();
  }

  function openQuotePreview(key,query){
    const input=byId('auaHistorySearch');if(!input)return;
    const baseInput=input.__auaBaseHistoryInput;if(typeof baseInput!=='function')return;
    input.value='';baseInput.call(input,{target:input});
    const coreRow=Array.from(document.querySelectorAll('#auaHistoryList .aua-history-row[data-aua-key]')).find(row=>String(row.dataset.auaKey||'')===String(key||''));
    if(coreRow&&typeof coreRow.onclick==='function')coreRow.onclick();
    input.value=query;renderQuoteResults(query,key);
  }

  function installSearch(){
    const input=byId('auaHistorySearch');if(!input||input.dataset.auaIntegratedSearch)return false;
    input.dataset.auaIntegratedSearch='1';input.placeholder='Search quotation no., vehicle, customer, phone, model or item…';
    const baseInput=input.oninput;input.__auaBaseHistoryInput=baseInput;
    input.oninput=function(event){
      const query=this.value.trim();
      if(isQuoteQuery(query)){renderQuoteResults(query);return}
      if(typeof baseInput==='function')baseInput.call(this,event);
      refreshRows();
    };
    return true;
  }

  function installHooks(){
    const overlay=byId('auaHistoryOverlay'),button=byId('cloudRecordsTab'),list=byId('auaHistoryList');
    if(!overlay||!button||!list)return false;
    if(overlay.dataset.auaHistoryToolsV2)return true;
    overlay.dataset.auaHistoryToolsV2='1';
    const baseOpen=button.onclick;
    if(typeof baseOpen==='function')button.onclick=async function(){const result=baseOpen.apply(this,arguments);if(result&&typeof result.then==='function')await result;refreshRows();return result};
    const refresh=byId('auaHistoryRefresh');
    if(refresh&&typeof refresh.onclick==='function'){const baseRefresh=refresh.onclick;refresh.onclick=async function(){const result=baseRefresh.apply(this,arguments);if(result&&typeof result.then==='function')await result;const query=byId('auaHistorySearch')?.value.trim();if(isQuoteQuery(query))renderQuoteResults(query);else refreshRows();return result}}
    list.addEventListener('click',()=>refreshRows());
    byId('auaHistorySort')?.addEventListener('change',()=>refreshRows());
    overlay.querySelectorAll('[data-aua-filter]').forEach(chip=>chip.addEventListener('click',()=>refreshRows()));
    return true;
  }

  function install(attempt=0){
    ensureStyles();
    const controls=ensureControls(),search=installSearch(),hooks=installHooks();
    if(controls&&search&&hooks){refreshRows();return}
    if(attempt<20)setTimeout(()=>install(attempt+1),200);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>install());else install();
})();
