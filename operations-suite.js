// Alan's United Auto - operations suite.
// Vehicle Master Manager, controlled recovery protection, app health and expanded quotation statuses.
(function(){
  const $=id=>document.getElementById(id);
  const text=value=>String(value??'').trim();
  const clone=value=>{try{return JSON.parse(JSON.stringify(value))}catch{return value}};
  const esc=value=>String(value??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const normVehicle=value=>text(value).toUpperCase().replace(/[^A-Z0-9]/g,'');
  const STATUS_OPTIONS=['Draft','Sent','Approved','Job In Progress','Completed','Cancelled'];
  const RECOVERY_KEY='auaRecoveryDraftV2';
  const RECOVERY_MAX_AGE=7*24*60*60*1000;
  let currentStatus='Draft',statusHooksInstalled=false,saveHealthInstalled=false,recoveryTimer=null,healthTimer=null,managerClientPromise=null;

  function addStyles(){
    if($('auaOperationsStyles'))return;
    const style=document.createElement('style');style.id='auaOperationsStyles';style.textContent=`
      .aua-health-bar{display:none;margin:0 0 10px;padding:8px 10px;border:1px solid #dbe4ee;border-radius:9px;background:#f8fafc;color:#475569;font-size:10px;line-height:1.35}.aua-health-bar.show{display:flex;align-items:center;justify-content:space-between;gap:10px}.aua-health-bar[data-tone="warn"]{background:#fffbeb;border-color:#fde68a;color:#92400e}.aua-health-bar[data-tone="error"]{background:#fff1f2;border-color:#fecdd3;color:#9f1239}.aua-health-bar[data-tone="success"]{background:#ecfdf3;border-color:#bbf7d0;color:#166534}.aua-health-actions{display:flex;gap:6px;flex:0 0 auto}.aua-health-actions button{min-height:28px;padding:5px 8px;font-size:9px}
      .aua-master-manager-button{min-height:30px;padding:6px 9px;border-radius:8px;background:#fff;color:#475569;border:1px solid #d5dee9;font-size:9.5px;font-weight:750;white-space:nowrap;cursor:pointer}
      .aua-master-overlay{position:fixed;inset:0;z-index:17000;display:none;padding:22px;background:rgba(15,23,42,.58);overflow:auto}.aua-master-overlay.show{display:block}.aua-master-shell{width:min(1080px,100%);margin:auto;background:#f8fafc;border-radius:16px;overflow:hidden;box-shadow:0 28px 80px rgba(15,23,42,.32)}.aua-master-head{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:18px 20px;background:#fff;border-bottom:1px solid #e2e8f0}.aua-master-head h3{margin:0;color:#0f2747;font-size:20px}.aua-master-head p{margin:3px 0 0;color:#64748b;font-size:10px}.aua-master-main{display:grid;grid-template-columns:minmax(280px,.85fr) minmax(0,1.15fr);min-height:520px}.aua-master-list-pane{padding:16px;border-right:1px solid #e2e8f0;background:#fff}.aua-master-search{min-height:42px;font-size:12px}.aua-master-list{display:grid;gap:6px;max-height:455px;overflow:auto;margin-top:10px}.aua-master-row{width:100%;display:grid;grid-template-columns:95px minmax(0,1fr);gap:8px;padding:9px 10px;border:1px solid #dce4ef;border-radius:9px;background:#fff;text-align:left;cursor:pointer}.aua-master-row:hover,.aua-master-row.selected{border-color:#2563eb;background:#f8fbff}.aua-master-row b{font-size:10.5px;color:#172033}.aua-master-row span{font-size:9px;color:#64748b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.aua-master-form-pane{padding:20px}.aua-master-empty{min-height:300px;display:grid;place-items:center;color:#94a3b8;text-align:center}.aua-master-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.aua-master-form-grid .wide{grid-column:1/-1}.aua-master-form-pane label{font-size:9px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:.04em}.aua-master-form-pane input{min-height:39px}.aua-master-meta{margin-top:14px;padding:10px;border:1px solid #e2e8f0;border-radius:9px;background:#fff;color:#64748b;font-size:9.5px;line-height:1.5}.aua-master-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:14px}.aua-master-message{min-height:18px;margin-top:8px;font-size:9.5px;color:#64748b}.aua-master-message[data-tone="success"]{color:#166534}.aua-master-message[data-tone="error"]{color:#b42318}
      @media(max-width:760px){.aua-health-bar.show{align-items:flex-start;flex-direction:column}.aua-master-overlay{padding:0}.aua-master-shell{min-height:100vh;border-radius:0}.aua-master-main{grid-template-columns:1fr}.aua-master-list-pane{border-right:0;border-bottom:1px solid #e2e8f0}.aua-master-list{max-height:240px}.aua-master-form-grid{grid-template-columns:1fr}.aua-master-form-grid .wide{grid-column:auto}}
      @media print{.aua-health-bar,.aua-master-overlay,.aua-master-manager-button{display:none!important}}
    `;document.head.appendChild(style);
  }

  // ---------- Expanded quotation status workflow ----------
  function normalizeStatus(value){return STATUS_OPTIONS.includes(text(value))?text(value):'Draft'}
  function syncStatusUi(){
    const select=$('auaQuoteStatus');if(select){
      const existing=Array.from(select.options).map(o=>o.value);
      if(existing.join('|')!==STATUS_OPTIONS.join('|'))select.innerHTML=STATUS_OPTIONS.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');
      select.value=currentStatus;
    }
    const header=$('auaUiStatus');if(header)header.textContent=currentStatus;
  }
  function bindStatusSelect(){
    const select=$('auaQuoteStatus');if(!select||select.dataset.auaStatusV2Bound==='1')return false;
    select.dataset.auaStatusV2Bound='1';select.addEventListener('change',()=>{currentStatus=normalizeStatus(select.value);setTimeout(syncStatusUi,0)});return true;
  }
  function installStatusHooks(){
    if(statusHooksInstalled)return true;
    if(typeof window.state!=='function'||typeof window.loadRecord!=='function')return false;
    const baseState=window.state,baseLoad=window.loadRecord,baseNew=window.newQuote,baseDuplicate=window.duplicateQuote;
    try{currentStatus=normalizeStatus(baseState()?.status||$('auaQuoteStatus')?.value)}catch{currentStatus=normalizeStatus($('auaQuoteStatus')?.value)}
    window.state=function(){const data=baseState.apply(this,arguments);data.status=currentStatus;return data};window.state.__auaStatusWorkflowV2=true;
    window.loadRecord=function(data){currentStatus=normalizeStatus(data?.status);const result=baseLoad.apply(this,arguments);setTimeout(()=>{bindStatusSelect();syncStatusUi()},0);return result};
    if(typeof baseNew==='function')window.newQuote=function(){const result=baseNew.apply(this,arguments);currentStatus='Draft';setTimeout(syncStatusUi,0);return result};
    if(typeof baseDuplicate==='function')window.duplicateQuote=function(){const result=baseDuplicate.apply(this,arguments);currentStatus='Draft';setTimeout(syncStatusUi,0);return result};
    statusHooksInstalled=true;bindStatusSelect();syncStatusUi();return true;
  }

  // ---------- App health + controlled recovery ----------
  function healthHost(){return $('cloudPanel')||document.querySelector('.editor')||document.body}
  function ensureHealthBar(){
    if($('auaHealthBar'))return $('auaHealthBar');const bar=document.createElement('div');bar.id='auaHealthBar';bar.className='aua-health-bar';
    const host=healthHost();if(host?.parentElement)host.insertAdjacentElement('afterend',bar);else document.body.prepend(bar);return bar;
  }
  function showHealth(message,tone='normal',actions=[],autoHide=0){
    const bar=ensureHealthBar();bar.dataset.tone=tone;bar.innerHTML=`<span>${esc(message)}</span><span class="aua-health-actions">${actions.map(a=>`<button type="button" class="btn outline" data-aua-health-action="${esc(a.id)}">${esc(a.label)}</button>`).join('')}</span>`;bar.classList.add('show');
    actions.forEach(a=>bar.querySelector(`[data-aua-health-action="${a.id}"]`)?.addEventListener('click',a.run,{once:true}));
    clearTimeout(healthTimer);if(autoHide>0)healthTimer=setTimeout(()=>bar.classList.remove('show'),autoHide);
  }
  function hideHealth(){clearTimeout(healthTimer);$('auaHealthBar')?.classList.remove('show')}
  function meaningful(data){if(!data)return false;if(text(data.customer)||text(data.vehicle)||text(data.phone)||text(data.model))return true;return(data.sections||[]).some(s=>(s.items||[]).some(i=>text(i.d||i.desc)||text(i.p??i.price)))}
  function signature(data){try{const copy=clone(data);delete copy.revisions;delete copy.revision;delete copy.audit;return JSON.stringify(copy)}catch{return''}}
  function writeRecovery(){
    try{if(typeof window.state!=='function')return;const data=clone(window.state());if(!meaningful(data))return;localStorage.setItem(RECOVERY_KEY,JSON.stringify({savedAt:Date.now(),signature:signature(data),data}))}catch{}
  }
  function queueRecovery(){clearTimeout(recoveryTimer);recoveryTimer=setTimeout(writeRecovery,1100)}
  function clearRecovery(){try{localStorage.removeItem(RECOVERY_KEY)}catch{}}
  function readRecovery(){try{const item=JSON.parse(localStorage.getItem(RECOVERY_KEY)||'null');if(!item?.data||Date.now()-Number(item.savedAt||0)>RECOVERY_MAX_AGE){clearRecovery();return null}return item}catch{return null}}
  function checkRecovery(){
    const saved=readRecovery();if(!saved||typeof window.state!=='function'||typeof window.loadRecord!=='function')return;
    let current='';try{current=signature(window.state())}catch{}
    if(saved.signature&&saved.signature===current){clearRecovery();return}
    showHealth('Unsaved quotation recovery is available.','warn',[
      {id:'restore',label:'Restore',run:()=>{try{window.loadRecord(clone(saved.data));showHealth('Recovered the unsaved quotation. Please review and save it.', 'success',[],4500)}catch{showHealth('Recovery could not be restored.','error')}}},
      {id:'discard',label:'Dismiss',run:()=>{clearRecovery();hideHealth()}}
    ]);
  }
  function installRecoveryListeners(){
    if(document.documentElement.dataset.auaRecoveryV2==='1')return;document.documentElement.dataset.auaRecoveryV2='1';
    document.addEventListener('input',event=>{if(event.target?.closest?.('#auaHistoryOverlay,#auaVehicleMasterOverlay,#auaPreflightOverlay'))return;queueRecovery()},true);
    document.addEventListener('change',event=>{if(event.target?.closest?.('#auaHistoryOverlay,#auaVehicleMasterOverlay,#auaPreflightOverlay'))return;queueRecovery()},true);
    window.addEventListener('offline',()=>showHealth('Offline — your unsaved quotation is protected on this PC. Cloud actions will resume when the connection returns.','warn'));
    window.addEventListener('online',()=>showHealth('Back online. Cloud functions are available again.','success',[],3500));
    window.addEventListener('error',()=>{writeRecovery();showHealth('An app issue was detected. Your unsaved quotation has been protected locally.','error',[],6000)});
    window.addEventListener('unhandledrejection',()=>{writeRecovery();showHealth('A background operation failed. Your unsaved quotation has been protected locally.','error',[],6000)});
    navigator.serviceWorker?.addEventListener?.('controllerchange',()=>showHealth('A newer app version was installed. Refresh once when convenient.','warn',[{id:'refresh',label:'Refresh',run:()=>location.reload()}]));
  }
  function installSaveHealthHook(){
    if(saveHealthInstalled)return true;const current=window.saveRecord;if(typeof current!=='function')return false;if(current.__auaHealthSave){saveHealthInstalled=true;return true}
    async function wrappedSave(){
      writeRecovery();
      try{
        const result=await current.apply(this,arguments);if(result===false){showHealth('Save was not completed. Your unsaved quotation remains protected locally.','warn',[],5000);return result}
        await new Promise(resolve=>setTimeout(resolve,120));const cloud=$('cloudStatus');
        if(cloud?.dataset?.tone==='error'){showHealth('Quotation is protected locally, but cloud sync needs attention: '+text(cloud.textContent),'warn');return result}
        clearRecovery();showHealth('Quotation saved successfully.','success',[],2400);return result;
      }catch(error){writeRecovery();showHealth('Save failed. Your unsaved quotation is protected locally. '+text(error?.message),'error');throw error}
    }
    wrappedSave.__auaHealthSave=true;wrappedSave.__auaHealthBase=current;window.saveRecord=wrappedSave;saveHealthInstalled=true;return true;
  }

  // ---------- Vehicle Master Manager ----------
  async function managerClient(){
    if(managerClientPromise)return managerClientPromise;managerClientPromise=(async()=>{
      if(!window.supabase?.createClient)throw new Error('Online storage is unavailable.');
      const response=await fetch('./online-storage.js',{cache:'force-cache'});if(!response.ok)throw new Error('Online storage configuration could not be read.');
      const source=await response.text(),url=source.match(/\burl\s*:\s*'([^']+)'/)?.[1],key=source.match(/\bkey\s*:\s*'([^']+)'/)?.[1];if(!url||!key)throw new Error('Online storage configuration is unavailable.');return window.supabase.createClient(url,key);
    })();return managerClientPromise;
  }
  function masterList(){try{return window.AUAWorkshopCloud?.masters?.()||[]}catch{return[]}}
  function ensureMasterManager(){
    if($('auaVehicleMasterOverlay'))return;
    const overlay=document.createElement('div');overlay.id='auaVehicleMasterOverlay';overlay.className='aua-master-overlay';overlay.innerHTML=`<div class="aua-master-shell"><div class="aua-master-head"><div><h3>Vehicle Master Manager</h3><p>Correct the current customer and vehicle details without creating another quotation.</p></div><button id="auaMasterClose" class="btn outline" type="button">Close</button></div><div class="aua-master-main"><section class="aua-master-list-pane"><input id="auaMasterSearch" class="aua-master-search" type="search" data-preserve-case placeholder="Search number plate, customer, phone or model…"><div id="auaMasterList" class="aua-master-list"></div></section><section id="auaMasterFormPane" class="aua-master-form-pane"><div class="aua-master-empty"><div><b>Select a vehicle</b><br><span>Choose a record from the left to edit its current master details.</span></div></div></section></div></div>`;document.body.appendChild(overlay);
    $('auaMasterClose').onclick=()=>overlay.classList.remove('show');overlay.onclick=e=>{if(e.target===overlay)overlay.classList.remove('show')};$('auaMasterSearch').addEventListener('input',renderMasterList);
  }
  function filteredMasters(){
    const query=text($('auaMasterSearch')?.value).toLowerCase(),compact=query.replace(/[^a-z0-9]/g,'');return masterList().filter(m=>{if(!query)return true;const primary=[m.vehicle,m.customer,m.phone,m.model].map(v=>text(v).toLowerCase()).join(' '),vehicle=normVehicle(m.vehicle).toLowerCase();return primary.includes(query)||(compact&&vehicle.includes(compact))}).sort((a,b)=>String(a.vehicle).localeCompare(String(b.vehicle),undefined,{numeric:true})).slice(0,250);
  }
  function renderMasterList(selectedVehicle=''){
    const list=$('auaMasterList');if(!list)return;const items=filteredMasters();list.innerHTML=items.length?items.map(m=>`<button type="button" class="aua-master-row${normVehicle(m.vehicle)===normVehicle(selectedVehicle)?' selected':''}" data-aua-master-row="${esc(m.vehicle)}"><b>${esc(m.vehicle||'—')}</b><span>${esc(m.customer||m.model||'No customer details')}</span></button>`).join(''):'<div class="aua-master-empty"><span>No vehicle masters match your search.</span></div>';
    list.querySelectorAll('[data-aua-master-row]').forEach(row=>row.onclick=()=>selectMaster(row.dataset.auaMasterRow));
  }
  function selectMaster(vehicle){
    const master=masterList().find(m=>normVehicle(m.vehicle)===normVehicle(vehicle));if(!master)return;renderMasterList(master.vehicle);const pane=$('auaMasterFormPane');if(!pane)return;
    pane.innerHTML=`<div class="aua-master-form-grid"><div><label>Number Plate</label><input id="auaMasterVehicle" data-preserve-case value="${esc(master.vehicle)}" readonly></div><div><label>Customer</label><input id="auaMasterCustomer" data-preserve-case value="${esc(master.customer)}"></div><div><label>Phone</label><input id="auaMasterPhone" data-preserve-case value="${esc(master.phone)}"></div><div><label>Model</label><input id="auaMasterModel" data-preserve-case value="${esc(master.model)}"></div><div><label>Latest Mileage</label><input id="auaMasterMileage" data-preserve-case value="${esc(master.mileage)}"></div></div><div class="aua-master-meta">Previous quotations: <b>${Number(master.quotationCount||0)}</b><br>Last quotation: <b>${esc(master.lastQuoteNumber||'—')}</b>${master.lastQuotationDate?' · '+esc(master.lastQuotationDate):''}<br>Last master update: ${esc(master.updatedAt||'—')}</div><div class="aua-master-actions"><button id="auaMasterViewHistory" class="btn outline" type="button">View History</button><button id="auaMasterSave" class="btn primary" type="button">Save Changes</button></div><div id="auaMasterMessage" class="aua-master-message"></div>`;
    $('auaMasterViewHistory').onclick=async()=>{overlayClose();if(typeof window.auaOpenHistory==='function')await window.auaOpenHistory();setTimeout(()=>{const search=$('auaHistorySearch');if(search){search.value=master.vehicle;search.dispatchEvent(new Event('input',{bubbles:true}))}},80)};
    $('auaMasterSave').onclick=()=>saveMasterEdits(master);
  }
  function overlayClose(){$('auaVehicleMasterOverlay')?.classList.remove('show')}
  async function saveMasterEdits(master){
    const button=$('auaMasterSave'),message=$('auaMasterMessage');if(!button||!message)return;button.disabled=true;button.textContent='Saving…';message.textContent='Saving vehicle master…';message.dataset.tone='';
    try{
      const client=await managerClient(),{data:sessionData,error:sessionError}=await client.auth.getSession();if(sessionError)throw sessionError;const sessionUser=sessionData?.session?.user;if(!sessionUser)throw new Error('Sign in to edit vehicle masters.');
      const now=new Date().toISOString(),updated={...clone(master),customer:text($('auaMasterCustomer')?.value),phone:text($('auaMasterPhone')?.value),model:text($('auaMasterModel')?.value),mileage:text($('auaMasterMileage')?.value),updatedAt:now,updatedBy:sessionUser.email||'staff'};
      const recordKey=`vehicle-master|${normVehicle(updated.vehicle).toLowerCase()}`,payload={recordType:'vehicle-master',vehicle:updated.vehicle,customer:updated.customer,phone:updated.phone,model:updated.model,mileage:updated.mileage,lastQuoteNumber:updated.lastQuoteNumber,lastQuotationDate:updated.lastQuotationDate,quotationCount:Number(updated.quotationCount||0),updatedAt:now,updatedBy:updated.updatedBy};
      const row={user_id:master.user_id||sessionUser.id,record_key:recordKey,customer:updated.customer,vehicle:updated.vehicle,quote_date:updated.lastQuotationDate||null,model:updated.model,total:0,data:payload,updated_at:now};const {error}=await client.from('quotations').upsert(row,{onConflict:'record_key'});if(error)throw error;
      await window.AUAWorkshopCloud?.refresh?.();message.textContent='Vehicle master updated.';message.dataset.tone='success';renderMasterList(updated.vehicle);setTimeout(()=>selectMaster(updated.vehicle),120);
    }catch(error){message.textContent=error?.message||'Unable to update vehicle master.';message.dataset.tone='error'}finally{button.disabled=false;button.textContent='Save Changes'}
  }
  function installMasterButton(){
    const signed=$('cloudSignedIn');if(!signed)return false;let button=$('auaVehicleMasterManagerBtn');if(button)return true;button=document.createElement('button');button.id='auaVehicleMasterManagerBtn';button.type='button';button.className='aua-master-manager-button';button.textContent='Vehicle Masters';const toolbar=signed.querySelector('.toolbar')||signed;toolbar.appendChild(button);button.onclick=()=>{ensureMasterManager();renderMasterList();$('auaVehicleMasterOverlay').classList.add('show');setTimeout(()=>$('auaMasterSearch')?.focus(),0)};return true;
  }

  function installCore(){addStyles();ensureHealthBar();installRecoveryListeners();installMasterButton();bindStatusSelect();syncStatusUi()}
  function installLate(attempt=0){const a=installStatusHooks(),b=installSaveHealthHook(),c=installMasterButton();if((!a||!b||!c)&&attempt<30)setTimeout(()=>installLate(attempt+1),160)}
  function start(){installCore();setTimeout(()=>installLate(),700);setTimeout(checkRecovery,1200)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.addEventListener('load',()=>setTimeout(()=>installLate(),950),{once:true});
})();
