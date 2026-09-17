// On-demand vehicle master management. No cloud query runs until the manager is opened.
(function(){
  const PREFIX='vehicle-master|';
  const $=id=>document.getElementById(id);
  const text=value=>String(value??'').trim();
  const norm=value=>text(value).toUpperCase().replace(/[^A-Z0-9]/g,'');
  const esc=value=>String(value??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  let clientPromise=null,records=[],selectedKey='',loadedAt=0,loading=false;

  async function client(){
    if(clientPromise)return clientPromise;
    clientPromise=(async()=>{
      if(!window.supabase?.createClient)throw new Error('Online storage is unavailable.');
      const response=await fetch('./online-storage.js',{cache:'force-cache'});if(!response.ok)throw new Error('Online storage configuration could not be read.');
      const source=await response.text(),url=source.match(/\burl\s*:\s*'([^']+)'/)?.[1],key=source.match(/\bkey\s*:\s*'([^']+)'/)?.[1];
      if(!url||!key)throw new Error('Online storage configuration is unavailable.');
      return window.supabase.createClient(url,key);
    })();
    return clientPromise;
  }
  async function session(){const c=await client(),{data,error}=await c.auth.getSession();if(error)throw error;if(!data?.session?.user)throw new Error('Sign in before managing vehicle records.');return{client:c,user:data.session.user}}

  function styles(){
    if($('auaVehicleManagerStyles'))return;
    const style=document.createElement('style');style.id='auaVehicleManagerStyles';style.textContent=`
      .aua-vm-overlay{position:fixed;inset:0;z-index:17000;display:none;padding:22px;background:rgba(15,23,42,.58);overflow:auto}.aua-vm-overlay.show{display:block}.aua-vm-shell{width:min(1120px,100%);min-height:620px;margin:auto;background:#f8fafc;border-radius:16px;overflow:hidden;box-shadow:0 28px 80px rgba(15,23,42,.3)}.aua-vm-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:18px 22px;background:#fff;border-bottom:1px solid #e2e8f0}.aua-vm-head h3{margin:0;color:#0f2747;font-size:20px}.aua-vm-head p{margin:3px 0 0;color:#64748b;font-size:10px}.aua-vm-main{display:grid;grid-template-columns:minmax(320px,.8fr) minmax(0,1.2fr);min-height:560px}.aua-vm-list-panel{padding:16px;border-right:1px solid #e2e8f0}.aua-vm-search{margin-bottom:10px}.aua-vm-list{display:grid;gap:6px;max-height:490px;overflow:auto}.aua-vm-row{width:100%;padding:10px;border:1px solid #dbe3ed;border-radius:9px;background:#fff;text-align:left;cursor:pointer}.aua-vm-row.selected,.aua-vm-row:hover{border-color:#2563eb;background:#fbfdff}.aua-vm-row b{display:block;color:#172033;font-size:11px}.aua-vm-row span{display:block;margin-top:3px;color:#64748b;font-size:9.5px}.aua-vm-editor{padding:22px;background:#fff}.aua-vm-empty{min-height:380px;display:grid;place-items:center;text-align:center;color:#94a3b8;font-size:11px}.aua-vm-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.aua-vm-meta{margin:15px 0;padding:10px;border:1px solid #e2e8f0;border-radius:9px;background:#f8fafc;color:#64748b;font-size:9.5px;line-height:1.5}.aua-vm-actions{display:flex;gap:8px;flex-wrap:wrap}.aua-vm-delete{color:#b42318!important;border-color:#fecaca!important}.aua-vm-status{min-height:18px;margin-top:10px;font-size:10px;color:#64748b}.aua-vm-status[data-tone="error"]{color:#b42318}.aua-vm-status[data-tone="success"]{color:#166534}@media(max-width:760px){.aua-vm-overlay{padding:0}.aua-vm-shell{min-height:100vh;border-radius:0}.aua-vm-main{grid-template-columns:1fr}.aua-vm-list-panel{border-right:0;border-bottom:1px solid #e2e8f0}.aua-vm-list{max-height:260px}.aua-vm-grid{grid-template-columns:1fr}}`;
    document.head.appendChild(style);
  }

  function ensureUi(){
    styles();
    if(!$('auaVehicleMasterButton')){
      const body=$('auaActionsBody');if(body){const button=document.createElement('button');button.id='auaVehicleMasterButton';button.type='button';button.className='btn outline';button.style.cssText='width:100%;margin-top:9px';button.textContent='Vehicle Master Records';button.onclick=open;body.appendChild(button)}
    }
    if($('auaVehicleManagerOverlay'))return true;
    const overlay=document.createElement('div');overlay.id='auaVehicleManagerOverlay';overlay.className='aua-vm-overlay';
    overlay.innerHTML=`<div class="aua-vm-shell"><header class="aua-vm-head"><div><h3>Vehicle Master Records</h3><p>Edit the current customer/vehicle details without changing old quotation history.</p></div><div style="display:flex;gap:7px"><button id="auaVehicleManagerRefresh" class="btn secondary" type="button">Refresh</button><button id="auaVehicleManagerClose" class="btn outline" type="button">Close</button></div></header><main class="aua-vm-main"><section class="aua-vm-list-panel"><input id="auaVehicleManagerSearch" class="aua-vm-search" type="search" data-preserve-case placeholder="Search plate, customer, phone or model…"><div id="auaVehicleManagerCount" class="small" style="margin-bottom:8px"></div><div id="auaVehicleManagerList" class="aua-vm-list"></div></section><section id="auaVehicleManagerEditor" class="aua-vm-editor"><div class="aua-vm-empty">Select a vehicle master record to edit it.</div></section></main></div>`;
    document.body.appendChild(overlay);
    $('auaVehicleManagerClose').onclick=close;$('auaVehicleManagerRefresh').onclick=()=>load(true);$('auaVehicleManagerSearch').oninput=renderList;overlay.onclick=e=>{if(e.target===overlay)close()};
    return true;
  }

  async function fetchRecords(){
    const {client:c}=await session(),{data,error}=await c.from('quotations').select('record_key,user_id,customer,vehicle,quote_date,model,data,updated_at').like('record_key',`${PREFIX}%`).order('vehicle',{ascending:true}).limit(1500);if(error)throw error;
    records=(data||[]).map(row=>{const d=row.data||{};return{...row,vehicle:text(d.vehicle||row.vehicle),customer:text(d.customer||row.customer),phone:text(d.phone),model:text(d.model||row.model),mileage:text(d.mileage),quotationCount:Number(d.quotationCount||0),lastQuoteNumber:text(d.lastQuoteNumber),lastQuotationDate:text(d.lastQuotationDate||row.quote_date)}});loadedAt=Date.now();return records;
  }
  function filtered(){const q=text($('auaVehicleManagerSearch')?.value).toLowerCase();if(!q)return records;return records.filter(r=>[r.vehicle,r.customer,r.phone,r.model].some(v=>String(v||'').toLowerCase().includes(q)))}
  function renderList(){
    const list=$('auaVehicleManagerList'),count=$('auaVehicleManagerCount');if(!list)return;const shown=filtered();if(count)count.textContent=`${shown.length} vehicle master${shown.length===1?'':'s'}`;
    list.innerHTML=shown.length?shown.slice(0,500).map(r=>`<button class="aua-vm-row${r.record_key===selectedKey?' selected':''}" type="button" data-aua-vm-key="${esc(r.record_key)}"><b>${esc(r.vehicle||'NO VEHICLE')}</b><span>${esc(r.customer||'No customer')}${r.model?' · '+esc(r.model):''}${r.phone?' · '+esc(r.phone):''}</span></button>`).join(''):'<div class="small">No matching vehicle masters.</div>';
    list.querySelectorAll('[data-aua-vm-key]').forEach(button=>button.onclick=()=>select(button.dataset.auaVmKey));
  }
  function select(key){selectedKey=key;renderList();renderEditor(records.find(r=>r.record_key===key))}
  function renderEditor(record){
    const editor=$('auaVehicleManagerEditor');if(!editor)return;if(!record){editor.innerHTML='<div class="aua-vm-empty">Select a vehicle master record to edit it.</div>';return}
    editor.innerHTML=`<div class="panel-title">CURRENT MASTER DETAILS</div><div class="aua-vm-grid"><div><label>Vehicle No.</label><input id="auaVmVehicle" value="${esc(record.vehicle)}"></div><div><label>Customer</label><input id="auaVmCustomer" value="${esc(record.customer)}"></div><div><label>Phone</label><input id="auaVmPhone" data-preserve-case value="${esc(record.phone)}"></div><div><label>Model / Type</label><input id="auaVmModel" value="${esc(record.model)}"></div><div><label>Latest Mileage</label><input id="auaVmMileage" data-preserve-case value="${esc(record.mileage)}"></div></div><div class="aua-vm-meta">Saved quotations: <b>${record.quotationCount||0}</b><br>Latest quotation: <b>${esc(record.lastQuoteNumber||'—')}</b>${record.lastQuotationDate?' · '+esc(record.lastQuotationDate):''}<br>Editing this master does not rewrite old quotations.</div><div class="aua-vm-actions"><button id="auaVmSave" class="btn primary" type="button">Save Master</button><button id="auaVmHistory" class="btn secondary" type="button">View Quotation History</button><button id="auaVmDelete" class="btn outline aua-vm-delete" type="button">Delete Master Only</button></div><div id="auaVmStatus" class="aua-vm-status"></div>`;
    $('auaVmSave').onclick=()=>save(record);$('auaVmDelete').onclick=()=>remove(record);$('auaVmHistory').onclick=()=>openHistory(record.vehicle);
  }
  function message(value,tone=''){const el=$('auaVmStatus');if(el){el.textContent=value;el.dataset.tone=tone}}

  async function save(record){
    const vehicle=text($('auaVmVehicle')?.value).toUpperCase(),customer=text($('auaVmCustomer')?.value),phone=text($('auaVmPhone')?.value),model=text($('auaVmModel')?.value),mileage=text($('auaVmMileage')?.value);if(!vehicle){message('Vehicle number is required.','error');return}
    const button=$('auaVmSave');if(button){button.disabled=true;button.textContent='Saving…'}
    try{
      const {client:c,user}=await session(),now=new Date().toISOString(),newKey=`${PREFIX}${norm(vehicle).toLowerCase()}`,data={...(record.data||{}),recordType:'vehicle-master',vehicle,customer,phone,model,mileage,updatedAt:now,updatedBy:user.email||'staff'};
      const payload={user_id:record.user_id||user.id,record_key:newKey,customer,vehicle,quote_date:data.lastQuotationDate||record.quote_date||null,model,total:0,data,updated_at:now};
      const {error}=await c.from('quotations').upsert(payload,{onConflict:'record_key'});if(error)throw error;
      if(newKey!==record.record_key){const {error:deleteError}=await c.from('quotations').delete().eq('record_key',record.record_key);if(deleteError)throw deleteError}
      selectedKey=newKey;await fetchRecords();renderList();renderEditor(records.find(r=>r.record_key===newKey));message('Vehicle master saved.','success');window.AUAWorkshopCloud?.refresh?.().catch?.(()=>{});document.dispatchEvent(new CustomEvent('aua-vehicle-master-updated',{detail:{vehicle}}));
    }catch(error){message(error?.message||'Unable to save vehicle master.','error')}
    finally{if(button){button.disabled=false;button.textContent='Save Master'}}
  }
  async function remove(record){
    if(!confirm(`Delete the vehicle master for ${record.vehicle||'this vehicle'}? Saved quotations will NOT be deleted.`))return;
    const button=$('auaVmDelete');if(button){button.disabled=true;button.textContent='Deleting…'}
    try{const {client:c}=await session(),{error}=await c.from('quotations').delete().eq('record_key',record.record_key);if(error)throw error;selectedKey='';await fetchRecords();renderList();renderEditor(null);window.AUAWorkshopCloud?.refresh?.().catch?.(()=>{});document.dispatchEvent(new CustomEvent('aua-vehicle-master-updated',{detail:{vehicle:record.vehicle}}))}catch(error){message(error?.message||'Unable to delete vehicle master.','error');if(button){button.disabled=false;button.textContent='Delete Master Only'}}
  }
  async function openHistory(vehicle){close();if(typeof window.auaOpenHistory==='function')await window.auaOpenHistory();for(let i=0;i<30;i++){const input=$('auaHistorySearch');if(input){input.value=vehicle;input.dispatchEvent(new Event('input',{bubbles:true}));return}await new Promise(r=>setTimeout(r,75))}}

  async function load(force=false){
    if(loading)return;loading=true;const refresh=$('auaVehicleManagerRefresh');if(refresh){refresh.disabled=true;refresh.textContent='Loading…'}
    try{if(force||!records.length||Date.now()-loadedAt>60000)await fetchRecords();renderList();if(selectedKey)renderEditor(records.find(r=>r.record_key===selectedKey)||null)}catch(error){const list=$('auaVehicleManagerList');if(list)list.innerHTML=`<div class="small" style="color:#b42318">${esc(error?.message||'Unable to load vehicle masters.')}</div>`}finally{loading=false;if(refresh){refresh.disabled=false;refresh.textContent='Refresh'}}
  }
  function open(){ensureUi();$('auaVehicleManagerOverlay')?.classList.add('show');document.body.style.overflow='hidden';load(false)}
  function close(){$('auaVehicleManagerOverlay')?.classList.remove('show');document.body.style.overflow=''}
  function install(attempt=0){if(ensureUi())return;if(attempt<40)setTimeout(()=>install(attempt+1),100)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>install(),{once:true});else install();
  window.AUAVehicleMasterManager={open,refresh:()=>load(true)};
})();
