// Unique quotation history, recoverable archive, and strict explicit-save bridge.
// No quotation record is created by background saveRecent/PDF/startup activity.
(function(){
  const LOCAL_KEY='auaRecentQuotesV1';
  let clientPromise=null;
  let installed=false;

  const clone=value=>{try{return JSON.parse(JSON.stringify(value))}catch{return value}};
  const text=value=>String(value??'').trim();
  const quoteKey=data=>data?.quoteNumber?`quote|${text(data.quoteNumber).toLowerCase()}`:'';
  const legacyKey=data=>{
    const vehicle=text(data?.vehicle).toLowerCase(),customer=text(data?.customer).toLowerCase();
    return vehicle?`${customer}|${vehicle}`:[customer,data?.date].map(v=>text(v).toLowerCase()).join('|');
  };
  const rawRecords=()=>{try{return typeof getRecent==='function'?(getRecent()||[]):[]}catch{return[]}};

  function cloudStatus(message,tone='normal'){
    const el=document.getElementById('cloudStatus');
    if(!el)return;
    el.textContent=message;
    el.dataset.tone=tone;
  }

  async function cloudClient(){
    if(clientPromise)return clientPromise;
    clientPromise=(async()=>{
      if(!window.supabase?.createClient)throw new Error('Online storage library is unavailable.');
      const response=await fetch('./online-storage.js',{cache:'force-cache'});
      if(!response.ok)throw new Error('Online storage configuration could not be read.');
      const source=await response.text();
      const url=source.match(/\burl\s*:\s*'([^']+)'/)?.[1];
      const key=source.match(/\bkey\s*:\s*'([^']+)'/)?.[1];
      if(!url||!key)throw new Error('Online storage configuration is unavailable.');
      return window.supabase.createClient(url,key);
    })();
    return clientPromise;
  }

  async function sessionAndClient(){
    const client=await cloudClient();
    const {data,error}=await client.auth.getSession();
    if(error)throw error;
    const user=data?.session?.user;
    if(!user)throw new Error('Sign in before saving a quotation.');
    return{client,user};
  }

  function promoteLocal(data,total){
    const key=quoteKey(data);
    if(!key)return;
    let list=[];
    try{list=JSON.parse(localStorage.getItem(LOCAL_KEY)||'[]')}catch{}
    const legacy=legacyKey(data),quote=text(data.quoteNumber).toLowerCase();
    list=list.filter(record=>{
      const existingQuote=text(record?.data?.quoteNumber).toLowerCase();
      return String(record?.key||'')!==legacy&&String(record?.key||'')!==key&&(!quote||existingQuote!==quote);
    });
    list.unshift({key,ts:Date.now(),total:Number(total||0),data:clone(data)});
    localStorage.setItem(LOCAL_KEY,JSON.stringify(list.slice(0,100)));
  }

  async function cleanupLegacy(client,key,alias){
    if(!alias||alias===key)return false;
    try{
      const {data:source}=await client.from('quotations').select('pdf_path').eq('record_key',alias).maybeSingle();
      if(source?.pdf_path)await client.from('quotations').update({pdf_path:source.pdf_path}).eq('record_key',key);
      const {error}=await client.from('quotations').delete().eq('record_key',alias);
      if(error)throw error;
      return true;
    }catch(error){
      console.warn('Legacy quotation cleanup was deferred.',error);
      return false;
    }
  }

  async function persistUnique(data,total,sourceKey){
    const key=quoteKey(data);
    if(!key)throw new Error('Quotation number is missing. Start a fresh quotation and try again.');
    const {client,user}=await sessionAndClient();
    const alias=sourceKey||legacyKey(data);
    let pdfPath=null;
    if(alias&&alias!==key){
      const {data:source,error:sourceError}=await client.from('quotations').select('pdf_path').eq('record_key',alias).maybeSingle();
      if(sourceError&&sourceError.code!=='PGRST116')console.warn('Unable to read existing quotation file link.',sourceError);
      pdfPath=source?.pdf_path||null;
    }
    const row={
      user_id:user.id,
      record_key:key,
      customer:text(data.customer),
      vehicle:text(data.vehicle),
      quote_date:data.date||null,
      model:text(data.model),
      total:Number(total||0),
      data:clone(data),
      updated_at:new Date().toISOString()
    };
    if(pdfPath)row.pdf_path=pdfPath;
    const {error}=await client.from('quotations').upsert(row,{onConflict:'record_key'});
    if(error)throw error;
    if(alias&&alias!==key)await cleanupLegacy(client,key,alias);
    return true;
  }

  async function explicitSave(){
    try{
      window.AUAQuotationAudit?.stampSave?.();
      try{if(typeof S!=='undefined'&&typeof rememberItem==='function')S.forEach(section=>(section.items||[]).forEach(rememberItem))}catch{}
      const data=clone(state()),total=Number(totals()?.grand||0);
      cloudStatus('Saving quotation…');
      await persistUnique(data,total);
      promoteLocal(data,total);
      cloudStatus(`Saved quotation${data.vehicle?' for '+data.vehicle:''}.`,'success');
      window.AUAUnsavedProtection?.markClean?.();
      return true;
    }catch(error){
      cloudStatus(error?.message||'Unable to save quotation.','error');
      return false;
    }
  }

  async function setArchived(record,archived){
    if(!record?.data)return false;
    const data=clone(record.data);
    data.archived=!!archived;
    if(archived)data.archivedAt=new Date().toISOString();else delete data.archivedAt;
    if(quoteKey(data)){
      await persistUnique(data,record.total,record.key);
      promoteLocal(data,record.total);
    }else{
      const {client}=await sessionAndClient();
      const {error}=await client.from('quotations').update({data,updated_at:new Date().toISOString()}).eq('record_key',record.key);
      if(error)throw error;
      let list=[];
      try{list=JSON.parse(localStorage.getItem(LOCAL_KEY)||'[]')}catch{}
      list.forEach(item=>{if(String(item?.key||'')===String(record.key||''))item.data=clone(data)});
      localStorage.setItem(LOCAL_KEY,JSON.stringify(list));
    }
    return true;
  }

  async function cleanupCloudDuplicates(){
    const {client}=await sessionAndClient();
    const {data,error}=await client.from('quotations').select('record_key,data').limit(500);
    if(error)throw error;
    const rows=data||[],preferred=new Map();
    rows.forEach(row=>{
      const ref=text(row?.data?.quoteNumber).toLowerCase();
      if(ref&&String(row.record_key||'').startsWith('quote|'))preferred.set(ref,row.record_key);
    });
    let removed=0;
    for(const row of rows){
      const ref=text(row?.data?.quoteNumber).toLowerCase(),target=ref?preferred.get(ref):'';
      if(!target||target===row.record_key)continue;
      if(await cleanupLegacy(client,target,row.record_key))removed++;
    }
    return removed;
  }

  function installSaveHooks(){
    if(installed)return true;
    if(typeof state!=='function'||typeof totals!=='function')return false;

    // Strict rule: background calls must never create quotation records.
    saveRecent=function(){return false};
    saveRecord=function(){return explicitSave()};

    // PDF/WhatsApp generation stays local-only and must not auto-create an online record.
    if(typeof window.__auaBaseMakePdfBlob==='function')window.makePdfBlob=window.__auaBaseMakePdfBlob;

    const cloudSave=document.getElementById('cloudSave');
    if(cloudSave){
      cloudSave.textContent='Save Quotation';
      cloudSave.onclick=()=>saveRecord();
    }
    const mainSave=document.querySelector('button[onclick*="saveRecord"]');
    if(mainSave)mainSave.textContent='Save Quotation';

    installed=true;
    return true;
  }

  function preferredQuoteKeys(){
    const map=new Map();
    rawRecords().forEach(record=>{
      const ref=text(record?.data?.quoteNumber).toLowerCase();
      if(!ref)return;
      const current=map.get(ref);
      if(!current||String(record?.key||'').startsWith('quote|'))map.set(ref,String(record?.key||''));
    });
    return map;
  }

  function ensureHistoryUi(){
    const advanced=document.getElementById('auaHistoryAdvanced');
    if(advanced&&!document.getElementById('auaHistArchive')){
      const field=document.createElement('div');
      field.className='aua-history-filter-field';
      field.innerHTML='<label>Records</label><select id="auaHistArchive"><option value="active">Active</option><option value="archived">Archived</option><option value="all">All</option></select>';
      const reset=document.getElementById('auaHistReset');
      advanced.insertBefore(field,reset||null);
      document.getElementById('auaHistArchive').addEventListener('change',decorateHistory);
    }
    if(!document.getElementById('auaIntegrityStyles')){
      const style=document.createElement('style');style.id='auaIntegrityStyles';
      style.textContent='.aua-history-quote-ref{display:block;margin-top:4px;font-size:8.8px;font-weight:700;color:#64748b;letter-spacing:.02em}.aua-history-row[hidden]{display:none!important}.aua-history-archive-note{display:block;margin-top:4px;font-size:8.5px;font-weight:800;color:#b45309}';
      document.head.appendChild(style);
    }
  }

  function decorateHistory(){
    const overlay=document.getElementById('auaHistoryOverlay');
    if(!overlay||overlay.hidden)return;
    ensureHistoryUi();
    const mode=document.getElementById('auaHistArchive')?.value||'active';
    const preferred=preferredQuoteKeys();
    overlay.querySelectorAll('.aua-history-row[data-aua-key]').forEach(row=>{
      const record=rawRecords().find(r=>String(r?.key||'')===String(row.dataset.auaKey||''));
      if(!record){row.hidden=false;return}
      const ref=text(record?.data?.quoteNumber),archived=!!record?.data?.archived;
      const preferredKey=ref?preferred.get(ref.toLowerCase()):'';
      const duplicate=!!preferredKey&&preferredKey!==String(record.key||'');
      const modeHidden=mode==='active'?archived:mode==='archived'?!archived:false;
      row.hidden=duplicate||modeHidden;
      const holder=row.children?.[1];
      if(holder&&ref){
        let label=holder.querySelector('.aua-history-quote-ref');
        if(!label){label=document.createElement('span');label.className='aua-history-quote-ref';holder.appendChild(label)}
        label.textContent=ref;
      }
      if(holder){
        let note=holder.querySelector('.aua-history-archive-note');
        if(archived){if(!note){note=document.createElement('span');note.className='aua-history-archive-note';holder.appendChild(note)}note.textContent='ARCHIVED'}else note?.remove();
      }
    });
    const selected=overlay.querySelector('.aua-history-row.selected[data-aua-key]');
    const action=document.getElementById('auaHistoryDelete');
    if(selected&&action){
      const record=rawRecords().find(r=>String(r?.key||'')===String(selected.dataset.auaKey||''));
      if(record){
        const archived=!!record?.data?.archived;
        action.textContent=archived?'Restore':'Archive';
        action.classList.remove('aua-history-delete');
        action.onclick=async()=>{
          action.disabled=true;const old=action.textContent;action.textContent=archived?'Restoring…':'Archiving…';
          try{await setArchived(record,!archived);document.getElementById('auaHistoryRefresh')?.click()}
          catch(error){alert(error?.message||'Unable to update archive status.');action.disabled=false;action.textContent=old}
        };
      }
    }
    const visible=Array.from(overlay.querySelectorAll('.aua-history-row[data-aua-key]')).filter(row=>!row.hidden&&row.style.display!=='none').length;
    const count=document.getElementById('auaHistoryCount');
    if(count&&!String(document.getElementById('auaHistorySearch')?.value||'').trim())count.textContent=`${visible} shown`;
  }

  window.AUACloudIntegrity={
    setArchived,
    saveQuotation:explicitSave,
    cleanupCloudDuplicates,
    isArchived:record=>!!record?.data?.archived,
    uniqueKeyForData:quoteKey
  };

  function start(){
    installSaveHooks();ensureHistoryUi();decorateHistory();
    document.addEventListener('aua-history-updated',decorateHistory);
    document.getElementById('cloudRecordsTab')?.addEventListener('click',()=>{
      requestAnimationFrame(decorateHistory);
      setTimeout(async()=>{
        try{
          const removed=await cleanupCloudDuplicates();
          if(removed)document.getElementById('auaHistoryRefresh')?.click();
        }catch{}
      },700);
    });
    document.getElementById('auaHistorySearch')?.addEventListener('input',()=>requestAnimationFrame(decorateHistory));
  }
  if(document.readyState==='complete')start();else window.addEventListener('load',start,{once:true});
})();
