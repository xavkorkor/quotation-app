(function(){
  const CONFIG={
    url:'https://xukrkavbvxlomaekvhhz.supabase.co',
    key:'sb_publishable_d0-OUsZ6JbSECgn8uNcSrw_f3Xazwk3',
    bucket:'quotation-files'
  };
  let client=null,user=null,syncing=false;
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
        <div class="toolbar"><button id="cloudSignIn" class="btn primary" type="button">Sign In</button><button id="cloudSignUp" class="btn secondary" type="button">Create Account</button></div>
      </div>
      <div id="cloudSignedIn" hidden>
        <div id="cloudUser" class="small"></div>
        <div class="toolbar"><button id="cloudSave" class="btn primary" type="button">Save Online</button><button id="cloudRefresh" class="btn secondary" type="button">Refresh Online</button></div>
        <div class="toolbar"><button id="cloudExport" class="btn outline" type="button">Export JSON</button><button id="cloudSignOut" class="btn outline" type="button">Sign Out</button></div>
      </div>
      <div id="cloudStatus" class="cloud-status">Sign in to sync quotations across devices.</div>`;
    const recent=document.querySelector('.recent-panel');
    if(recent)recent.before(panel);else document.querySelector('.editor')?.appendChild(panel);
    const style=document.createElement('style');
    style.textContent='.cloud-panel{background:#f8fbff;border-color:#cbdff5;border-left:4px solid #2563eb}.cloud-login-grid{grid-template-columns:1fr 1fr}.cloud-status{font-size:11px;color:#475569;margin-top:9px;line-height:1.4}.cloud-status[data-tone="success"]{color:#166534}.cloud-status[data-tone="error"]{color:#b42318}@media(max-width:600px){.cloud-login-grid{grid-template-columns:1fr}}';
    document.head.appendChild(style);
    document.getElementById('cloudSignIn').onclick=signIn;
    document.getElementById('cloudSignUp').onclick=signUp;
    document.getElementById('cloudSave').onclick=()=>saveCurrentQuote();
    document.getElementById('cloudRefresh').onclick=()=>refreshOnline();
    document.getElementById('cloudExport').onclick=()=>localSaveRecord?.();
    document.getElementById('cloudSignOut').onclick=signOut;
  }

  function showSession(){
    const signedIn=!!user;
    document.getElementById('cloudSignedOut').hidden=signedIn;
    document.getElementById('cloudSignedIn').hidden=!signedIn;
    document.getElementById('cloudUser').textContent=signedIn?`Signed in as ${user.email||'staff user'}`:'';
    const mainSave=document.querySelector('button[onclick="saveRecord()"]');
    if(mainSave)mainSave.textContent='Save Online';
  }

  function recordKey(data){
    const vehicle=String(data.vehicle||'').trim().toLowerCase();
    if(vehicle)return vehicle;
    return [data.customer,data.date].map(v=>String(v||'').trim().toLowerCase()).join('|');
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
    const {error}=await client.from('quotations').upsert(row,{onConflict:'user_id,record_key'});
    if(error)throw error;
    if(!options.silent)cloudStatus(`Saved online${data.vehicle?' for '+data.vehicle:''}.`,'success');
    return true;
  }

  async function migrateLocal(){
    if(!user)return;
    const records=getRecent();
    if(!records.length)return;
    const rows=records.map(r=>onlineRow(r.data||{},r.total,r.ts?new Date(r.ts).toISOString():undefined));
    const {error}=await client.from('quotations').upsert(rows,{onConflict:'user_id,record_key'});
    if(error)throw error;
  }

  async function refreshOnline(options={}){
    if(!user)return;
    if(!options.silent)cloudStatus('Loading online quotations…');
    const {data,error}=await client.from('quotations').select('record_key,total,data,updated_at').order('updated_at',{ascending:false}).limit(100);
    if(error)throw error;
    const recent=(data||[]).map(r=>({key:r.record_key,ts:new Date(r.updated_at).getTime(),total:Number(r.total||0),data:r.data||{}}));
    localStorage.setItem(RECENTKEY,JSON.stringify(recent));
    renderRecent();
    if(!options.silent)cloudStatus(`Loaded ${recent.length} online quotation${recent.length===1?'':'s'}.`,'success');
  }

  async function uploadPdf(blob){
    if(!user)return;
    await saveCurrentQuote({silent:true});
    const data=state(),key=recordKey(data).replace(/[^a-z0-9_-]+/gi,'_')||'quotation';
    const path=`${user.id}/${key}/${Date.now()}-${pdfFileName()}`;
    const {error}=await client.storage.from(CONFIG.bucket).upload(path,blob,{contentType:'application/pdf',upsert:false});
    if(error)throw error;
    const {error:updateError}=await client.from('quotations').update({pdf_path:path,updated_at:new Date().toISOString()}).eq('user_id',user.id).eq('record_key',recordKey(data));
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

  async function signUp(){
    const email=document.getElementById('cloudEmail').value.trim();
    const password=document.getElementById('cloudPassword').value;
    if(!email||password.length<8){cloudStatus('Enter an email and a password of at least 8 characters.','error');return}
    cloudStatus('Creating staff account…');
    const {data,error}=await client.auth.signUp({email,password});
    if(error){cloudStatus(error.message,'error');return}
    document.getElementById('cloudPassword').value='';
    cloudStatus(data.session?'Account created and signed in.':'Check your email to confirm the new account.','success');
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
      cloudStatus('Syncing local quotations online…');
      await migrateLocal();
      await refreshOnline({silent:true});
      cloudStatus('Online storage is ready.','success');
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

