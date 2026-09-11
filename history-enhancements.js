(function(){
  const byId=id=>document.getElementById(id);
  const text=value=>String(value??'').trim();
  const norm=value=>text(value).toLowerCase();
  const money=value=>Number(value||0).toLocaleString('en-SG',{minimumFractionDigits:2,maximumFractionDigits:2});
  const esc=value=>String(value??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  let sourceButton=null,sourceClick=null,selectedKey='',records=[];

  function recordDate(record){
    const value=record?.data?.date||record?.ts;
    const d=typeof value==='number'?new Date(value):new Date(String(value||'').length===10?value+'T00:00:00':value);
    return Number.isNaN(d.getTime())?new Date(0):d;
  }
  function dateLabel(record){
    const d=recordDate(record);
    return d.getTime()?d.toLocaleDateString('en-SG',{day:'2-digit',month:'short',year:'numeric'}):'No date';
  }
  function updatedLabel(record){
    const d=new Date(record?.ts||0);
    return Number.isNaN(d.getTime())?'':d.toLocaleString('en-SG',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
  }
  function itemText(record){
    const data=record?.data||{};
    const values=[];
    (data.sections||[]).forEach(section=>{
      values.push(section?.title||'');
      (section?.items||[]).forEach(item=>values.push(item?.d||item?.desc||''));
    });
    return values.join(' ');
  }
  function searchText(record){
    const d=record?.data||{};
    return [d.vehicle,d.customer,d.phone,d.model,d.mileage,itemText(record)].map(norm).join(' ');
  }
  function calcItemAmount(item){
    if(item?.included)return 0;
    const qty=parseFloat(item?.q??item?.qty)||0,price=Number(item?.p??item?.price)||0;
    return qty*price;
  }
  function dataRecords(){
    try{return typeof getRecent==='function'?(getRecent()||[]):[]}catch{return[]}
  }

  function addStyles(){
    if(byId('auaHistoryEnhancementStyles'))return;
    const style=document.createElement('style');
    style.id='auaHistoryEnhancementStyles';
    style.textContent=`
      .aua-history-overlay{position:fixed;inset:0;z-index:12000;background:rgba(15,23,42,.62);padding:22px;overflow:auto}.aua-history-overlay[hidden]{display:none}.aua-history-shell{width:min(1400px,100%);min-height:calc(100vh - 44px);margin:auto;background:#f8fafc;border-radius:18px;overflow:hidden;box-shadow:0 28px 80px rgba(15,23,42,.3)}
      .aua-history-header{display:flex;justify-content:space-between;gap:18px;align-items:center;padding:22px 26px;background:#fff;border-bottom:1px solid #e2e8f0}.aua-history-kicker{font-size:10px;font-weight:800;letter-spacing:.15em;color:#2563eb}.aua-history-header h2{margin:2px 0;color:#0f2747;font-size:25px}.aua-history-count{font-size:11px;color:#64748b}.aua-history-head-actions{display:flex;gap:8px}
      .aua-history-controls{padding:17px 26px;background:#fff;border-bottom:1px solid #e2e8f0}.aua-history-search{min-height:46px;font-size:14px}.aua-history-filter-row{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:11px}.aua-history-chips{display:flex;gap:7px;flex-wrap:wrap}.aua-history-chip{border:1px solid #d7e0eb;background:#fff;color:#475569;border-radius:999px;padding:8px 12px;font-size:11px;font-weight:750;cursor:pointer}.aua-history-chip:hover{border-color:#9db8da}.aua-history-chip.active{border-color:#2563eb;background:#eff6ff;color:#1d4ed8}.aua-history-sort{width:auto;min-width:195px}
      .aua-history-main{display:grid;grid-template-columns:minmax(0,1.75fr) minmax(320px,.85fr);min-height:620px}.aua-history-list-wrap{padding:18px;min-width:0}.aua-history-columns,.aua-history-row{display:grid;grid-template-columns:105px minmax(210px,1.3fr) minmax(120px,.8fr) 105px 118px;gap:11px;align-items:center}.aua-history-columns{padding:0 15px 8px;color:#64748b;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.04em}.aua-history-list{display:grid;gap:7px}.aua-history-row{width:100%;padding:12px 15px;border:1px solid #dce4ef;border-radius:12px;background:#fff;text-align:left;color:#172033;cursor:pointer}.aua-history-row:hover,.aua-history-row.selected{border-color:#2563eb;background:#fbfdff;box-shadow:0 0 0 2px rgba(37,99,235,.08)}.aua-history-date,.aua-history-sub,.aua-history-model,.aua-history-updated{font-size:10.5px;color:#64748b}.aua-history-vehicle,.aua-history-total{font-size:12.5px;font-weight:800}.aua-history-total{text-align:right}.aua-history-vehicle-count{display:inline-block;margin-left:6px;padding:2px 6px;border-radius:999px;background:#eff6ff;color:#1d4ed8;font-size:8.5px;font-weight:800}
      .aua-history-preview{padding:23px;background:#fff;border-left:1px solid #e2e8f0}.aua-history-empty{min-height:260px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#94a3b8;gap:5px}.aua-history-empty b{color:#475569}.aua-history-preview h3{margin:0;color:#0f2747;font-size:22px}.aua-history-preview-sub{margin:5px 0 16px;color:#64748b;font-size:11px}.aua-history-stats{display:grid;grid-template-columns:1fr 1fr;gap:8px}.aua-history-stat{padding:9px;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc}.aua-history-stat span{display:block;color:#64748b;font-size:8.5px;font-weight:800;text-transform:uppercase}.aua-history-stat b{display:block;margin-top:2px;font-size:11px}.aua-history-items{max-height:280px;overflow:auto;border-block:1px solid #e2e8f0;margin:14px 0}.aua-history-section{padding:8px 0 4px;font-size:9px;font-weight:800;color:#475569;text-transform:uppercase}.aua-history-item{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:10.5px}.aua-history-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}.aua-history-actions .wide{grid-column:1/-1}.aua-history-delete{border-color:#fecaca!important;color:#b42318!important}.aua-history-no-results{padding:34px;text-align:center;color:#64748b;background:#fff;border:1px dashed #cbd5e1;border-radius:12px}
      #cloudRecordsPanel.aua-history-source-hidden{display:none!important}
      @media(max-width:900px){.aua-history-overlay{padding:0}.aua-history-shell{min-height:100vh;border-radius:0}.aua-history-main{grid-template-columns:1fr}.aua-history-preview{border-left:0;border-top:1px solid #e2e8f0}.aua-history-columns{display:none}.aua-history-row{grid-template-columns:82px minmax(0,1fr) 90px}.aua-history-model-cell,.aua-history-updated-cell{display:none}.aua-history-filter-row{align-items:stretch;flex-direction:column}.aua-history-sort{width:100%}}
      @media(max-width:520px){.aua-history-header,.aua-history-controls{padding:15px}.aua-history-header{align-items:flex-start}.aua-history-head-actions{flex-direction:column}.aua-history-list-wrap{padding:11px}.aua-history-row{grid-template-columns:70px minmax(0,1fr) 78px;padding:10px}.aua-history-preview{padding:17px}.aua-history-chips{overflow-x:auto;flex-wrap:nowrap}.aua-history-chip{white-space:nowrap}}
    `;
    document.head.appendChild(style);
  }

  function makeWorkspace(){
    if(byId('auaHistoryOverlay'))return;
    const overlay=document.createElement('div');
    overlay.id='auaHistoryOverlay';overlay.className='aua-history-overlay';overlay.hidden=true;
    overlay.innerHTML=`<div class="aua-history-shell"><header class="aua-history-header"><div><div class="aua-history-kicker">ALAN'S UNITED AUTO</div><h2>Quotation History</h2><div id="auaHistoryCount" class="aua-history-count"></div></div><div class="aua-history-head-actions"><button id="auaHistoryRefresh" class="btn secondary" type="button">Refresh</button><button id="auaHistoryClose" class="btn outline" type="button">Close</button></div></header><section class="aua-history-controls"><input id="auaHistorySearch" class="aua-history-search" type="search" data-preserve-case placeholder="Search vehicle, customer, phone, model or item…"><div class="aua-history-filter-row"><div class="aua-history-chips"><button class="aua-history-chip" data-aua-filter="today">Today</button><button class="aua-history-chip" data-aua-filter="7">7 Days</button><button class="aua-history-chip" data-aua-filter="30">30 Days</button><button class="aua-history-chip active" data-aua-filter="all">All</button></div><select id="auaHistorySort" class="aua-history-sort"><option value="updated-desc">Recently updated</option><option value="date-desc">Quotation date — newest</option><option value="date-asc">Quotation date — oldest</option><option value="total-desc">Amount — highest</option><option value="total-asc">Amount — lowest</option><option value="vehicle-asc">Vehicle number</option></select></div></section><main class="aua-history-main"><section class="aua-history-list-wrap"><div class="aua-history-columns"><span>Date</span><span>Vehicle / Customer</span><span>Model</span><span>Total</span><span>Updated</span></div><div id="auaHistoryList" class="aua-history-list"></div></section><aside id="auaHistoryPreview" class="aua-history-preview"><div class="aua-history-empty"><b>Select a quotation</b><span>Review the details here before opening it.</span></div></aside></main></div>`;
    document.body.appendChild(overlay);
    byId('auaHistoryClose').onclick=closeHistory;
    byId('auaHistoryRefresh').onclick=()=>syncRecords(true);
    byId('auaHistorySearch').oninput=render;
    byId('auaHistorySort').onchange=render;
    overlay.querySelectorAll('[data-aua-filter]').forEach(button=>button.onclick=()=>{
      overlay.querySelectorAll('[data-aua-filter]').forEach(x=>x.classList.remove('active'));
      button.classList.add('active');render();
    });
    overlay.onclick=e=>{if(e.target===overlay)closeHistory()};
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!overlay.hidden)closeHistory()});
  }

  function activeFilter(){return document.querySelector('[data-aua-filter].active')?.dataset.auaFilter||'all'}
  function filteredRecords(){
    const query=norm(byId('auaHistorySearch')?.value),filter=activeFilter(),today=new Date();today.setHours(0,0,0,0);
    let list=records.filter(record=>{
      const t=recordDate(record).getTime();
      if(filter==='today'&&t<today.getTime())return false;
      if(filter==='7'&&t<today.getTime()-6*86400000)return false;
      if(filter==='30'&&t<today.getTime()-29*86400000)return false;
      return !query||searchText(record).includes(query);
    });
    const sort=byId('auaHistorySort')?.value||'updated-desc';
    list.sort((a,b)=>sort==='date-desc'?recordDate(b)-recordDate(a):sort==='date-asc'?recordDate(a)-recordDate(b):sort==='total-desc'?Number(b.total||0)-Number(a.total||0):sort==='total-asc'?Number(a.total||0)-Number(b.total||0):sort==='vehicle-asc'?text(a.data?.vehicle).localeCompare(text(b.data?.vehicle),undefined,{numeric:true}):Number(b.ts||0)-Number(a.ts||0));
    return list;
  }
  function vehicleCount(record){const v=norm(record?.data?.vehicle);return v?records.filter(r=>norm(r.data?.vehicle)===v).length:0}

  function render(){
    const list=byId('auaHistoryList');if(!list)return;
    const shown=filteredRecords();
    byId('auaHistoryCount').textContent=`${shown.length} shown · ${records.length} shared quotation${records.length===1?'':'s'}`;
    list.innerHTML=shown.length?shown.map(record=>{
      const d=record.data||{},count=vehicleCount(record);
      return `<button class="aua-history-row${selectedKey===record.key?' selected':''}" type="button" data-aua-key="${esc(record.key)}"><span class="aua-history-date">${esc(dateLabel(record))}</span><span><span class="aua-history-vehicle">${esc(d.vehicle||'NO VEHICLE')}</span>${count>1?`<span class="aua-history-vehicle-count">${count} records</span>`:''}<span class="aua-history-sub">${esc(d.customer||'Unnamed customer')}</span></span><span class="aua-history-model-cell"><span class="aua-history-model">${esc(d.model||'—')}</span></span><span class="aua-history-total">S$ ${money(record.total)}</span><span class="aua-history-updated-cell"><span class="aua-history-updated">${esc(updatedLabel(record))}</span></span></button>`;
    }).join(''):'<div class="aua-history-no-results">No quotations match your search or filters.</div>';
    list.querySelectorAll('[data-aua-key]').forEach(row=>row.onclick=()=>selectRecord(row.dataset.auaKey));
    if(selectedKey&&!shown.some(r=>r.key===selectedKey))clearPreview();
  }

  function clearPreview(){selectedKey='';const p=byId('auaHistoryPreview');if(p)p.innerHTML='<div class="aua-history-empty"><b>Select a quotation</b><span>Review the details here before opening it.</span></div>'}
  function selectRecord(key){
    const record=records.find(r=>r.key===key),preview=byId('auaHistoryPreview');if(!record||!preview)return;selectedKey=key;
    const d=record.data||{},same=vehicleCount(record),sections=d.sections||[];
    const items=sections.map(section=>`<div class="aua-history-section">${esc(section.title||'Repair / Service')}</div>${(section.items||[]).map(item=>`<div class="aua-history-item"><span>${esc(item.d||item.desc||'Item')}</span><span>${item.included?'Included':'S$ '+money(calcItemAmount(item))}</span></div>`).join('')}`).join('');
    preview.innerHTML=`<h3>${esc(d.vehicle||'Quotation')}</h3><div class="aua-history-preview-sub">${esc(d.customer||'Unnamed customer')}${d.model?' · '+esc(d.model):''}${same>1?` · ${same} quotations for this vehicle`:''}</div><div class="aua-history-stats"><div class="aua-history-stat"><span>Date</span><b>${esc(dateLabel(record))}</b></div><div class="aua-history-stat"><span>Total</span><b>S$ ${money(record.total)}</b></div><div class="aua-history-stat"><span>Phone</span><b>${esc(d.phone||'—')}</b></div><div class="aua-history-stat"><span>Mileage</span><b>${esc(d.mileage||'—')}</b></div></div><div class="aua-history-items">${items||'<div class="aua-history-item"><span>No saved line items.</span></div>'}</div><div class="aua-history-actions"><button id="auaHistoryOpen" class="btn primary wide" type="button">Open Quotation</button><button id="auaHistoryVehicle" class="btn secondary" type="button" ${same>1?'':'disabled'}>Same Vehicle (${same})</button><button id="auaHistoryDelete" class="btn outline aua-history-delete" type="button">Delete</button></div>`;
    byId('auaHistoryOpen').onclick=()=>openSourceRecord(key);
    byId('auaHistoryVehicle').onclick=()=>{byId('auaHistorySearch').value=d.vehicle||'';document.querySelectorAll('[data-aua-filter]').forEach(x=>x.classList.toggle('active',x.dataset.auaFilter==='all'));render()};
    byId('auaHistoryDelete').onclick=()=>deleteSourceRecord(key);
    render();
  }

  function sourceIndexFor(key){return records.findIndex(r=>r.key===key)}
  function openSourceRecord(key){
    const index=sourceIndexFor(key),button=document.querySelector(`[data-cloud-open="${index}"]`);
    if(button?.onclick)button.onclick();else{const r=records[index];if(r&&typeof loadRecord==='function')loadRecord(r.data||{})}
    closeHistory();
  }
  async function deleteSourceRecord(key){
    const index=sourceIndexFor(key),button=document.querySelector(`[data-cloud-delete="${index}"]`);
    if(!button?.onclick){alert('Please use the standard record list to delete this quotation.');return}
    await button.onclick();
    selectedKey='';
    await syncRecords(false);
  }

  async function syncRecords(){
    const panel=byId('cloudRecordsPanel'),search=byId('cloudRecordSearch');
    if(search){search.value='';search.dispatchEvent(new Event('input',{bubbles:true}))}
    if(panel)panel.hidden=true;
    if(sourceClick)await sourceClick();
    panel?.classList.add('aua-history-source-hidden');
    sourceButton?.classList.remove('cloud-tab-active');
    records=dataRecords();
    render();
  }
  async function openHistory(){
    byId('auaHistoryOverlay').hidden=false;document.body.style.overflow='hidden';
    await syncRecords();
    setTimeout(()=>byId('auaHistorySearch')?.focus(),0);
  }
  function closeHistory(){const overlay=byId('auaHistoryOverlay');if(overlay)overlay.hidden=true;document.body.style.overflow=''}

  function install(){
    sourceButton=byId('cloudRecordsTab');
    const sourcePanel=byId('cloudRecordsPanel');
    if(!sourceButton||!sourcePanel||typeof getRecent!=='function'){setTimeout(install,250);return}
    if(sourceButton.dataset.auaHistoryEnhanced)return;
    sourceButton.dataset.auaHistoryEnhanced='1';
    sourceClick=sourceButton.onclick;
    sourceButton.textContent='History';
    sourcePanel.classList.add('aua-history-source-hidden');
    addStyles();makeWorkspace();
    sourceButton.onclick=()=>openHistory().catch(err=>console.error('History could not open',err));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
