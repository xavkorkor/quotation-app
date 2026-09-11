// Unique quotation history and recoverable archive bridge.
// Cloud configuration is read lazily from the existing storage module only when a save/archive action occurs.
(function(){
  const LOCAL_KEY='auaRecentQuotesV1';
  let clientPromise=null;
  let installed=false;
  const pending=new Map();

  const clone=value=>{try{return JSON.parse(JSON.stringify(value))}catch{return value}};
  const text=value=>String(value??'').trim();
  const quoteKey=data=>data?.quoteNumber?`quote|${text(data.quoteNumber).toLowerCase()}`:'';
  const legacyKey=data=>{
    const vehicle=text(data?.vehicle).toLowerCase(),customer=text(data?.customer).toLowerCase();
    return vehicle?`${customer}|${vehicle}`:[customer,data?.date].map(v=>text(v).toLowerCase()).join('|');
  };

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
    if(!user)throw new Error('Sign in before updating shared quotation history.');
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

  async function persistUnique(data,total,sourceKey){
    const key=quoteKey(data);
    if(!key)return false;
    const {client,user}=await sessionAndClient();
    const alias=sourceKey||legacyKey(data);
    let pdfPath=null;
    if(alias){
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
    if(alias&&alias!==key){
      const {error:deleteError}=await client.from('quotations').delete().eq('record_key',alias);
      if(deleteError)console.warn('Unique quotation saved, but legacy duplicate could not be cleaned up.',deleteError);
    }
    return true;
  }

  function schedulePersist(data,total){
    const key=quoteKey(data);
    if(!key)return;
    const old=pending.get(key)||[];old.forEach(clearTimeout);
    const run=()=>persistUnique(clone(data),total).catch(error=>console.warn('Unique quotation history sync failed.',error));
    const timers=[setTimeout(run,700),setTimeout(run,2600)];
    pending.set(key,timers);
  }

  async function setArchived(record,archived){
    if(!record?.data)return false;
    const data=clone(record.data);
    data.archived=!!archived;
    if(archived){data.archivedAt=new Date().toISOString()}else{delete data.archivedAt}
    const key=quoteKey(data);
    if(key){
      await persistUnique(data,record.total,record.key);
    }else{
      const {client}=await sessionAndClient();
      const {error}=await client.from('quotations').update({data,updated_at:new Date().toISOString()}).eq('record_key',record.key);
      if(error)throw error;
    }
    let list=[];
    try{list=JSON.parse(localStorage.getItem(LOCAL_KEY)||'[]')}catch{}
    list.forEach(item=>{if(String(item?.key||'')===String(record.key||'')||text(item?.data?.quoteNumber)===text(data.quoteNumber))item.data=clone(data)});
    localStorage.setItem(LOCAL_KEY,JSON.stringify(list));
    return true;
  }

  function installSaveHooks(){
    if(installed)return true;
    if(typeof saveRecent!=='function'||typeof saveRecord!=='function'||typeof state!=='function'||typeof totals!=='function')return false;
    // Wait until online-storage has installed its save functions, then wrap only once.
    if(!String(saveRecord).includes('cloudStatus')&&!String(saveRecord).includes('markAfter'))return false;
    const baseSaveRecent=saveRecent,baseSaveRecord=saveRecord;
    saveRecent=function(){
      const result=baseSaveRecent.apply(this,arguments);
      const data=clone(state()),total=Number(totals()?.grand||0);
      promoteLocal(data,total);schedulePersist(data,total);
      return result;
    };
    saveRecord=function(){
      const result=baseSaveRecord.apply(this,arguments);
      const after=()=>{const data=clone(state()),total=Number(totals()?.grand||0);promoteLocal(data,total);schedulePersist(data,total)};
      if(result&&typeof result.then==='function')return result.then(value=>{after();return value});
      after();return result;
    };
    installed=true;
    return true;
  }

  window.AUACloudIntegrity={
    setArchived,
    persistCurrent:()=>{const data=clone(state()),total=Number(totals()?.grand||0);promoteLocal(data,total);return persistUnique(data,total)},
    isArchived:record=>!!record?.data?.archived,
    uniqueKeyForData:quoteKey
  };

  function start(){
    if(installSaveHooks())return;
    setTimeout(()=>installSaveHooks(),600);
  }
  if(document.readyState==='complete')start();else window.addEventListener('load',start,{once:true});
})();
