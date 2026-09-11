(function(){
  const CONFIG={
    url:'https://xukrkavbvxlomaekvhhz.supabase.co',
    key:'sb_publishable_d0-OUsZ6JbSECgn8uNcSrw_f3Xazwk3',
    bucket:'quotation-files'
  };
  let client=null,user=null,syncing=false,onlineRecords=[];
  let localSaveRecent=null,localSaveRecord=null,localMakePdfBlob=null;

  function cloudStatus(message,tone='normal'){
    const el=document.getElementById('cloudStatus');
    if(!el)return;
    el.textContent=message;
    el.dataset.tone=tone;
  }

  function makeCloudPanel(){
    if(document.getElementById('cloudPanel'))return;
    const panel=document.createElement('div');
    panel.id='cloudPanel';
    panel.className='panel cloud-panel';
    panel.innerHTML=`
      <div class="panel-title">ONLINE STORAGE</div>
      <div id="cloudSignedOut">
        <div class="grid cloud-login-grid">
          <div><label>Staff Email</label><input id="cloudEmail" type="email" autocomplete="username" data-preserve-case placeholder="name@example.com"></div>
          <div><label>Password</label><input id="cloudPassword" type="password" autocomplete="current-password" data-preserve-case placeholder="Password"></div>
        </div>
        <div class="toolbar"><button id="cloudSignIn" class="btn primary" type="button">Sign In</button></div>
      </div>
      <div id="cloudSignedIn" hidden>
        <div id="cloudUser" class="small"></div>
        <div class="toolbar"><button id="cloudSave" class="btn primary" type="button">Save Online</button><button id="cloudRefresh" class="btn secondary" type="button">Refresh Online</button></div>
        <div class="toolbar"><button id="cloudRecordsTab" class="btn secondary" type="button">All Records</button><button id="cloudExport" class="btn outline" type="button">Export JSON</button></div>
        <button id="cloudSignOut" class="btn outline cloud-sign-out" type="button">Sign Out</button>
        <div id="cloudRecordsPanel" class="cloud-records-panel" hidden>
          <div class="panel-title">ALL SHARED RECORDS</div>
          <input id="cloudRecordSearch" type="search" placeholder="Search by vehicle number" aria-label="Search all online records by vehicle number">
          <div id="cloudRecordList" class="cloud-record-list"><div class="small">Open this tab to load the shared records.</div></div>
        </div>
      </div>
      <div id="cloudStatus" class="cloud-status">Sign in to access the shared staff quotations.</div>`;
    const editor=document.querySelector('.editor');
    if(editor)editor.prepend(panel);
    const style=document.createElement('style');
    style.textContent='.cloud-panel{background:#f8fbff;border-color:#cbdff5;border-left:4px solid #2563eb}.cloud-login-grid{grid-template-columns:1fr 1fr}.cloud-sign-out{width:100%;margin-top:9px}.cloud-status{font-size:11px;color:#475569;margin-top:9px;line-height:1.4}.cloud-status[data-tone="success"]{color:#166534}.cloud-status[data-tone="error"]{color:#b42318}.cloud-records-panel{margin-top:10px;padding-top:10px;border-top:1px solid #cbdff5}.cloud-record-list{display:grid;gap:6px;max-height:340px;overflow:auto;margin-top:8px}.cloud-record{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;padding:8px;border:1px solid #dbe4ef;border-radius:9px;background:#fff}.cloud-record-name{font-size:12px;font-weight:700}.cloud-record-meta{font-size:10.5px;color:#667085;margin-top:2px}.cloud-record-total{font-size:11px;font-weight:700;color:#334155;margin-bottom:5px;text-align:right}.cloud-record-actions{display:flex;gap:5px}.cloud-record-open,.cloud-record-delete{padding:6px 10px;font-size:11px}.cloud-record-delete{border-color:#fecaca;color:#b42318;background:#fff}.cloud-record-delete:hover{background:#fef2f2}.cloud-tab-active{background:#dbeafe;color:#1d4ed8}@media(max-width:600px){.cloud-login-grid{grid-template-columns:1fr}}';
    document.head.appendChild(style);
    document.getElementById('cloudSignIn').onclick=signIn;
    document.getElementById('cloudSave').onclick=()=>saveCurrentQuote();
    document.getElementById('cloudRefresh').onclick=()=>refreshOnline();
    document.getElementById('cloudRecordsTab').onclick=()=>toggleAllRecords().catch(error=>cloudStatus(error.message||'Unable to load online records.','error'));
    document.getElementById('cloudRecordSearch').addEventListener('input',renderAllRecords);
    document.getElementById('cloudExport').onclick=()=>localSaveRecord?.();
    document.getElementById('cloudSignOut').onclick=signOut;
  }

  function showSession(){
    const signedIn=!!user;
    document.getElementById('cloudSignedOut').hidden=signedIn;
    document.getElementById('cloudSignedIn').hidden=!signedIn;
    if(!signedIn){document.getElementById('cloudRecordsPanel').hidden=true;document.getElementById('cloudRecordsTab').classList.remove('cloud-tab-active');onlineRecords=[]}
    document.getElementById('cloudUser').textContent=signedIn?`Signed in as ${user.email||'staff user'}`:'';
    const mainSave=document.querySelector('button[onclick="saveRecord()"]');
    if(mainSave)mainSave.textContent='Save Online';
  }

  function escapeHtml(value){
    return String(value??'').replace(/[&<>\"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[char]));
  }

  function renderAllRecords(){
    const list=document.getElementById('cloudRecordList');
    if(!list)return;
    const query=String(document.getElementById('cloudRecordSearch')?.value||'').trim().toLowerCase();
    const matches=onlineRecords.map((record,index)=>({record,index})).filter(({record})=>!query||String(record.data?.vehicle||'').toLowerCase().includes(query));
    list.innerHTML=matches.length?matches.map(({record,index})=>{
      const data=record.data||{},total=Number(record.total||0).toLocaleString('en-SG',{minimumFractionDigits:2,maximumFractionDigits:2});
      return `<div class="cloud-record"><div><div class="cloud-record-name">${escapeHtml(data.customer||'Unnamed customer')}${data.vehicle?' · '+escapeHtml(data.vehicle):''}</div><div class="cloud-record-meta">${escapeHtml(data.date||'No date')}${data.model?' · '+escapeHtml(data.model):''}</div></div><div><div class="cloud-record-total">S$ ${total}</div><div class="cloud-record-actions"><button class="btn primary cloud-record-open" type="button" data-cloud-open="${index}">Open</button><button class="btn outline cloud-record-delete" type="button" data-cloud-delete="${index}">Delete</button></div></div></div>`;
    }).join(''):`<div class="small">${onlineRecords.length?'No matching vehicle numbers.':'No online quotations yet.'}</div>`;
    list.querySelectorAll('[data-cloud-open]').forEach(button=>button.onclick=()=>openOnlineRecord(Number(button.dataset.cloudOpen)));
    list.querySelectorAll('[data-cloud-delete]').forEach(button=>button.onclick=()=>deleteOnlineRecord(Number(button.dataset.cloudDelete),button));
  }

  function openOnlineRecord(index){
    const record=onlineRecords[index];
    if(!record)return;
    loadRecord(record.data||{});
    cloudStatus(`Opened${record.data?.vehicle?' '+record.data.vehicle:''} from shared records.`,'success');
    document.querySelector('.customer-panel')?.scrollIntoView({behavior:'smooth',block:'start'});
  }

  async function deleteOnlineRecord(index,button){
    const record=onlineRecords[index];
    if(!record)return;
    const data=record.data||{},name=data.vehicle||data.customer||'this quotation';
    if(!confirm(`Delete ${name} from the shared records? This cannot be undone.`))return;
    button.disabled=true;
    button.textContent='Deleting…';
    try{
      const {error}=await client.from('quotations').delete().eq('record_key',record.record_key);
      if(error)throw error;
      if(record.pdf_path){
        const {error:fileError}=await client.storage.from(CONFIG.bucket).remove([record.pdf_path]);
        if(fileError)console.warn('The quotation record was deleted, but its PDF could not be removed.',fileError);
      }
      await refreshOnline({silent:true});
      cloudStatus(`Deleted ${name} from shared records.`,'success');
    }catch(error){
      button.disabled=false;
      button.textContent='Delete';
      cloudStatus(error.message||'Unable to delete this quotation.','error');
    }
  }

  async function toggleAllRecords(){
    if(!user)return;
    const panel=document.getElementById('cloudRecordsPanel'),button=document.getElementById('cloudRecordsTab'),opening=panel.hidden;
    panel.hidden=!opening;
    button.classList.toggle('cloud-tab-active',opening);
    if(opening){await refreshOnline({silent:true});renderAllRecords()}
  }

  function recordKey(data){
    const vehicle=String(data.vehicle||'').trim().toLowerCase();
    const customer=String(data.customer||'').trim().toLowerCase();
    if(vehicle)return `${customer}|${vehicle}`;
    return [customer,data.date].map(v=>String(v||'').trim().toLowerCase()).join('|');
  }

  function onlineRow(data,total,updatedAt){
    return{
      user_id:user.id,
      record_key:recordKey(data),
      customer:String(data.customer||''),
      vehicle:String(data.vehicle||''),
      quote_date:data.date||null,
      model:String(data.model||''),
      total:Number(total||0),
      data,
      updated_at:updatedAt||new Date().toISOString()
    };
  }

  async function saveCurrentQuote(options={}){
    if(!user){
      cloudStatus('Sign in before saving online.','error');
      document.getElementById('cloudEmail')?.focus();
      return false;
    }
    const data=state(),summary=totals(),row=onlineRow(data,summary.grand);
    const {error}=await client.from('quotations').upsert(row,{onConflict:'record_key'});
    if(error)throw error;
    if(!options.silent)cloudStatus(`Saved online${data.vehicle?' for '+data.vehicle:''}.`,'success');
    return true;
  }

  async function migrateLocal(){
    if(!user)return;
    const records=getRecent();
    if(!records.length)return;
    const rows=records.map(r=>onlineRow(r.data||{},r.total,r.ts?new Date(r.ts).toISOString():undefined));
    const {error}=await client.from('quotations').upsert(rows,{onConflict:'record_key'});
    if(error)throw error;
  }

  async function refreshOnline(options={}){
    if(!user)return;
    if(!options.silent)cloudStatus('Loading online quotations…');
    const {data,error}=await client.from('quotations').select('record_key,total,data,updated_at,pdf_path').order('updated_at',{ascending:false}).limit(500);
    if(error)throw error;
    onlineRecords=data||[];
    const recent=onlineRecords.map(r=>({key:r.record_key,ts:new Date(r.updated_at).getTime(),total:Number(r.total||0),data:r.data||{}}));
    localStorage.setItem(RECENTKEY,JSON.stringify(recent));
    renderRecent();
    renderAllRecords();
    if(!options.silent)cloudStatus(`Loaded ${recent.length} online quotation${recent.length===1?'':'s'}.`,'success');
  }

  async function uploadPdf(blob){
    if(!user)return;
    await saveCurrentQuote({silent:true});
    const data=state(),key=recordKey(data).replace(/[^a-z0-9_-]+/gi,'_')||'quotation';
    const path=`${user.id}/${key}/${Date.now()}-${pdfFileName()}`;
    const {error}=await client.storage.from(CONFIG.bucket).upload(path,blob,{contentType:'application/pdf',upsert:false});
    if(error)throw error;
    const {error:updateError}=await client.from('quotations').update({pdf_path:path,updated_at:new Date().toISOString()}).eq('record_key',recordKey(data));
    if(updateError)throw updateError;
    cloudStatus('Quotation and PDF saved online.','success');
  }

  async function signIn(){
    const email=document.getElementById('cloudEmail').value.trim();
    const password=document.getElementById('cloudPassword').value;
    if(!email||!password){cloudStatus('Enter your staff email and password.','error');return}
    cloudStatus('Signing in…');
    const {error}=await client.auth.signInWithPassword({email,password});
    if(error){cloudStatus(error.message,'error');return}
    document.getElementById('cloudPassword').value='';
  }

  async function signOut(){
    const {error}=await client.auth.signOut();
    if(error){cloudStatus(error.message,'error');return}
    cloudStatus('Signed out. Local fallback records remain on this device.');
  }

  async function sessionChanged(session){
    user=session?.user||null;
    showSession();
    if(!user)return;
    if(syncing)return;
    syncing=true;
    try{
      cloudStatus('Syncing local quotations to the shared database…');
      await migrateLocal();
      await refreshOnline({silent:true});
      cloudStatus('Shared online storage is ready.','success');
    }catch(error){cloudStatus(error.message||'Unable to sync online.','error')}
    finally{syncing=false}
  }

  async function install(){
    localSaveRecent=saveRecent;
    localSaveRecord=saveRecord;
    localMakePdfBlob=makePdfBlob;
    makeCloudPanel();
    if(!window.supabase?.createClient||CONFIG.key.startsWith('__')){
      cloudStatus('Online storage is awaiting secure project configuration.','error');
      return;
    }
    client=window.supabase.createClient(CONFIG.url,CONFIG.key);
    saveRecent=function(){
      localSaveRecent();
      if(user&&!syncing)saveCurrentQuote({silent:true}).catch(error=>cloudStatus(error.message||'Online save failed.','error'));
    };
    saveRecord=async function(){
      if(!user){cloudStatus('Sign in before saving online.','error');document.getElementById('cloudEmail')?.focus();return}
      S.forEach(s=>s.items.forEach(rememberItem));
      localSaveRecent();
      try{await saveCurrentQuote()}catch(error){cloudStatus(error.message||'Online save failed.','error')}
    };
    makePdfBlob=async function(){
      const blob=await localMakePdfBlob();
      if(user)try{await uploadPdf(blob)}catch(error){cloudStatus(error.message||'PDF could not be saved online.','error')}
      return blob;
    };
    client.auth.onAuthStateChange((_event,session)=>setTimeout(()=>sessionChanged(session),0));
    const {data}=await client.auth.getSession();
    await sessionChanged(data.session);
  }

  window.addEventListener('DOMContentLoaded',()=>install().catch(error=>cloudStatus(error.message||'Online storage could not start.','error')));
})();

