// Fast quotation History workspace. Opens from cache, refreshes cloud in the background.
(function(){
  const $=id=>document.getElementById(id);
  const text=value=>String(value??'').trim();
  const norm=value=>text(value).toLowerCase();
  const clone=value=>{try{return JSON.parse(JSON.stringify(value))}catch{return value}};
  const money=value=>Number(value||0).toLocaleString('en-SG',{minimumFractionDigits:2,maximumFractionDigits:2});
  const esc=value=>String(value??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const RECENTKEY='auaRecentQuotesV1',TEMPLATE_PREFIX='template|',VEHICLE_PREFIX='vehicle-master|',PAGE_SIZE=200,CLOUD_PAGE_SIZE=200,CACHE_MAX=1000,HISTORY_SYNC_KEY='auaLastHistorySyncV1';
  let selectedKey='',records=[],clientPromise=null,loading=false,visibleLimit=PAGE_SIZE,vehicleCounts=new Map(),searchTimer=null,cloudOffset=0,cloudHasMore=true,cloudPageLoading=false,lastCloudSyncAt=0;

  function reserved(record){const key=String(record?.record_key||record?.key||''),type=String(record?.data?.recordType||'');return key.startsWith(TEMPLATE_PREFIX)||key.startsWith(VEHICLE_PREFIX)||type==='job-template'||type==='vehicle-master'}
  function itemText(record){const out=[];(record?.data?.sections||[]).forEach(s=>{out.push(s?.title||'');(s?.items||[]).forEach(x=>out.push(x?.d||x?.desc||''))});return norm(out.join(' '))}
  function recordDate(record){return new Date(Number(record?.__auaDateMs||0))}
  function dateLabel(record){const d=recordDate(record);return d.getTime()?d.toLocaleDateString('en-SG',{day:'2-digit',month:'short',year:'numeric'}):'No date'}
  function updatedLabel(record){const d=new Date(record?.ts||0);return Number.isNaN(d.getTime())?'':d.toLocaleString('en-SG',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}
  function calcItemAmount(item){if(item?.included)return 0;const raw=String(item?.q??item?.qty??'').trim(),parsed=parseFloat(raw),qty=Number.isFinite(parsed)&&parsed>0?parsed:1,price=Number(item?.p??item?.price)||0;return qty*price}

  function prepare(list){
    const next=(list||[]).filter(r=>!reserved(r));vehicleCounts=new Map();
    next.forEach(record=>{
      const d=record?.data||{},vehicle=norm(d.vehicle),raw=d.date||record.ts,date=new Date(typeof raw==='number'?raw:String(raw||'').length===10?raw+'T00:00:00':raw);
      record.__auaDateMs=Number.isNaN(date.getTime())?0:date.getTime();
      // Lightweight index: no item descriptions are expanded here.
      record.__auaQuickSearch=[d.quoteNumber,d.vehicle,d.customer,d.phone,d.model,d.mileage].map(norm).join(' ');
      delete record.__auaItemSearch;
      if(vehicle)vehicleCounts.set(vehicle,(vehicleCounts.get(vehicle)||0)+1);
    });return next;
  }
  function itemSearch(record){if(record.__auaItemSearch===undefined)record.__auaItemSearch=itemText(record);return record.__auaItemSearch}
  function rawLocalRecords(){try{return typeof getRecent==='function'?(getRecent()||[]):[]}catch{return[]}}
  function localRecords(){return prepare(rawLocalRecords())}
  function recordIdentity(record){return String(record?.key||record?.record_key||record?.data?.quoteNumber||'')}
  function mergeRecords(...lists){
    const seen=new Set(),out=[];
    lists.forEach(list=>(list||[]).forEach(record=>{if(reserved(record))return;const id=recordIdentity(record);if(!id||seen.has(id))return;seen.add(id);out.push(record)}));
    return out.sort((a,b)=>Number(b?.ts||0)-Number(a?.ts||0));
  }
  function cacheRecords(list){
    try{localStorage.setItem(RECENTKEY,JSON.stringify((list||[]).slice(0,CACHE_MAX).map(({key,record_key,ts,total,data})=>({key:key||record_key,ts,total,data}))))}catch{}
  }
  function markHistorySync(){
    lastCloudSyncAt=Date.now();const info={at:lastCloudSyncAt,loaded:cloudOffset,hasMore:cloudHasMore,pageSize:CLOUD_PAGE_SIZE};
    try{localStorage.setItem(HISTORY_SYNC_KEY,JSON.stringify(info))}catch{}
    document.dispatchEvent(new CustomEvent('aua-history-cloud-sync',{detail:info}));
  }

  async function cloudClient(){
    if(clientPromise)return clientPromise;
    clientPromise=(async()=>{if(!window.supabase?.createClient)throw new Error('Online storage library is unavailable.');const response=await fetch('./online-storage.js',{cache:'force-cache'});if(!response.ok)throw new Error('Online storage configuration could not be read.');const source=await response.text(),url=source.match(/\burl\s*:\s*'([^']+)'/)?.[1],key=source.match(/\bkey\s*:\s*'([^']+)'/)?.[1];if(!url||!key)throw new Error('Online storage configuration is unavailable.');return window.supabase.createClient(url,key)})();return clientPromise;
  }
  async function fetchCloudPage({reset=false}={}){
    if(cloudPageLoading)return records;cloudPageLoading=true;
    try{
      if(reset){cloudOffset=0;cloudHasMore=true}
      if(!cloudHasMore&&!reset)return records;
      const client=await cloudClient(),{data:sessionData,error:sessionError}=await client.auth.getSession();if(sessionError)throw sessionError;if(!sessionData?.session?.user)throw new Error('Sign in to load quotation history.');
      const from=cloudOffset,to=from+CLOUD_PAGE_SIZE-1;
      const {data,error}=await client.from('quotations').select('record_key,total,data,updated_at,pdf_path').not('record_key','like',`${TEMPLATE_PREFIX}%`).not('record_key','like',`${VEHICLE_PREFIX}%`).order('updated_at',{ascending:false}).range(from,to);if(error)throw error;
      const seen=new Set(),page=[];(data||[]).forEach(row=>{if(reserved(row))return;const key=String(row.record_key||''),quote=text(row?.data?.quoteNumber),identity=key||quote;if(!identity||seen.has(identity))return;seen.add(identity);page.push({key,record_key:key,ts:new Date(row.updated_at||0).getTime(),total:Number(row.total||0),data:row.data||{},pdf_path:row.pdf_path||null})});
      cloudOffset=from+(data||[]).length;cloudHasMore=(data||[]).length===CLOUD_PAGE_SIZE;
      const base=reset?rawLocalRecords():records;
      records=prepare(mergeRecords(page,base));cacheRecords(records);markHistorySync();return records;
    }finally{cloudPageLoading=false}
  }
  async function loadOlderCloud(){
    if(cloudPageLoading||!cloudHasMore)return;const button=$('auaHistoryCloudMore');if(button){button.disabled=true;button.textContent='Loading older…'}
    try{await fetchCloudPage({reset:false});render();document.dispatchEvent(new CustomEvent('aua-history-updated',{detail:{count:records.length,cloudLoaded:cloudOffset,hasMore:cloudHasMore}}))}
    catch(error){window.AUAHealthRuntime?.logError?.('history',error?.message||error);const status=$('cloudStatus');if(status){status.textContent=error?.message||'Unable to load older History records.';status.dataset.tone='error'}}
    finally{if(button){button.disabled=false;button.textContent='Load older cloud records'}}
  }

  function addStyles(){
    if($('auaHistoryEnhancementStyles'))return;const style=document.createElement('style');style.id='auaHistoryEnhancementStyles';style.textContent=`
      .aua-history-overlay{position:fixed;inset:0;z-index:12000;background:rgba(15,23,42,.62);padding:22px;overflow:auto}.aua-history-overlay[hidden]{display:none}.aua-history-shell{width:min(1400px,100%);min-height:calc(100vh - 44px);margin:auto;background:#f8fafc;border-radius:18px;overflow:hidden;box-shadow:0 28px 80px rgba(15,23,42,.3)}.aua-history-header{display:flex;justify-content:space-between;gap:18px;align-items:center;padding:22px 26px;background:#fff;border-bottom:1px solid #e2e8f0}.aua-history-kicker{font-size:10px;font-weight:800;letter-spacing:.15em;color:#2563eb}.aua-history-header h2{margin:2px 0;color:#0f2747;font-size:25px}.aua-history-count{font-size:11px;color:#64748b}.aua-history-head-actions{display:flex;gap:8px}.aua-history-controls{padding:17px 26px;background:#fff;border-bottom:1px solid #e2e8f0}.aua-history-search{min-height:46px;font-size:14px}.aua-history-filter-row{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:11px}.aua-history-chips{display:flex;gap:7px;flex-wrap:wrap}.aua-history-chip{border:1px solid #d7e0eb;background:#fff;color:#475569;border-radius:999px;padding:8px 12px;font-size:11px;font-weight:750;cursor:pointer}.aua-history-chip.active{border-color:#2563eb;background:#eff6ff;color:#1d4ed8}.aua-history-sort{width:auto;min-width:195px}.aua-history-main{display:grid;grid-template-columns:minmax(0,1.75fr) minmax(320px,.85fr);min-height:620px}.aua-history-list-wrap{padding:18px;min-width:0}.aua-history-columns,.aua-history-row{display:grid;grid-template-columns:105px minmax(210px,1.3fr) minmax(120px,.8fr) 105px 118px;gap:11px;align-items:center}.aua-history-columns{padding:0 15px 8px;color:#64748b;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.04em}.aua-history-list{display:grid;gap:7px}.aua-history-row{width:100%;padding:12px 15px;border:1px solid #dce4ef;border-radius:12px;background:#fff;text-align:left;color:#172033;cursor:pointer}.aua-history-row:hover,.aua-history-row.selected{border-color:#2563eb;background:#fbfdff;box-shadow:0 0 0 2px rgba(37,99,235,.08)}.aua-history-date,.aua-history-sub,.aua-history-model,.aua-history-updated{font-size:10.5px;color:#64748b}.aua-history-vehicle,.aua-history-total{font-size:12.5px;font-weight:800}.aua-history-total{text-align:right}.aua-history-quote{display:block;margin-top:3px;font-size:8.8px;font-weight:750;color:#64748b}.aua-history-vehicle-count{display:inline-block;margin-left:6px;padding:2px 6px;border-radius:999px;background:#eff6ff;color:#1d4ed8;font-size:8.5px;font-weight:800}.aua-history-more{display:flex;justify-content:center;padding:10px}.aua-history-more button{min-width:180px}.aua-history-preview{padding:23px;background:#fff;border-left:1px solid #e2e8f0}.aua-history-empty{min-height:260px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#94a3b8;gap:5px}.aua-history-empty b{color:#475569}.aua-history-preview h3{margin:0;color:#0f2747;font-size:22px}.aua-history-preview-sub{margin:5px 0 16px;color:#64748b;font-size:11px}.aua-history-stats{display:grid;grid-template-columns:1fr 1fr;gap:8px}.aua-history-stat{padding:9px;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc}.aua-history-stat span{display:block;color:#64748b;font-size:8.5px;font-weight:800;text-transform:uppercase}.aua-history-stat b{display:block;margin-top:2px;font-size:11px}.aua-history-items{max-height:280px;overflow:auto;border-block:1px solid #e2e8f0;margin:14px 0}.aua-history-section{padding:8px 0 4px;font-size:9px;font-weight:800;color:#475569;text-transform:uppercase}.aua-history-item{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:10.5px}.aua-history-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}.aua-history-actions .wide{grid-column:1/-1}.aua-history-no-results{padding:34px;text-align:center;color:#64748b;background:#fff;border:1px dashed #cbd5e1;border-radius:12px}#cloudRecordsPanel.aua-history-source-hidden{display:none!important}@media(max-width:900px){.aua-history-overlay{padding:0}.aua-history-shell{min-height:100vh;border-radius:0}.aua-history-main{grid-template-columns:1fr}.aua-history-preview{border-left:0;border-top:1px solid #e2e8f0}.aua-history-columns{display:none}.aua-history-row{grid-template-columns:82px minmax(0,1fr) 90px}.aua-history-model-cell,.aua-history-updated-cell{display:none}.aua-history-filter-row{align-items:stretch;flex-direction:column}.aua-history-sort{width:100%}}`;
    document.head.appendChild(style);
  }
  function makeWorkspace(){
    if($('auaHistoryOverlay'))return;const overlay=document.createElement('div');overlay.id='auaHistoryOverlay';overlay.className='aua-history-overlay';overlay.hidden=true;overlay.innerHTML=`<div class="aua-history-shell"><header class="aua-history-header"><div><div class="aua-history-kicker">ALAN'S UNITED AUTO</div><h2>Quotation History</h2><div id="auaHistoryCount" class="aua-history-count"></div></div><div class="aua-history-head-actions"><button id="auaHistoryRefresh" class="btn secondary" type="button">Refresh</button><button id="auaHistoryClose" class="btn outline" type="button">Close</button></div></header><section class="aua-history-controls"><input id="auaHistorySearch" class="aua-history-search" type="search" data-preserve-case placeholder="Search quote no., vehicle, customer, phone or model…"><div class="aua-history-filter-row"><div class="aua-history-chips"><button class="aua-history-chip" data-aua-filter="today">Today</button><button class="aua-history-chip" data-aua-filter="7">7 Days</button><button class="aua-history-chip" data-aua-filter="30">30 Days</button><button class="aua-history-chip active" data-aua-filter="all">All</button></div><select id="auaHistorySort" class="aua-history-sort"><option value="updated-desc">Recently updated</option><option value="date-desc">Quotation date — newest</option><option value="date-asc">Quotation date — oldest</option><option value="total-desc">Amount — highest</option><option value="total-asc">Amount — lowest</option><option value="vehicle-asc">Vehicle number</option></select></div></section><main class="aua-history-main"><section class="aua-history-list-wrap"><div class="aua-history-columns"><span>Date</span><span>Vehicle / Customer</span><span>Model</span><span>Total</span><span>Updated</span></div><div id="auaHistoryList" class="aua-history-list"></div></section><aside id="auaHistoryPreview" class="aua-history-preview"><div class="aua-history-empty"><b>Select a quotation</b><span>Review the details here before opening it.</span></div></aside></main></div>`;document.body.appendChild(overlay);
    $('auaHistoryClose').onclick=closeHistory;$('auaHistoryRefresh').onclick=()=>syncRecords(true);
    $('auaHistorySearch').oninput=()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>{visibleLimit=PAGE_SIZE;render()},70)};
    $('auaHistorySort').onchange=()=>{visibleLimit=PAGE_SIZE;render()};overlay.querySelectorAll('[data-aua-filter]').forEach(button=>button.onclick=()=>{overlay.querySelectorAll('[data-aua-filter]').forEach(x=>x.classList.remove('active'));button.classList.add('active');visibleLimit=PAGE_SIZE;render()});overlay.onclick=e=>{if(e.target===overlay)closeHistory()};document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!overlay.hidden)closeHistory()});
  }
  function activeFilter(){return document.querySelector('#auaHistoryOverlay [data-aua-filter].active')?.dataset.auaFilter||'all'}
  function filteredRecords(){
    const query=norm($('auaHistorySearch')?.value),filter=activeFilter(),today=new Date();today.setHours(0,0,0,0);const allowItems=query.length>=3;
    const list=records.filter(record=>{const t=record.__auaDateMs||0;if(filter==='today'&&t<today.getTime())return false;if(filter==='7'&&t<today.getTime()-6*86400000)return false;if(filter==='30'&&t<today.getTime()-29*86400000)return false;if(!query)return true;if(String(record.__auaQuickSearch||'').includes(query))return true;return allowItems&&itemSearch(record).includes(query)});
    const sort=$('auaHistorySort')?.value||'updated-desc';list.sort((a,b)=>sort==='date-desc'?(b.__auaDateMs||0)-(a.__auaDateMs||0):sort==='date-asc'?(a.__auaDateMs||0)-(b.__auaDateMs||0):sort==='total-desc'?Number(b.total||0)-Number(a.total||0):sort==='total-asc'?Number(a.total||0)-Number(b.total||0):sort==='vehicle-asc'?text(a.data?.vehicle).localeCompare(text(b.data?.vehicle),undefined,{numeric:true}):Number(b.ts||0)-Number(a.ts||0));return list;
  }
  function vehicleCount(record){return vehicleCounts.get(norm(record?.data?.vehicle))||0}
  function render(){
    const list=$('auaHistoryList');if(!list)return;const all=filteredRecords(),shown=all.slice(0,visibleLimit),remaining=Math.max(0,all.length-shown.length),cloudLabel=cloudOffset?` · ${cloudOffset}${cloudHasMore?'+':''} cloud refreshed`:'';
    $('auaHistoryCount').textContent=(remaining?`${shown.length} of ${all.length} shown · ${records.length} available`:`${all.length} shown · ${records.length} quotation${records.length===1?'':'s'} available`)+cloudLabel;
    const rows=shown.map(record=>{const d=record.data||{},count=vehicleCount(record);return`<button class="aua-history-row${selectedKey===record.key?' selected':''}" type="button" data-aua-key="${esc(record.key)}"><span class="aua-history-date">${esc(dateLabel(record))}</span><span><span class="aua-history-vehicle">${esc(d.vehicle||'NO VEHICLE')}</span>${count>1?`<span class="aua-history-vehicle-count">${count} records</span>`:''}<span class="aua-history-sub">${esc(d.customer||'Unnamed customer')}</span>${d.quoteNumber?`<span class="aua-history-quote">${esc(d.quoteNumber)}</span>`:''}</span><span class="aua-history-model-cell"><span class="aua-history-model">${esc(d.model||'—')}</span></span><span class="aua-history-total">S$ ${money(record.total)}</span><span class="aua-history-updated-cell"><span class="aua-history-updated">${esc(updatedLabel(record))}</span></span></button>`}).join('');
    list.innerHTML=rows||(all.length?'<div class="aua-history-no-results">No quotations are currently visible.</div>':'<div class="aua-history-no-results">No quotations match your search or filters.</div>');
    if(remaining||cloudHasMore){
      const more=document.createElement('div');more.className='aua-history-more';more.style.gap='8px';more.style.flexWrap='wrap';
      if(remaining){const local=document.createElement('button');local.className='btn outline';local.type='button';local.textContent=`Show ${Math.min(PAGE_SIZE,remaining)} more`;local.onclick=()=>{visibleLimit+=PAGE_SIZE;render()};more.appendChild(local)}
      if(cloudHasMore){const cloud=document.createElement('button');cloud.id='auaHistoryCloudMore';cloud.className='btn secondary';cloud.type='button';cloud.textContent='Load older cloud records';cloud.onclick=loadOlderCloud;more.appendChild(cloud)}
      list.appendChild(more);
    }
    list.querySelectorAll('[data-aua-key]').forEach(row=>row.onclick=()=>selectRecord(row.dataset.auaKey));if(selectedKey&&!all.some(r=>String(r.key)===String(selectedKey)))clearPreview();
  }
  function clearPreview(){selectedKey='';const p=$('auaHistoryPreview');if(p)p.innerHTML='<div class="aua-history-empty"><b>Select a quotation</b><span>Review the details here before opening it.</span></div>';document.querySelectorAll('#auaHistoryList .aua-history-row.selected').forEach(row=>row.classList.remove('selected'))}
  function selectRecord(key){
    const record=records.find(r=>String(r.key)===String(key)),preview=$('auaHistoryPreview');if(!record||!preview)return;selectedKey=record.key;const d=record.data||{},same=vehicleCount(record),sections=d.sections||[];const items=sections.map(section=>`<div class="aua-history-section">${esc(section.title||'Repair / Service')}</div>${(section.items||[]).map(item=>`<div class="aua-history-item"><span>${esc(item.d||item.desc||'Item')}</span><span>${item.included?'Included':'S$ '+money(calcItemAmount(item))}</span></div>`).join('')}`).join('');
    preview.innerHTML=`<h3>${esc(d.vehicle||'Quotation')}</h3><div class="aua-history-preview-sub">${esc(d.customer||'Unnamed customer')}${d.model?' · '+esc(d.model):''}${d.quoteNumber?' · '+esc(d.quoteNumber):''}${same>1?` · ${same} quotations for this vehicle`:''}</div><div class="aua-history-stats"><div class="aua-history-stat"><span>Date</span><b>${esc(dateLabel(record))}</b></div><div class="aua-history-stat"><span>Total</span><b>S$ ${money(record.total)}</b></div><div class="aua-history-stat"><span>Phone</span><b>${esc(d.phone||'—')}</b></div><div class="aua-history-stat"><span>Mileage</span><b>${esc(d.mileage||'—')}</b></div></div><div class="aua-history-items">${items||'<div class="aua-history-item"><span>No saved line items.</span></div>'}</div><div class="aua-history-actions"><button id="auaHistoryOpen" class="btn primary wide" type="button">Open Quotation</button><button id="auaHistoryVehicle" class="btn secondary" type="button" ${same>1?'':'disabled'}>Same Vehicle (${same})</button><button id="auaHistoryDelete" class="btn outline" type="button">${d.archived?'Restore':'Archive'}</button></div>`;
    $('auaHistoryOpen').onclick=()=>openExactRecord(record);$('auaHistoryVehicle').onclick=()=>{$('auaHistorySearch').value=d.vehicle||'';document.querySelectorAll('#auaHistoryOverlay [data-aua-filter]').forEach(x=>x.classList.toggle('active',x.dataset.auaFilter==='all'));visibleLimit=PAGE_SIZE;render()};$('auaHistoryDelete').onclick=()=>toggleArchive(record);document.querySelectorAll('#auaHistoryList .aua-history-row[data-aua-key]').forEach(row=>row.classList.toggle('selected',String(row.dataset.auaKey)===String(record.key)));document.dispatchEvent(new CustomEvent('aua-history-updated',{detail:{selectedKey:record.key}}));
  }
  function openExactRecord(record){if(!record?.data||typeof loadRecord!=='function')return;const protection=window.AUAUnsavedProtection;if(protection?.confirmDiscard&&!protection.confirmDiscard('This quotation has unsaved changes. Open the selected History quotation anyway?'))return;loadRecord(clone(record.data));const status=$('cloudStatus');if(status){status.textContent=`Opened${record.data?.vehicle?' '+record.data.vehicle:''}${record.data?.quoteNumber?' · '+record.data.quoteNumber:''} from History.`;status.dataset.tone='success'}closeHistory();setTimeout(()=>document.querySelector('.customer-panel')?.scrollIntoView({behavior:'smooth',block:'start'}),0)}
  async function toggleArchive(record){if(!window.AUACloudIntegrity?.setArchived){alert('Archive control is not ready yet. Please refresh and try again.');return}const button=$('auaHistoryDelete');if(button){button.disabled=true;button.textContent=record.data?.archived?'Restoring…':'Archiving…'}try{await window.AUACloudIntegrity.setArchived(record,!record.data?.archived);await syncRecords(false)}catch(error){alert(error?.message||'Unable to update this quotation.');if(button)button.disabled=false}}
  async function syncRecords(showStatus=false){
    if(loading)return;loading=true;const refresh=$('auaHistoryRefresh');if(refresh){refresh.disabled=true;refresh.textContent='Loading…'}
    try{
      try{await fetchCloudPage({reset:true});if(selectedKey&&!records.some(r=>String(r.key)===String(selectedKey)))selectedKey='';render()}
      catch(error){console.warn('Cloud History refresh failed; using local quotation cache.',error);window.AUAHealthRuntime?.logError?.('history',error?.message||error);if(!records.length)records=localRecords();render();if(showStatus){const status=$('cloudStatus');if(status){status.textContent=error?.message||'Using cached quotation history.';status.dataset.tone='error'}}}
      document.dispatchEvent(new CustomEvent('aua-history-updated',{detail:{count:records.length,cloudLoaded:cloudOffset,hasMore:cloudHasMore}}));
    }finally{loading=false;if(refresh){refresh.disabled=false;refresh.textContent='Refresh'}}
  }
  function openHistory(){const overlay=$('auaHistoryOverlay');if(!overlay)return Promise.resolve();overlay.hidden=false;document.body.style.overflow='hidden';visibleLimit=PAGE_SIZE;if(!records.length)records=localRecords();clearPreview();render();setTimeout(()=>$('auaHistorySearch')?.focus(),0);syncRecords(false).catch(error=>console.warn('Background History refresh failed.',error));return Promise.resolve()}
  function closeHistory(){const overlay=$('auaHistoryOverlay');if(overlay)overlay.hidden=true;document.body.style.overflow=''}
  function install(){const sourceButton=$('cloudRecordsTab'),sourcePanel=$('cloudRecordsPanel');if(!sourceButton||!sourcePanel){setTimeout(install,200);return}if(sourceButton.dataset.auaHistoryEnhanced)return;sourceButton.dataset.auaHistoryEnhanced='5';sourceButton.textContent='History';sourcePanel.classList.add('aua-history-source-hidden');addStyles();makeWorkspace();sourceButton.onclick=()=>openHistory()}
  window.AUAHistoryRuntime={health:()=>({available:records.length,cloudLoaded:cloudOffset,hasMore:cloudHasMore,pageSize:CLOUD_PAGE_SIZE,lastCloudSyncAt,loading:loading||cloudPageLoading}),loadMore:loadOlderCloud,refresh:()=>syncRecords(true)};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
