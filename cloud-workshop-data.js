// Alan's United Auto - shared workshop data.
// Fast cloud-synced user templates + one current master record per vehicle.
(function(){
  const TEMPLATE_KEY='auaJobTemplatesV1';
  const TEMPLATE_MIGRATION_KEY='auaCloudTemplateMigrationV1';
  const MASTER_SEED_KEY='auaVehicleMasterSeedV2';
  const TEMPLATE_PREFIX='template|';
  const VEHICLE_PREFIX='vehicle-master|';
  const $=id=>document.getElementById(id);
  const clone=value=>{try{return JSON.parse(JSON.stringify(value))}catch{return value}};
  const text=value=>String(value??'').trim();
  const esc=value=>String(value??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const normVehicle=value=>text(value).toUpperCase().replace(/[^A-Z0-9]/g,'');
  let clientPromise=null,user=null,syncPromise=null,templates=[],masters=new Map(),lastSyncedUser='',lastSyncAt=0,seedQueued=false;

  function status(message,tone='normal'){const el=$('cloudStatus');if(!el)return;el.textContent=message;el.dataset.tone=tone}
  function reservedKey(key){const value=String(key||'');return value.startsWith(TEMPLATE_PREFIX)||value.startsWith(VEHICLE_PREFIX)}
  function reservedRecord(record){return reservedKey(record?.record_key||record?.key)||['job-template','vehicle-master'].includes(String(record?.data?.recordType||''))}
  function localTemplates(){try{const list=JSON.parse(localStorage.getItem(TEMPLATE_KEY)||'[]');return Array.isArray(list)?list.filter(t=>String(t?.id||'').startsWith('custom-')):[]}catch{return[]}}
  function setLocalTemplates(list){templates=clone(list||[]);localStorage.setItem(TEMPLATE_KEY,JSON.stringify(templates));document.dispatchEvent(new CustomEvent('aua-cloud-templates-updated',{detail:{count:templates.length}}));refreshTemplatePanel()}

  function installRecentFilter(attempt=0){
    const current=window.getRecent;if(typeof current!=='function'){if(attempt<30)setTimeout(()=>installRecentFilter(attempt+1),100);return}
    if(current.__auaWorkshopDataFiltered)return;
    function filtered(){const list=current.apply(this,arguments)||[];return Array.isArray(list)?list.filter(r=>!reservedRecord(r)):[]}
    filtered.__auaWorkshopDataFiltered=true;filtered.__auaWorkshopDataBase=current;window.getRecent=filtered;
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
  async function session(){const client=await cloudClient(),{data,error}=await client.auth.getSession();if(error)throw error;user=data?.session?.user||null;if(!user)throw new Error('Sign in to sync workshop data.');return{client,user}}
  function row(recordKey,data,columns={}){return{user_id:columns.user_id||user?.id,record_key:recordKey,customer:text(columns.customer),vehicle:text(columns.vehicle),quote_date:columns.quote_date||null,model:text(columns.model),total:0,data:clone(data),updated_at:new Date().toISOString()}}

  // ---------- Shared job templates ----------
  const templateKey=id=>`${TEMPLATE_PREFIX}${String(id||'').toLowerCase()}`;
  async function fetchTemplates(){
    const {client}=await session(),{data,error}=await client.from('quotations').select('record_key,data,updated_at').like('record_key',`${TEMPLATE_PREFIX}%`).order('updated_at',{ascending:false}).limit(200);if(error)throw error;
    return(data||[]).map(r=>{const t=r?.data?.template||{};return{id:text(t.id)||String(r.record_key||'').slice(TEMPLATE_PREFIX.length),name:text(t.name)||'Workshop Template',section:clone(t.section||{}),savedAt:t.savedAt||r.updated_at,updatedAt:r.updated_at,updatedBy:text(t.updatedBy)}}).filter(t=>t.id&&t.section?.items);
  }
  async function putTemplate(template,{silent=false}={}){
    const {client,user:sessionUser}=await session(),now=new Date().toISOString(),payload={recordType:'job-template',template:{id:template.id,name:template.name,section:clone(template.section),savedAt:template.savedAt||now,updatedAt:now,updatedBy:sessionUser.email||'staff'}},record=row(templateKey(template.id),payload,{model:template.name});
    const {error}=await client.from('quotations').upsert(record,{onConflict:'record_key'});if(error)throw error;if(!silent)status(`Template “${template.name}” synced to the workshop.`,'success');return true;
  }
  async function removeTemplate(id){const {client}=await session(),{error}=await client.from('quotations').delete().eq('record_key',templateKey(id));if(error)throw error}
  async function syncTemplates({silent=true}={}){
    let cloud=await fetchTemplates();
    if(localStorage.getItem(TEMPLATE_MIGRATION_KEY)!=='1'){
      const cloudIds=new Set(cloud.map(t=>String(t.id)));for(const t of localTemplates()){if(!cloudIds.has(String(t.id)))await putTemplate(t,{silent:true})}
      localStorage.setItem(TEMPLATE_MIGRATION_KEY,'1');cloud=await fetchTemplates();
    }
    setLocalTemplates(cloud);if(!silent)status(`Workshop templates refreshed · ${cloud.length} saved.`,'success');return cloud;
  }
  function selectedSectionIndex(){
    try{if(typeof activeItem!=='undefined'&&activeItem&&Number.isInteger(activeItem.i)&&S[activeItem.i])return activeItem.i}catch{}
    try{if(!Array.isArray(S)||!S.length)return-1;if(S.length===1)return 0;const choices=S.map((s,i)=>`${i+1}. ${s.title||'Section'}`).join('\n'),answer=prompt(`Which section do you want to save as a template?\n\n${choices}`,'1'),index=Number(answer)-1;return Number.isInteger(index)&&S[index]?index:-1}catch{return-1}
  }
  function compactSection(source){return{title:text(source?.title)||'WORKSHOP JOB',dt:source?.dt||'percent',dv:source?.dv??'',collapsed:false,items:(source?.items||[]).map(x=>({q:x?.q??'',d:text(x?.d),p:x?.p??'',dt:x?.dt||'percent',dv:x?.dv??'',included:!!x?.included,open:false})).filter(x=>x.d||text(x.p))}}
  async function saveSectionTemplate(){
    const index=selectedSectionIndex();if(index<0)return;const source=S[index],sectionData=compactSection(source);if(!sectionData.items.length){alert('Add at least one quotation item before saving a template.');return}
    const name=text(prompt('Template name:',source.title||'Workshop Job'));if(!name)return;const template={id:`custom-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,name,section:sectionData,savedAt:new Date().toISOString()};
    setLocalTemplates([template,...localTemplates()]);try{await putTemplate(template)}catch(error){status(`${error?.message||'Cloud sync failed.'} Template remains on this PC and will retry on the next sync.`,'error')}
  }
  async function deleteTemplate(id){const before=localTemplates(),target=before.find(t=>String(t.id)===String(id));setLocalTemplates(before.filter(t=>String(t.id)!==String(id)));try{await removeTemplate(id);status(`Template${target?.name?' “'+target.name+'”':''} deleted from the workshop.`,'success')}catch(error){setLocalTemplates(before);status(error?.message||'Unable to delete the workshop template.','error')}}
  function refreshTemplatePanel(){
    const panel=$('auaTemplatePanel');if(!panel||!panel.classList.contains('show'))return;
    window.AUARenderTemplatePanel?.();
  }
  function installTemplateBridge(){
    document.addEventListener('click',event=>{
      const button=event.target?.closest?.('button');if(!button)return;
      if(button.id==='auaSaveSectionTemplate'){event.preventDefault();event.stopImmediatePropagation();saveSectionTemplate().catch(e=>status(e?.message||'Unable to save workshop template.','error'));return}
      if(button.matches('[data-aua-template-delete]')){event.preventDefault();event.stopImmediatePropagation();deleteTemplate(button.dataset.auaTemplateDelete).catch(e=>status(e?.message||'Unable to delete workshop template.','error'));return}
      if(button.id==='cloudRefresh')setTimeout(()=>syncLight({silent:false,force:true}).catch(()=>{}),100);
    },true);
  }

  // ---------- Shared vehicle master ----------
  const vehicleKey=vehicle=>`${VEHICLE_PREFIX}${normVehicle(vehicle).toLowerCase()}`;
  function masterFromRow(r){const d=r?.data||{};return{recordKey:r.record_key,user_id:r.user_id,vehicle:text(d.vehicle||r.vehicle),customer:text(d.customer||r.customer),phone:text(d.phone),model:text(d.model||r.model),mileage:text(d.mileage),lastQuoteNumber:text(d.lastQuoteNumber),lastQuotationDate:text(d.lastQuotationDate||r.quote_date),quotationCount:Number(d.quotationCount||0),updatedAt:d.updatedAt||r.updated_at||'',updatedBy:text(d.updatedBy)}}
  async function fetchMasters(){
    const {client}=await session(),{data,error}=await client.from('quotations').select('record_key,user_id,customer,vehicle,quote_date,model,data,updated_at').like('record_key',`${VEHICLE_PREFIX}%`).order('updated_at',{ascending:false}).limit(1000);if(error)throw error;
    const next=new Map();(data||[]).forEach(r=>{const m=masterFromRow(r),key=normVehicle(m.vehicle);if(key&&!next.has(key))next.set(key,m)});masters=next;return masters;
  }
  async function seedMasters(){
    if(masters.size||localStorage.getItem(MASTER_SEED_KEY)==='1')return 0;
    const {client,user:sessionUser}=await session(),{data,error}=await client.from('quotations').select('record_key,user_id,customer,vehicle,quote_date,model,data,updated_at').not('record_key','like',`${TEMPLATE_PREFIX}%`).not('record_key','like',`${VEHICLE_PREFIX}%`).order('updated_at',{ascending:false}).limit(1000);if(error)throw error;
    const latest=new Map(),uniqueQuotes=new Map();
    (data||[]).forEach(r=>{const d=r.data||{},key=normVehicle(d.vehicle||r.vehicle);if(!key)return;const quoteRef=text(d.quoteNumber)||String(r.record_key||'');uniqueQuotes.set(`${key}|${quoteRef}`,key);if(!latest.has(key))latest.set(key,r)});
    const counts=new Map();uniqueQuotes.forEach(key=>counts.set(key,(counts.get(key)||0)+1));const updates=[];
    latest.forEach((r,key)=>{const d=r.data||{},vehicle=text(d.vehicle||r.vehicle);if(!vehicle)return;const master={vehicle,customer:text(d.customer||r.customer),phone:text(d.phone),model:text(d.model||r.model),mileage:text(d.mileage),lastQuoteNumber:text(d.quoteNumber),lastQuotationDate:text(d.date||r.quote_date),quotationCount:counts.get(key)||0,updatedAt:new Date().toISOString(),updatedBy:text(d.audit?.lastEditedBy)||sessionUser.email||'staff'};updates.push(row(vehicleKey(vehicle),{recordType:'vehicle-master',...master},{user_id:sessionUser.id,customer:master.customer,vehicle,quote_date:master.lastQuotationDate||null,model:master.model}))});
    if(updates.length){const {error:upsertError}=await client.from('quotations').upsert(updates,{onConflict:'record_key'});if(upsertError)throw upsertError;await fetchMasters()}
    localStorage.setItem(MASTER_SEED_KEY,'1');return updates.length;
  }
  function queueMasterSeed(){
    if(seedQueued||masters.size||localStorage.getItem(MASTER_SEED_KEY)==='1')return;seedQueued=true;
    const run=()=>seedMasters().catch(error=>console.warn('Vehicle master seed deferred.',error)).finally(()=>{seedQueued=false});
    if('requestIdleCallback'in window)requestIdleCallback(run,{timeout:5000});else setTimeout(run,2500);
  }
  function recentCount(vehicle){const key=normVehicle(vehicle),seen=new Set();try{(getRecent()||[]).forEach(r=>{if(normVehicle(r?.data?.vehicle)!==key)return;seen.add(text(r?.data?.quoteNumber)||String(r?.key||''))})}catch{}return seen.size}
  async function saveMaster(){
    if(typeof state!=='function')return false;const data=clone(state()),vehicle=text(data.vehicle);if(!vehicle)return false;const {client,user:sessionUser}=await session(),key=normVehicle(vehicle),existing=masters.get(key),master={vehicle,customer:text(data.customer),phone:text(data.phone),model:text(data.model),mileage:text(data.mileage),lastQuoteNumber:text(data.quoteNumber),lastQuotationDate:text(data.date),quotationCount:Math.max(Number(existing?.quotationCount||0),recentCount(vehicle)),updatedAt:new Date().toISOString(),updatedBy:text(data.audit?.lastEditedBy)||sessionUser.email||'staff'};
    const record=row(vehicleKey(vehicle),{recordType:'vehicle-master',...master},{user_id:existing?.user_id||sessionUser.id,customer:master.customer,vehicle,quote_date:master.lastQuotationDate||null,model:master.model}),{error}=await client.from('quotations').upsert(record,{onConflict:'record_key'});if(error)throw error;masters.set(key,{...master,recordKey:record.record_key,user_id:record.user_id});document.dispatchEvent(new CustomEvent('aua-vehicle-master-updated',{detail:{vehicle}}));return true;
  }
  async function updateVehicleMaster(vehicle,changes={}){
    const key=normVehicle(vehicle),existing=masters.get(key);if(!key||!existing)throw new Error('Vehicle master could not be found.');
    const {client,user:sessionUser}=await session(),now=new Date().toISOString();
    const master={
      ...existing,
      customer:changes.customer===undefined?text(existing.customer):text(changes.customer),
      phone:changes.phone===undefined?text(existing.phone):text(changes.phone),
      model:changes.model===undefined?text(existing.model):text(changes.model),
      mileage:changes.mileage===undefined?text(existing.mileage):text(changes.mileage),
      updatedAt:now,
      updatedBy:sessionUser.email||'staff'
    };
    const record=row(vehicleKey(existing.vehicle),{recordType:'vehicle-master',...master},{user_id:existing.user_id||sessionUser.id,customer:master.customer,vehicle:existing.vehicle,quote_date:master.lastQuotationDate||null,model:master.model});
    const {error}=await client.from('quotations').upsert(record,{onConflict:'record_key'});if(error)throw error;
    masters.set(key,{...master,recordKey:record.record_key,user_id:record.user_id});
    document.dispatchEvent(new CustomEvent('aua-vehicle-master-updated',{detail:{vehicle:existing.vehicle}}));
    return clone(masters.get(key));
  }

  function setAutofill(id,value){const el=$(id);if(!el||value===undefined||value===null||value==='')return;el.value=String(value);el.dataset.auaHistoryAutofill='1'}
  function useMaster(m){setAutofill('customer',m.customer);setAutofill('phone',m.phone);setAutofill('model',m.model);setAutofill('mileage',m.mileage);if(typeof upd==='function')upd();$('auaSmartVehicleLookup')?.classList.remove('show')}
  async function openHistory(vehicle){if(typeof window.auaOpenHistory==='function')await window.auaOpenHistory();for(let i=0;i<20;i++){const search=$('auaHistorySearch');if(search){search.value=vehicle;search.dispatchEvent(new Event('input',{bubbles:true}));return}await new Promise(r=>setTimeout(r,75))}}
  function masterMatches(query){const key=normVehicle(query);if(!key)return[];return Array.from(masters.values()).filter(m=>normVehicle(m.vehicle).includes(key)).sort((a,b)=>{const ae=normVehicle(a.vehicle)===key?0:1,be=normVehicle(b.vehicle)===key?0:1;return ae-be||String(a.vehicle).localeCompare(String(b.vehicle),undefined,{numeric:true})}).slice(0,6)}
  function renderMaster(){
    const input=$('vehicle'),box=$('auaSmartVehicleLookup');if(!input||!box||!masters.size)return false;const key=normVehicle(input.value);if(key.length<2)return false;const matches=masterMatches(input.value);if(!matches.length)return false;const exact=matches.find(m=>normVehicle(m.vehicle)===key);
    if(exact){const count=Math.max(exact.quotationCount||0,recentCount(exact.vehicle));box.innerHTML=`<div class="aua-smart-vehicle-head"><div class="aua-smart-vehicle-title">${esc(exact.vehicle)} <span style="font-size:8px;color:#2563eb">VEHICLE MASTER</span></div><div class="aua-smart-vehicle-count">${count} quotation${count===1?'':'s'}</div></div><div class="aua-smart-vehicle-meta">${esc(exact.customer||'Customer not recorded')}${exact.model?' · '+esc(exact.model):''}${exact.mileage?' · '+esc(exact.mileage)+' km':''}</div><div class="aua-smart-vehicle-actions"><button class="btn secondary" type="button" data-aua-master-use>Use Master Details</button><button class="btn outline" type="button" data-aua-master-history>View History</button></div>`;box.classList.add('show');box.querySelector('[data-aua-master-use]').onclick=()=>useMaster(exact);box.querySelector('[data-aua-master-history]').onclick=()=>openHistory(exact.vehicle);return true}
    box.innerHTML=`<div class="aua-smart-vehicle-matches">${matches.map(m=>`<button class="aua-smart-match" type="button" data-aua-master-vehicle="${esc(m.vehicle)}"><b>${esc(m.vehicle)}</b><span>${esc(m.customer||m.model||'Vehicle master')}</span></button>`).join('')}</div>`;box.classList.add('show');box.querySelectorAll('[data-aua-master-vehicle]').forEach(b=>b.onclick=()=>{input.value=b.dataset.auaMasterVehicle||'';input.dispatchEvent(new Event('input',{bubbles:true}));setTimeout(renderMaster,30)});return true;
  }
  function installMasterBridge(attempt=0){const input=$('vehicle');if(!input){if(attempt<30)setTimeout(()=>installMasterBridge(attempt+1),100);return}if(input.dataset.auaMasterBridge==='1')return;input.dataset.auaMasterBridge='1';let timer=null;const queue=()=>{clearTimeout(timer);timer=setTimeout(renderMaster,60)};input.addEventListener('input',queue);input.addEventListener('focus',queue);document.addEventListener('aua-vehicle-master-updated',queue)}

  function installFinalSaveHook(){
    const current=window.saveRecord;if(typeof current!=='function'){setTimeout(installFinalSaveHook,200);return}if(current.__auaWorkshopMasterSave)return;
    async function wrapped(){const result=await current.apply(this,arguments);if(result===false)return result;try{await saveMaster()}catch(error){status(`Quotation saved, but vehicle master could not sync: ${error?.message||'unknown error'}`,'error')}return result}
    wrapped.__auaWorkshopMasterSave=true;wrapped.__auaWorkshopMasterBase=current;window.saveRecord=wrapped;
  }
  function scheduleFinalSaveHook(){const arm=()=>setTimeout(installFinalSaveHook,400);if(document.readyState==='complete')arm();else window.addEventListener('load',arm,{once:true})}

  async function syncLight({silent=true,force=false}={}){
    if(!user)return null;
    const now=Date.now();if(!force&&lastSyncedUser===user.id&&now-lastSyncAt<30000)return{templates:templates.length,masters:masters.size};
    if(syncPromise)return syncPromise;
    syncPromise=(async()=>{
      const results=await Promise.allSettled([syncTemplates({silent:true}),fetchMasters()]);
      const failed=results.find(r=>r.status==='rejected');if(failed)throw failed.reason;
      lastSyncedUser=user.id;lastSyncAt=Date.now();queueMasterSeed();renderMaster();
      if(!silent)status(`Workshop data synced · ${templates.length} template${templates.length===1?'':'s'} · ${masters.size} vehicle master${masters.size===1?'':'s'}.`,'success');
      return{templates:templates.length,masters:masters.size};
    })().finally(()=>{syncPromise=null});return syncPromise;
  }
  async function installCloud(){
    try{
      const client=await cloudClient();
      client.auth.onAuthStateChange((_event,s)=>{const next=s?.user||null,userChanged=next?.id!==user?.id;user=next;if(!user){templates=[];masters.clear();lastSyncedUser='';return}if(userChanged)setTimeout(()=>syncLight({silent:true}).catch(()=>{}),150)});
      const {data}=await client.auth.getSession();user=data?.session?.user||null;if(user)syncLight({silent:true}).catch(error=>console.warn('Workshop data sync deferred.',error));
    }catch(error){console.warn('Shared workshop data will retry after sign-in.',error)}
  }

  window.AUAWorkshopCloud={refresh:()=>syncLight({silent:false,force:true}),templates:()=>clone(templates),masters:()=>clone(Array.from(masters.values())),vehicle:v=>clone(masters.get(normVehicle(v))||null),saveVehicleMaster:saveMaster,updateVehicleMaster};

  installRecentFilter();installTemplateBridge();installMasterBridge();scheduleFinalSaveHook();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{installRecentFilter();installMasterBridge();installCloud()},{once:true});else installCloud();
})();
