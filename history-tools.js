// Stable History tools: advanced filters and per-vehicle quotation history.
(function(){
  const byId=id=>document.getElementById(id);
  const text=value=>String(value??'').trim();
  const norm=value=>text(value).toLowerCase();
  const normVehicle=value=>text(value).toUpperCase().replace(/\s+/g,'');
  const money=value=>Number(value||0).toLocaleString('en-SG',{minimumFractionDigits:2,maximumFractionDigits:2});
  const esc=value=>String(value??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));

  function records(){
    try{return typeof getRecent==='function'?(getRecent()||[]):[]}catch{return[]}
  }
  function recordForKey(key){return records().find(r=>String(r?.key||'')===String(key||''))||null}
  function staffFor(record){
    const d=record?.data||{},a=d.audit||{};
    return text(a.lastEditedBy||a.createdBy||d.savedBy||d.lastUpdatedBy);
  }
  function statusFor(record){
    const value=text(record?.data?.status);
    return value||'Draft';
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

  function ensureStyles(){
    if(byId('auaHistoryToolsStyles'))return;
    const style=document.createElement('style');
    style.id='auaHistoryToolsStyles';
    style.textContent=`
      .aua-history-advanced{margin-top:14px;padding-top:14px;border-top:1px solid #eef2f7;display:grid;grid-template-columns:1.1fr 1fr 1fr 1fr .72fr .72fr auto;gap:9px;align-items:end}
      .aua-history-filter-field label{font-size:8.5px;text-transform:uppercase;letter-spacing:.04em;color:#64748b;margin-bottom:4px}
      .aua-history-filter-field input,.aua-history-filter-field select{min-height:38px;padding:7px 8px;font-size:11px}
      .aua-history-filter-reset{min-height:38px;white-space:nowrap}
      .aua-history-status-badge{display:inline-block;margin-top:5px;padding:2px 7px;border-radius:999px;background:#f1f5f9;color:#475569;font-size:8.5px;font-weight:800}
      .aua-history-vehicle-card{margin:16px 0;border:1px solid #dbe3ed;border-radius:11px;background:#fbfdff;overflow:hidden}
      .aua-history-vehicle-head{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:10px 11px;border-bottom:1px solid #e8eef5}
      .aua-history-vehicle-head b{font-size:11px;color:#0f2747}.aua-history-vehicle-head span{font-size:9.5px;color:#64748b}
      .aua-history-vehicle-list{max-height:210px;overflow:auto}
      .aua-history-vehicle-entry{display:grid;grid-template-columns:78px minmax(0,1fr) auto;gap:9px;align-items:center;padding:9px 11px;border-bottom:1px solid #eef2f7;font-size:9.5px}
      .aua-history-vehicle-entry:last-child{border-bottom:0}.aua-history-vehicle-entry b{font-size:10px;color:#334155}.aua-history-vehicle-entry small{display:block;margin-top:2px;color:#64748b;font-size:8.5px}.aua-history-vehicle-entry strong{font-size:9.5px;color:#0f2747;white-space:nowrap}
      @media(max-width:1100px){.aua-history-advanced{grid-template-columns:repeat(3,1fr)}}
      @media(max-width:700px){.aua-history-advanced{grid-template-columns:1fr 1fr}.aua-history-vehicle-entry{grid-template-columns:70px minmax(0,1fr)}}
      @media(max-width:480px){.aua-history-advanced{grid-template-columns:1fr}.aua-history-vehicle-entry strong{grid-column:2}}
    `;
    document.head.appendChild(style);
  }

  function ensureControls(){
    const controls=document.querySelector('#auaHistoryOverlay .aua-history-controls');
    if(!controls)return false;
    if(byId('auaHistoryAdvanced'))return true;
    const box=document.createElement('div');
    box.id='auaHistoryAdvanced';
    box.className='aua-history-advanced';
    box.innerHTML=`
      <div class="aua-history-filter-field"><label>Customer</label><input id="auaHistCustomer" type="search" data-preserve-case placeholder="Customer"></div>
      <div class="aua-history-filter-field"><label>Vehicle</label><input id="auaHistVehicle" type="search" data-preserve-case placeholder="Vehicle no."></div>
      <div class="aua-history-filter-field"><label>Status</label><select id="auaHistStatus"><option value="">All statuses</option><option>Draft</option><option>Sent</option><option>Approved</option><option>Completed</option><option>Cancelled</option></select></div>
      <div class="aua-history-filter-field"><label>Staff</label><select id="auaHistStaff"><option value="">All staff</option><option>Xavier</option><option>Shijie</option></select></div>
      <div class="aua-history-filter-field"><label>Min S$</label><input id="auaHistMin" type="number" min="0" step="1" placeholder="0"></div>
      <div class="aua-history-filter-field"><label>Max S$</label><input id="auaHistMax" type="number" min="0" step="1" placeholder="Any"></div>
      <button id="auaHistReset" class="btn outline aua-history-filter-reset" type="button">Reset</button>`;
    controls.appendChild(box);
    byId('auaHistReset').onclick=()=>{
      ['auaHistCustomer','auaHistVehicle','auaHistStatus','auaHistStaff','auaHistMin','auaHistMax'].forEach(id=>{const el=byId(id);if(el)el.value=''});
      applyFiltersAndHistory();
    };
    return true;
  }

  function matches(record){
    const d=record?.data||{};
    const customer=norm(byId('auaHistCustomer')?.value);
    const vehicle=normVehicle(byId('auaHistVehicle')?.value);
    const status=text(byId('auaHistStatus')?.value);
    const staff=text(byId('auaHistStaff')?.value);
    const minRaw=text(byId('auaHistMin')?.value),maxRaw=text(byId('auaHistMax')?.value);
    const total=Number(record?.total||0);
    if(customer&&!norm(d.customer).includes(customer))return false;
    if(vehicle&&!normVehicle(d.vehicle).includes(vehicle))return false;
    if(status&&statusFor(record)!==status)return false;
    if(staff&&staffFor(record)!==staff)return false;
    if(minRaw!==''&&total<Number(minRaw))return false;
    if(maxRaw!==''&&total>Number(maxRaw))return false;
    return true;
  }

  function applyFilters(){
    const overlay=byId('auaHistoryOverlay');
    if(!overlay||overlay.hidden)return;
    let visible=0;
    overlay.querySelectorAll('.aua-history-row[data-aua-key]').forEach(row=>{
      const record=recordForKey(row.dataset.auaKey);
      const show=!!record&&matches(record);
      row.style.display=show?'':'none';
      if(show)visible++;
      if(record){
        const holder=row.children?.[1];
        if(holder&&!holder.querySelector('.aua-history-status-badge')){
          const badge=document.createElement('span');
          badge.className='aua-history-status-badge';
          badge.textContent=statusFor(record);
          holder.appendChild(badge);
        }
      }
    });
    const count=byId('auaHistoryCount');
    if(count){
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
    const rows=list.slice(0,12).map(record=>{
      const d=record.data||{};
      const ref=text(d.quoteNumber)||'Legacy quotation';
      return `<div class="aua-history-vehicle-entry"><span>${esc(dateLabel(record))}</span><div><b>${esc(ref)}</b><small>${esc(d.customer||'Unnamed customer')} · ${esc(statusFor(record))}</small></div><strong>S$ ${money(record.total)}</strong></div>`;
    }).join('');
    card.innerHTML=`<div class="aua-history-vehicle-head"><div><b>Vehicle History · ${esc(vehicle)}</b><span>${list.length} saved quotation${list.length===1?'':'s'}</span></div><button class="btn outline" id="auaHistoryUseVehicleFilter" type="button">Filter Vehicle</button></div><div class="aua-history-vehicle-list">${rows||'<div class="aua-history-vehicle-entry">No saved history.</div>'}</div>`;
    const btn=byId('auaHistoryUseVehicleFilter');
    if(btn)btn.onclick=()=>{const input=byId('auaHistVehicle');if(input)input.value=vehicle;applyFilters()};
  }

  function applyFiltersAndHistory(){applyFilters();renderVehicleHistory()}
  function schedule(){requestAnimationFrame(applyFiltersAndHistory)}

  function installHooks(){
    const overlay=byId('auaHistoryOverlay'),button=byId('cloudRecordsTab');
    if(!overlay||!button)return false;
    if(overlay.dataset.auaHistoryTools)return true;
    overlay.dataset.auaHistoryTools='1';
    overlay.addEventListener('input',()=>setTimeout(schedule,0));
    overlay.addEventListener('change',()=>setTimeout(schedule,0));
    overlay.addEventListener('click',()=>setTimeout(schedule,0));
    button.addEventListener('click',()=>{setTimeout(schedule,150);setTimeout(schedule,400);setTimeout(schedule,800)});
    return true;
  }

  function install(){
    ensureStyles();
    const controls=ensureControls(),hooks=installHooks();
    if(!controls||!hooks){setTimeout(install,250);return}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
