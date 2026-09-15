// Alan's United Auto - shared workshop data.
// Uses reserved rows in the existing Supabase quotations table so no schema migration is required.
// Reserved rows are excluded from normal quotation history via the getRecent filter below.
(function(){
  const TEMPLATE_KEY='auaJobTemplatesV1';
  const TEMPLATE_MIGRATION_KEY='auaCloudTemplateMigrationV1';
  const RECENT_KEY='auaRecentQuotesV1';
  const TEMPLATE_PREFIX='template|';
  const VEHICLE_PREFIX='vehicle-master|';
  const $=id=>document.getElementById(id);
  const clone=value=>{try{return JSON.parse(JSON.stringify(value))}catch{return value}};
  const text=value=>String(value??'').trim();
  const esc=value=>String(value??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const normVehicle=value=>text(value).toUpperCase().replace(/[^A-Z0-9]/g,'');
  let clientPromise=null,user=null,syncPromise=null,templates=[],masters=new Map(),refreshingPanel=false,saveHookInstalled=false;

  function cloudStatus(message,tone='normal'){
    const el=$('cloudStatus');if(!el)return;el.textContent=message;el.dataset.tone=tone;
  }
  function isReservedKey(key){const value=String(key||'');return value.startsWith(TEMPLATE_PREFIX)||value.startsWith(VEHICLE_PREFIX)}
  function isReservedRecord(record){return isReservedKey(record?.record_key||record?.key)||['job-template','vehicle-master'].includes(String(record?.data?.recordType||''))}
  function localTemplates(){try{const value=JSON.parse(localStorage.getItem(TEMPLATE_KEY)||'[]');return Array.isArray(value)?value.filter(x=>String(x?.id||'').startsWith('custom-')):[]}catch{return[]}}
  function setLocalTemplates(list){templates=clone(list||[]);localStorage.setItem(TEMPLATE_KEY,JSON.stringify(templates));document.dispatchEvent(new CustomEvent('aua-cloud-templates-updated',{detail:{count:templates.length}}));refreshTemplatePanel()}
  function cleanRecentCache(){
    try{const list=JSON.parse(localStorage.getItem(RECENT_KEY)||'[]');if(!Array.isArray(list))return;const clean=list.filter(record=>!isReservedRecord(record));if(clean.length!==list.length)localStorage.setItem(RECENT_KEY,JSON.stringify(clean))}catch{}
  }

  function installRecentFilter(attempt=0){
    const current=window.getRecent;
    if(typeof current!=='function'){if(attempt<30)setTimeout(()=>installRecentFilter(attempt+1),100);return}
    if(current.__auaWorkshopDataFiltered)return;
    function filteredGetRecent(){const list=current.apply(this,arguments)||[];return Array.isArray(list)?list.filter(record=>!isReservedRecord(record)):[]}
    filteredGetRecent.__auaWorkshopDataFiltered=true;
    filteredGetRecent.__auaWorkshopDataBase=current;
    window.getRecent=filteredGetRecent;
    cleanRecentCache();
  }

  async function cloudClient(){
    if(clientPromise)return clientPromise;
    clientPromise=(async()=>{
      if(!window.supabase?.createClient)throw new Error('Online storage library is unavailable.');
      const response=await fetch('./online-storage.js',{cache:'force-cache'});if(!response.ok)throw new Error('Online storage configuration could not be read.');
      const source=await response.text(),url=source.match(/\burl\s*:\s*'([^']+)'/)?.[1],key=source.match(/\bkey\s*:\s*'([^']+)'/)?.[1];
      if(!url||!key)throw new Error('Online storage configuration is unavailable.');
      return window.supabase.createClient(url,key);
    })();
    return clientPromise;
  }
  async function sessionAndClient(){
    const client=await cloudClient(),{data,error}=await client.auth.getSession();if(error)throw error;user=data?.session?.user||null;if(!user)throw new Error('Sign in to sync workshop data.');return{client,user};
  }
  function baseRow(recordKey,data,columns={}){
    return{user_id:columns.user_id||user?.id,record_key:recordKey,customer:text(columns.customer),vehicle:text(columns.vehicle),quote_date:columns.quote_date||null,model:text(columns.model),total:0,data:clone(data),updated_at:new Date().toISOString()};
  }

  function templateRecordKey(id){return `${TEMPLATE_PREFIX}${String(id||'').toLowerCase()}`}
  async function fetchCloudTemplates(){
    const {client}=await sessionAndClient(),{data,error}=await client.from('quotations').select('record_key,user_id,data,updated_at').like('record_key',`${TEMPLATE_PREFIX}%`).order('updated_at',{ascending:false}).limit(200);if(error)throw error;
    return(data||[]).map(row=>{const t=row?.data?.template||row?.data||{};return{id:text(t.id)||String(row.record_key||'').slice(TEMPLATE_PREFIX.length),name:text(t.name)||'Workshop Template',section:clone(t.section||{}),savedAt:t.savedAt||row.updated_at,updatedAt:row.updated_at,updatedBy:text(t.updatedBy)}}).filter(t=>t.id&&t.section);
  }
  async function saveTemplateCloud(template,{silent=false}={}){
    const {client,user:sessionUser}=await sessionAndClient(),now=new Date().toISOString(),payload={recordType:'job-template',template:{id:template.id,name:template.name,section:clone(template.section),savedAt:template.savedAt||now,updatedAt:now,updatedBy:sessionUser.email||'staff'}};
    const row=baseRow(templateRecordKey(template.id),payload,{model:template.name});const {error}=await client.from('quotations').upsert(row,{onConflict:'record_key'});if(error)throw error;
    if(!silent)cloudStatus(`Template “${template.name}” synced to the workshop.`,'success');return true;
  }
  async function deleteTemplateCloud(id){
    const {client}=await sessionAndClient(),{error}=await client.from('quotations').delete().eq('record_key',templateRecordKey(id));if(error)throw error;return true;
  }
  async function syncTemplates({silent=true}={}){
    const cloud=await fetchCloudTemplates();
    const migrated=localStorage.getItem(TEMPLATE_MIGRATION_KEY)==='1';
    if(!migrated){
      const cloudIds=new Set(cloud.map(x=>String(x.id)));
      for(const template of localTemplates()){if(!cloudIds.has(String(template.id)))await saveTemplateCloud(template,{silent:true})}
      localStorage.setItem(TEMPLATE_MIGRATION_KEY,'1');
      templates=await fetchCloudTemplates();
    }else templates=cloud;
    setLocalTemplates(templates);
    if(!silent)cloudStatus(`Workshop templates refreshed · ${templates.length} saved.`,'success');
    return templates;
  }

  function selectedSectionIndex(){
    try{if(typeof activeItem!=='undefined'&&activeItem&&Number.isInteger(activeItem.i)&&S?.[activeItem.i])return activeItem.i}catch{}
    try{if(Array.isArray(S)&&S.length===1)return 0;if(!Array.isArray(S)||!S.length)return-1;const choices=S.map((s,i)=>`${i+1}. ${s.title||'Section'}`).join('\n'),answer=prompt(`Which section do you want to save as a template?\n\n${choices}`,'1'),index=Number(answer)-1;return Number.isInteger(index)&&S[index]?index:-1}catch{return-1}
  }
  function compactSection(source){
    return{title:text(source?.title)||'WORKSHOP JOB',dt:source?.dt||'percent',dv:source?.dv??'',collapsed:false,items:(source?.items||[]).map(x=>({q:x?.q??'',d:text(x?.d),p:x?.p??'',dt:x?.dt||'percent',dv:x?.dv??'',included:!!x?.included,open:false})).filter(x=>x.d||text(x.p))};
  }
  async function saveCurrentSectionAsCloudTemplate(){
    const index=selectedSectionIndex();if(index<0)return;const source=S[index],sectionData=compactSection(source);if(!sectionData.items.length){alert('Add at least one quotation item before saving a template.');return}
    const name=text(prompt('Template name:',source.title||'Workshop Job'));if(!name)return;
    const template={id:`custom-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,name,section:sectionData,savedAt:new Date().toISOString()};
    const next=[template,...localTemplates()];setLocalTemplates(next);
    try{await saveTemplateCloud(template)}catch(error){cloudStatus(`${error?.message||'Cloud sync failed.'} Template is kept on this PC and will retry on the next sync.`,'error')}
  }
  async function deleteCloudTemplate(id){
    const current=localTemplates(),target=current.find(x=>String(x.id)===String(id)),next=current.filter(x=>String(x.id)!==String(id));setLocalTemplates(next);
    try{await deleteTemplateCloud(id);cloudStatus(`Template${target?.name?' “'+target.name+'”':''} deleted from the workshop.`,'success')}catch(error){setLocalTemplates(current);cloudStatus(error?.message||'Unable to delete the workshop template.','error')}
  }
  function refreshTemplatePanel(){
    const trigger=$('auaTemplateTrigger'),panel=$('auaTemplatePanel');if(!trigger||!panel||!panel.classList.contains('show')||refreshingPanel)return;
    refreshingPanel=true;try{trigger.onclick?.();trigger.onclick?.()}finally{setTimeout(()=>{refreshingPanel=false},0)}
  }
  function installTemplateUiBridge(){
    document.addEventListener('click',event=>{
      const target=event.target?.closest?.('button');if(!target)return;
      if(target.id==='auaSaveSectionTemplate'){
        event.preventDefault();event.stopImmediatePropagation();saveCurrentSectionAsCloudTemplate().catch(error=>cloudStatus(error?.message||'Unable to save workshop template.','error'));return;
      }
      if(target.matches('[data-aua-template-delete]')){
        event.preventDefault();event.stopImmediatePropagation();deleteCloudTemplate(target.dataset.auaTemplateDelete).catch(error=>cloudStatus(error?.message||'Unable to delete workshop template.','error'));return;
      }
      if(target.id==='auaTemplateTrigger'&&!refreshingPanel){setTimeout(()=>syncTemplates({silent:true}).catch(error=>console.warn('Template refresh deferred.',error)),20)}
      if(target.id==='cloudRefresh'){setTimeout(()=>syncWorkshopData({silent:true}).catch(()=>{}),350)}
    },true);
  }

  function masterRecordKey(vehicle){return `${VEHICLE_PREFIX}${normVehicle(vehicle).toLowerCase()}`}
  function masterFromRow(row){
    const d=row?.data||{};return{recordKey:row.record_key,user_id:row.user_id,vehicle:text(d.vehicle||row.vehicle),customer:text(d.customer||row.customer),phone:text(d.phone),model:text(d.model||row.model),mileage:text(d.mileage),lastQuoteNumber:text(d.lastQuoteNumber),lastQuotationDate:text(d.lastQuotationDate||row.quote_date),quotationCount:Number(d.quotationCount||0),updatedAt:row.updated_at||d.updatedAt||'',updatedBy:text(d.updatedBy)};
  }
  async function fetchMasters(){
    const {client}=await sessionAndClient(),{data,error}=await client.from('quotations').select('record_key,user_id,customer,vehicle,quote_date,model,data,updated_at').like('record_key',`${VEHICLE_PREFIX}%`).order('updated_at',{ascending:false}).limit(1000);if(error)throw error;
    const map=new Map();(data||[]).forEach(row=>{const master=masterFromRow(row),key=normVehicle(master.vehicle);if(key&&!map.has(key))map.set(key,master)});masters=map;return masters;
  }
  function quoteUpdated(row){const d=new Date(row?.updated_at||0);return Number.isNaN(d.getTime())?0:d.getTime()}
  async function seedMastersFromQuotations(){
    const {client,user:sessionUser}=await sessionAndClient(),{data,error}=await client.from('quotations').select('record_key,user_id,customer,vehicle,quote_date,model,data,updated_at').order('updated_at',{ascending:false}).limit(1000);if(error)throw error;
    const rows=(data||[]).filter(row=>!isReservedRecord(row)&&text(row?.data?.vehicle||row?.vehicle));
    const latest=new Map(),counts=new Map();
    rows.forEach(row=>{const key=normVehicle(row?.data?.vehicle||row?.vehicle);if(!key)return;const quoteRef=text(row?.data?.quoteNumber)||String(row.record_key||'');const countKey=`${key}|${quoteRef}`;if(!counts.has(countKey))counts.set(countKey,true);if(!latest.has(key))latest.set(key,row)});
    const countByVehicle=new Map();counts.forEach((_v,k)=>{const vehicleKey=k.split('|')[0];countByVehicle.set(vehicleKey,(countByVehicle.get(vehicleKey)||0)+1)});
    const upserts=[];
    latest.forEach((row,key)=>{
      const existing=masters.get(key);if(existing&&new Date(existing.updatedAt||0).getTime()>=quoteUpdated(row))return;
      const d=row.data||{},vehicle=text(d.vehicle||row.vehicle);if(!vehicle)return;
      const master={vehicle,customer:text(d.customer||row.customer),phone:text(d.phone),model:text(d.model||row.model),mileage:text(d.mileage),lastQuoteNumber:text(d.quoteNumber),lastQuotationDate:text(d.date||row.quote_date),quotationCount:countByVehicle.get(key)||0,updatedBy:text(d.audit?.lastEditedBy)||sessionUser.email||'staff'};
      const payload={recordType:'vehicle-master',...master};
      upserts.push(baseRow(masterRecordKey(vehicle),payload,{user_id:existing?.user_id||sessionUser.id,customer:master.customer,vehicle:master.vehicle,quote_date:master.lastQuotationDate||null,model:master.model}));
    });
    if(upserts.length){const {error:upsertError}=await client.from('quotations').upsert(upserts,{onConflict:'record_key'});if(upsertError)throw upsertError;await fetchMasters()}
    return upserts.length;
  }
  function recentQuoteCount(vehicle){
    const key=normVehicle(vehicle),seen=new Set();try{(getRecent()||[]).forEach(record=>{if(normVehicle(record?.data?.vehicle)!==key)return;seen.add(text(record?.data?.quoteNumber)||String(record?.key||''))})}catch{}return seen.size;
  }
  async function saveMasterFromCurrent(){
    if(typeof state!=='function')return false;const data=clone(state()),vehicle=text(data.vehicle);if(!vehicle)return false;
    const {client,user:sessionUser}=await sessionAndClient(),key=normVehicle(vehicle),existing=masters.get(key),master={vehicle,customer:text(data.customer),phone:text(data.phone),model:text(data.model),mileage:text(data.mileage),lastQuoteNumber:text(data.quoteNumber),lastQuotationDate:text(data.date),quotationCount:Math.max(Number(existing?.quotationCount||0),recentQuoteCount(vehicle)),updatedBy:text(data.audit?.lastEditedBy)||sessionUser.email||'staff'};
    const payload={recordType:'vehicle-master',...master};
    const row=baseRow(masterRecordKey(vehicle),payload,{user_id:existing?.user_id||sessionUser.id,customer:master.customer,vehicle:master.vehicle,quote_date:master.lastQuotationDate||null,model:master.model});
    const {error}=await client.from('quotations').upsert(row,{onConflict:'record_key'});if(error)throw error;masters.set(key,{...master,recordKey:row.record_key,user_id:row.user_id,updatedAt:row.updated_at});document.dispatchEvent(new CustomEvent('aua-vehicle-master-updated',{detail:{vehicle}}));return true;
  }

  function setAutofill(id,value){const el=$(id);if(!el||value===undefined||value===null||value==='')return;el.value=String(value);el.dataset.auaHistoryAutofill='1'}
  function useMaster(master){setAutofill('customer',master.customer);setAutofill('phone',master.phone);setAutofill('model',master.model);setAutofill('mileage',master.mileage);if(typeof upd==='function')upd();$('auaSmartVehicleLookup')?.classList.remove('show')}
  async function openVehicleHistory(vehicle){
    if(typeof window.auaOpenHistory==='function')await window.auaOpenHistory();for(let i=0;i<30;i++){const search=$('auaHistorySearch');if(search){search.value=vehicle;search.dispatchEvent(new Event('input',{bubbles:true}));return}await new Promise(resolve=>setTimeout(resolve,100))}
  }
  function masterMatches(query){const key=normVehicle(query);if(!key)return[];return Array.from(masters.values()).filter(master=>normVehicle(master.vehicle).includes(key)).sort((a,b)=>{const ae=normVehicle(a.vehicle)===key?0:1,be=normVehicle(b.vehicle)===key?0:1;return ae-be||String(a.vehicle).localeCompare(String(b.vehicle),undefined,{numeric:true})}).slice(0,6)}
  function renderMasterLookup(){
    const input=$('vehicle'),box=$('auaSmartVehicleLookup');if(!input||!box||!masters.size)return false;const key=normVehicle(input.value);if(key.length<2)return false;const matches=masterMatches(input.value);if(!matches.length)return false;
    const exact=matches.find(master=>normVehicle(master.vehicle)===key);
    if(exact){const count=Math.max(exact.quotationCount||0,recentQuoteCount(exact.vehicle));box.innerHTML=`<div class="aua-smart-vehicle-head"><div class="aua-smart-vehicle-title">${esc(exact.vehicle)} <span style="font-size:8px;color:#2563eb">VEHICLE MASTER</span></div><div class="aua-smart-vehicle-count">${count} quotation${count===1?'':'s'}</div></div><div class="aua-smart-vehicle-meta">${esc(exact.customer||'Customer not recorded')}${exact.model?' · '+esc(exact.model):''}${exact.mileage?' · '+esc(exact.mileage)+' km':''}</div><div class="aua-smart-vehicle-actions"><button class="btn secondary" type="button" data-aua-master-action="use">Use Master Details</button><button class="btn outline" type="button" data-aua-master-action="history">View History</button></div>`;box.classList.add('show');box.querySelector('[data-aua-master-action="use"]').onclick=()=>useMaster(exact);box.querySelector('[data-aua-master-action="history"]').onclick=()=>openVehicleHistory(exact.vehicle);return true}
    box.innerHTML=`<div class="aua-smart-vehicle-matches">${matches.map(master=>`<button class="aua-smart-match" type="button" data-aua-master-vehicle="${esc(master.vehicle)}"><b>${esc(master.vehicle)}</b><span>${esc(master.customer||master.model||'Vehicle master')}</span></button>`).join('')}</div>`;box.classList.add('show');box.querySelectorAll('[data-aua-master-vehicle]').forEach(button=>button.onclick=()=>{input.value=button.dataset.auaMasterVehicle||'';input.dispatchEvent(new Event('input',{bubbles:true}));setTimeout(renderMasterLookup,25)});return true;
  }
  function installMasterLookupBridge(attempt=0){
    const input=$('vehicle');if(!input){if(attempt<30)setTimeout(()=>installMasterLookupBridge(attempt+1),100);return}
    if(input.dataset.auaMasterBridge==='1')return;input.dataset.auaMasterBridge='1';
    const queue=()=>setTimeout(()=>renderMasterLookup(),30);input.addEventListener('input',queue);input.addEventListener('focus',queue);document.addEventListener('aua-vehicle-master-updated',queue);
  }

  function installSaveHook(){
    if(saveHookInstalled)return true;const current=window.saveRecord;if(typeof current!=='function')return false;
    async function saveWithMaster(){const result=await current.apply(this,arguments);if(result===false)return result;try{await saveMasterFromCurrent()}catch(error){cloudStatus(`Quotation saved, but vehicle master could not sync: ${error?.message||'unknown error'}`,'error')}return result}
    saveWithMaster.__auaWorkshopCloud=true;saveWithMaster.__auaWorkshopCloudBase=current;window.saveRecord=saveWithMaster;saveHookInstalled=true;return true;
  }
  function scheduleSaveHook(){const install=()=>{if(!installSaveHook())setTimeout(install,200)};setTimeout(install,650)}

  async function syncWorkshopData({silent=true}={}){
    if(syncPromise)return syncPromise;
    syncPromise=(async()=>{await syncTemplates({silent:true});await fetchMasters();const seeded=await seedMastersFromQuotations();cleanRecentCache();if(!silent)cloudStatus(`Workshop data synced · ${templates.length} template${templates.length===1?'':'s'} · ${masters.size} vehicle master${masters.size===1?'':'s'}${seeded?' · '+seeded+' updated':''}.`,'success');renderMasterLookup();return{templates:templates.length,masters:masters.size,seeded}})().finally(()=>{syncPromise=null});
    return syncPromise;
  }

  async function installCloudSync(){
    try{
      const client=await cloudClient();client.auth.onAuthStateChange((_event,session)=>{user=session?.user||null;if(user)setTimeout(()=>syncWorkshopData({silent:true}).catch(error=>console.warn('Workshop data sync deferred.',error)),100);else{templates=[];masters.clear()}});
      const {data}=await client.auth.getSession();user=data?.session?.user||null;if(user)await syncWorkshopData({silent:true});
    }catch(error){console.warn('Shared workshop data will retry after sign-in.',error)}
  }

  window.AUAWorkshopCloud={
    refresh:()=>syncWorkshopData({silent:false}),
    templates:()=>clone(templates),
    masters:()=>clone(Array.from(masters.values())),
    vehicle:vehicle=>clone(masters.get(normVehicle(vehicle))||null),
    saveVehicleMaster:saveMasterFromCurrent
  };

  installRecentFilter();installTemplateUiBridge();installMasterLookupBridge();scheduleSaveHook();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{installRecentFilter();installMasterLookupBridge();installCloudSync()},{once:true});else installCloudSync();
  window.addEventListener('load',()=>{setTimeout(cleanRecentCache,500);setTimeout(cleanRecentCache,1800)},{once:true});
})();