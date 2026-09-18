// Alan's United Auto - on-demand System Health diagnostics.
// Loaded only when the user opens System Health.
(function(){
  const $=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const read=key=>{try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}};
  const when=value=>{const n=Number(value||0);if(!n)return'Never';const d=new Date(n);return Number.isNaN(d.getTime())?'Unknown':d.toLocaleString('en-SG',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'})};
  let lastSnapshot=null;

  async function versionInfo(){
    let version='Unknown',cacheName='None';
    try{
      const response=await fetch('./service-worker.js',{cache:'no-store'}),source=await response.text();
      version=source.match(/au-quotation-(v\d+)/)?.[1]||'Unknown';
    }catch{}
    try{
      const names=await caches.keys(),app=names.filter(name=>name.startsWith('au-quotation-')).sort();
      cacheName=app[app.length-1]||'None';
    }catch{}
    return{version,cacheName};
  }

  async function collect(){
    const version=await versionInfo(),lastSave=window.AUAHealthRuntime?.lastSuccessfulSave?.()||read('auaHealthLastSaveV1');
    const workshopStored=read('auaLastCloudSyncV1'),historyStored=read('auaLastHistorySyncV1');
    const workshop=window.AUAWorkshopCloud?.health?.()||{},history=window.AUAHistoryRuntime?.health?.()||null;
    const errors=window.AUAHealthRuntime?.recentErrors?.()||read('auaHealthErrorsV1')||[];
    const recovery=window.AUAHealthRuntime?.recovery?.()||read('auaRecoveryDraftV2');
    const signedIn=!!$('cloudSignedIn')&&!$('cloudSignedIn').hidden,user=String($('cloudUser')?.textContent||'').replace(/^Signed in as\s+/i,'').trim();
    return{
      checkedAt:Date.now(),version:version.version,cacheName:version.cacheName,online:navigator.onLine,
      serviceWorker:!!navigator.serviceWorker?.controller,signedIn,user,
      lastSave,workshopSync:{at:workshop.lastSyncAt||workshopStored?.at||0,templates:workshop.templates??workshopStored?.templates,masters:workshop.masters??workshopStored?.masters},
      historySync:{at:history?.lastCloudSyncAt||historyStored?.at||0,loaded:history?.cloudLoaded??historyStored?.loaded,hasMore:history?.hasMore??historyStored?.hasMore,pageSize:history?.pageSize??historyStored?.pageSize,available:history?.available},
      recovery:recovery?{at:recovery.savedAt||recovery.at||0}:null,
      errors:Array.isArray(errors)?errors.slice(0,10):[]
    };
  }

  function styles(){
    if($('auaSystemHealthStyles'))return;
    const style=document.createElement('style');style.id='auaSystemHealthStyles';style.textContent=`
      .aua-sys-overlay{position:fixed;inset:0;z-index:18500;display:none;padding:24px;background:rgba(15,23,42,.62);overflow:auto}.aua-sys-overlay.show{display:block}
      .aua-sys-shell{width:min(940px,100%);margin:auto;background:#f8fafc;border-radius:16px;overflow:hidden;box-shadow:0 28px 80px rgba(15,23,42,.32)}
      .aua-sys-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;padding:20px 22px;background:#fff;border-bottom:1px solid #e2e8f0}.aua-sys-head h3{margin:0;color:#0f2747;font-size:21px}.aua-sys-head p{margin:4px 0 0;color:#64748b;font-size:10px}
      .aua-sys-actions{display:flex;gap:7px;flex-wrap:wrap}.aua-sys-body{padding:18px}.aua-sys-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
      .aua-sys-card{padding:12px;border:1px solid #e2e8f0;border-radius:10px;background:#fff}.aua-sys-card span{display:block;color:#64748b;font-size:8.5px;font-weight:800;text-transform:uppercase;letter-spacing:.04em}.aua-sys-card b{display:block;margin-top:4px;color:#172033;font-size:11px;line-height:1.35}.aua-sys-card small{display:block;margin-top:3px;color:#64748b;font-size:9px;line-height:1.4}.aua-sys-card[data-tone="warn"]{border-color:#fde68a;background:#fffbeb}.aua-sys-card[data-tone="error"]{border-color:#fecaca;background:#fff7f7}
      .aua-sys-errors{margin-top:14px;padding:14px;border:1px solid #e2e8f0;border-radius:10px;background:#fff}.aua-sys-errors-head{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:8px}.aua-sys-errors-head b{font-size:11px;color:#0f2747}.aua-sys-error{padding:8px 0;border-top:1px solid #f1f5f9;font-size:9.5px;color:#475569}.aua-sys-error:first-of-type{border-top:0}.aua-sys-error strong{color:#991b1b}.aua-sys-empty{color:#64748b;font-size:9.5px}
      @media(max-width:760px){.aua-sys-overlay{padding:0}.aua-sys-shell{min-height:100vh;border-radius:0}.aua-sys-head{flex-direction:column}.aua-sys-grid{grid-template-columns:1fr 1fr}}
      @media(max-width:480px){.aua-sys-grid{grid-template-columns:1fr}}@media print{.aua-sys-overlay{display:none!important}}
    `;document.head.appendChild(style);
  }

  function ensureUi(){
    styles();if($('auaSystemHealthOverlay'))return;
    const overlay=document.createElement('div');overlay.id='auaSystemHealthOverlay';overlay.className='aua-sys-overlay';
    overlay.innerHTML=`<div class="aua-sys-shell"><header class="aua-sys-head"><div><h3>System Health</h3><p>Local diagnostics only. No quotation cloud scan is run from this screen.</p></div><div class="aua-sys-actions"><button id="auaSysRefresh" class="btn secondary" type="button">Refresh Checks</button><button id="auaSysCopy" class="btn outline" type="button">Copy Diagnostics</button><button id="auaSysClose" class="btn outline" type="button">Close</button></div></header><main id="auaSysBody" class="aua-sys-body"><div class="aua-sys-empty">Checking…</div></main></div>`;
    document.body.appendChild(overlay);
    $('auaSysClose').onclick=close;$('auaSysRefresh').onclick=refresh;$('auaSysCopy').onclick=copyDiagnostics;overlay.onclick=e=>{if(e.target===overlay)close()};
  }

  function card(label,value,detail='',tone=''){
    return `<div class="aua-sys-card" ${tone?`data-tone="${tone}"`:''}><span>${esc(label)}</span><b>${esc(value)}</b>${detail?`<small>${esc(detail)}</small>`:''}</div>`;
  }

  function render(data){
    lastSnapshot=data;const body=$('auaSysBody');if(!body)return;
    const historyDetail=data.historySync.loaded!=null?`${data.historySync.loaded}${data.historySync.hasMore?'+':''} cloud records refreshed${data.historySync.pageSize?` · page size ${data.historySync.pageSize}`:''}`:'History has not loaded in this session.';
    const recoveryTone=data.recovery?'warn':'',errorTone=data.errors.length?'warn':'';
    body.innerHTML=`<div class="aua-sys-grid">
      ${card('App / Cache',data.version,`Cache: ${data.cacheName}`,data.version==='Unknown'?'warn':'')}
      ${card('Browser Network',data.online?'Online':'Offline',data.serviceWorker?'Service worker active':'Service worker not controlling this page',data.online&&data.serviceWorker?'':'warn')}
      ${card('Cloud Sign-In',data.signedIn?'Signed in':'Signed out',data.user||'No signed-in staff session',data.signedIn?'':'warn')}
      ${card('Last Successful Save',when(data.lastSave?.at),[data.lastSave?.quoteNumber,data.lastSave?.vehicle].filter(Boolean).join(' · ')||'No recorded successful save')}
      ${card('Workshop Data Sync',when(data.workshopSync.at),`${data.workshopSync.templates??'—'} templates · ${data.workshopSync.masters??'—'} vehicle masters`)}
      ${card('History Cloud Sync',when(data.historySync.at),historyDetail)}
      ${card('Recovery Copy',data.recovery?'Available':'None',data.recovery?`Saved ${when(data.recovery.at)}`:'No pending recovery draft',recoveryTone)}
      ${card('Recent Errors',String(data.errors.length),data.errors.length?'Latest 10 are shown below.':'No recorded recent runtime errors.',errorTone)}
      ${card('Checked',when(data.checkedAt),'Diagnostics are read on demand.')}
    </div><section class="aua-sys-errors"><div class="aua-sys-errors-head"><b>Recent Error Log</b><button id="auaSysClearErrors" class="btn outline" type="button">Clear Log</button></div>${data.errors.length?data.errors.map(error=>`<div class="aua-sys-error"><strong>${esc(String(error.kind||'runtime').toUpperCase())}</strong> · ${esc(when(error.at))}<br>${esc(error.message||'Unknown error')}</div>`).join(''):'<div class="aua-sys-empty">No recent errors recorded.</div>'}</section>`;
    $('auaSysClearErrors').onclick=()=>{window.AUAHealthRuntime?.clearErrors?.();refresh()};
  }

  async function refresh(){
    const button=$('auaSysRefresh');if(button){button.disabled=true;button.textContent='Checking…'}
    try{render(await collect())}finally{if(button){button.disabled=false;button.textContent='Refresh Checks'}}
  }

  async function copyDiagnostics(){
    if(!lastSnapshot)lastSnapshot=await collect();
    const d=lastSnapshot,lines=[
      `Alan's United Auto System Health`,`Checked: ${when(d.checkedAt)}`,`App: ${d.version} / ${d.cacheName}`,
      `Network: ${d.online?'Online':'Offline'} / Service Worker: ${d.serviceWorker?'Active':'Inactive'}`,
      `Cloud: ${d.signedIn?'Signed in':'Signed out'}`,`Last Save: ${when(d.lastSave?.at)} ${d.lastSave?.quoteNumber||''} ${d.lastSave?.vehicle||''}`.trim(),
      `Workshop Sync: ${when(d.workshopSync.at)} / Templates ${d.workshopSync.templates??'—'} / Masters ${d.workshopSync.masters??'—'}`,
      `History Sync: ${when(d.historySync.at)} / Loaded ${d.historySync.loaded??'—'} / More ${d.historySync.hasMore?'Yes':'No'}`,
      `Recovery: ${d.recovery?'Available':'None'}`,`Recent Errors: ${d.errors.length}`
    ];
    try{await navigator.clipboard.writeText(lines.join('\n'));const button=$('auaSysCopy');if(button){const old=button.textContent;button.textContent='Copied';setTimeout(()=>button.textContent=old,1500)}}catch{alert(lines.join('\n'))}
  }

  function open(){ensureUi();$('auaSystemHealthOverlay')?.classList.add('show');document.body.style.overflow='hidden';refresh()}
  function close(){$('auaSystemHealthOverlay')?.classList.remove('show');document.body.style.overflow=''}
  window.AUASystemHealth={open,refresh};
})();