// Lightweight runtime health + one working recovery snapshot.
(function(){
  const RECOVERY_KEY='auaQuotationRecoveryV1',LOG_KEY='auaAppHealthLogV1';
  const $=id=>document.getElementById(id);
  let saveTimer=null,lastErrorKey='',lastErrorAt=0,saveWrapped=false;
  const clone=value=>{try{return JSON.parse(JSON.stringify(value))}catch{return value}};
  const text=value=>String(value??'').trim();

  function meaningful(data){
    if(!data)return false;
    if(text(data.customer)||text(data.vehicle)||text(data.phone)||text(data.model)||text(data.remarks)||text(data.remarksRich))return true;
    return (data.sections||[]).some(s=>(s.items||[]).some(x=>text(x?.d||x?.desc)||text(x?.p??x?.price)));
  }
  function snapshot(){try{if(typeof window.state!=='function')return null;const data=clone(window.state());return meaningful(data)?{at:Date.now(),data}:null}catch{return null}}
  function writeRecovery(){const snap=snapshot();try{if(snap)localStorage.setItem(RECOVERY_KEY,JSON.stringify(snap));else localStorage.removeItem(RECOVERY_KEY)}catch{}}
  function clearRecovery(){try{localStorage.removeItem(RECOVERY_KEY)}catch{};hideRecoveryBanner()}
  function queueRecovery(){clearTimeout(saveTimer);saveTimer=setTimeout(writeRecovery,900)}

  function log(kind,message){
    try{const list=JSON.parse(localStorage.getItem(LOG_KEY)||'[]'),next=Array.isArray(list)?list:[];next.unshift({at:new Date().toISOString(),kind,message:String(message||'Unknown error').slice(0,240)});localStorage.setItem(LOG_KEY,JSON.stringify(next.slice(0,20)))}catch{}
  }
  function styles(){
    if($('auaHealthStyles'))return;const style=document.createElement('style');style.id='auaHealthStyles';style.textContent=`
      .aua-health-toast{position:fixed;right:18px;bottom:18px;z-index:19000;max-width:360px;padding:10px 12px;border:1px solid #dbe3ed;border-radius:10px;background:#fff;box-shadow:0 10px 32px rgba(15,23,42,.18);font-size:10.5px;line-height:1.4;color:#334155}.aua-health-toast[data-tone="error"]{border-color:#fecaca;background:#fff7f7;color:#991b1b}.aua-health-toast[data-tone="warn"]{border-color:#fde68a;background:#fffbeb;color:#92400e}.aua-recovery-banner{position:fixed;left:18px;bottom:18px;z-index:18800;width:min(430px,calc(100vw - 36px));padding:12px;border:1px solid #bfdbfe;border-radius:11px;background:#f8fbff;box-shadow:0 12px 34px rgba(15,23,42,.16)}.aua-recovery-banner b{display:block;color:#0f2747;font-size:11px}.aua-recovery-banner span{display:block;margin:4px 0 9px;color:#64748b;font-size:9.5px}.aua-recovery-actions{display:flex;gap:7px}.aua-recovery-actions .btn{min-height:30px;padding:5px 9px;font-size:9px}@media(max-width:520px){.aua-health-toast{right:10px;bottom:10px;max-width:calc(100vw - 20px)}.aua-recovery-banner{left:10px;bottom:10px;width:calc(100vw - 20px)}}@media print{.aua-health-toast,.aua-recovery-banner{display:none!important}}`;
    document.head.appendChild(style);
  }
  function toast(message,tone=''){styles();let el=$('auaHealthToast');if(!el){el=document.createElement('div');el.id='auaHealthToast';el.className='aua-health-toast';document.body.appendChild(el)}el.textContent=message;el.dataset.tone=tone;clearTimeout(el.__timer);el.__timer=setTimeout(()=>el.remove(),5000)}

  function savedStatus(){const el=$('cloudStatus'),message=text(el?.textContent),tone=el?.dataset?.tone||'';if(tone!=='error')return{ok:true,message};if(/quotation saved, but vehicle master/i.test(message))return{ok:true,warning:message};return{ok:false,message}}
  function installSaveGuard(attempt=0){
    if(saveWrapped)return true;const current=window.saveRecord;if(typeof current!=='function'){if(attempt<40)setTimeout(()=>installSaveGuard(attempt+1),150);return false}
    if(!current.__auaWorkshopMasterSave&&attempt<15){setTimeout(()=>installSaveGuard(attempt+1),150);return false}
    async function guardedSave(){
      writeRecovery();
      try{
        const result=await current.apply(this,arguments);await new Promise(r=>setTimeout(r,100));const cloud=savedStatus();
        if(result===false||!cloud.ok){writeRecovery();toast('Cloud save did not complete. A recovery copy is kept on this PC.','warn');return result}
        clearRecovery();if(cloud.warning)toast('Quotation saved. Vehicle master sync can retry later.','warn');return result;
      }catch(error){writeRecovery();log('save',error?.message||error);toast('Save failed. Your current quotation recovery copy is kept on this PC.','error');throw error}
    }
    guardedSave.__auaHealthSave=true;guardedSave.__auaHealthBase=current;window.saveRecord=guardedSave;saveWrapped=true;return true;
  }

  function recovery(){try{const value=JSON.parse(localStorage.getItem(RECOVERY_KEY)||'null');if(!value?.data||!value.at||Date.now()-Number(value.at)>7*86400000)return null;return value}catch{return null}}
  function hideRecoveryBanner(){$('auaRecoveryBanner')?.remove()}
  function showRecoveryBanner(){
    const saved=recovery();if(!saved||$('auaRecoveryBanner'))return;
    const current=snapshot();try{if(current&&JSON.stringify(current.data)===JSON.stringify(saved.data))return}catch{}
    styles();const banner=document.createElement('div');banner.id='auaRecoveryBanner';banner.className='aua-recovery-banner';const when=new Date(saved.at).toLocaleString('en-SG',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});banner.innerHTML=`<b>Unsaved quotation recovery available</b><span>Working copy from ${when}. Nothing will be restored unless you choose Recover.</span><div class="aua-recovery-actions"><button id="auaRecoverQuote" class="btn primary" type="button">Recover</button><button id="auaDismissRecovery" class="btn outline" type="button">Dismiss</button></div>`;document.body.appendChild(banner);
    $('auaRecoverQuote').onclick=()=>{if(typeof window.loadRecord!=='function')return;window.loadRecord(clone(saved.data));hideRecoveryBanner();toast('Recovered the unsaved quotation working copy.','warn')};$('auaDismissRecovery').onclick=clearRecovery;
  }

  function handleError(kind,message){const key=`${kind}|${String(message||'').slice(0,120)}`,now=Date.now();if(key===lastErrorKey&&now-lastErrorAt<10000)return;lastErrorKey=key;lastErrorAt=now;writeRecovery();log(kind,message);toast('The app hit an error. Your current quotation recovery copy has been protected.','error')}
  function monitorErrors(){window.addEventListener('error',event=>handleError('javascript',event?.message||'JavaScript error'));window.addEventListener('unhandledrejection',event=>handleError('promise',event?.reason?.message||event?.reason||'Unhandled promise error'))}
  function monitorUpdates(){if(!('serviceWorker'in navigator))return;navigator.serviceWorker.addEventListener('controllerchange',()=>toast('App update installed. Refresh when convenient to use the latest version.'));navigator.serviceWorker.getRegistration?.().then(reg=>{if(reg?.waiting)toast('A newer app version is ready. Refresh when convenient.','warn')}).catch(()=>{})}
  function monitorWork(){document.addEventListener('input',event=>{if(event.target?.closest?.('.editor'))queueRecovery()},true);document.addEventListener('change',event=>{if(event.target?.closest?.('.editor'))queueRecovery()},true)}
  function runtimeCheck(){setTimeout(()=>{if(typeof window.state!=='function'||typeof window.loadRecord!=='function'){log('runtime','Core quotation functions unavailable');toast('Some quotation functions did not initialise. Refresh the app once.','error')}},4500)}

  function install(){styles();monitorErrors();monitorUpdates();monitorWork();runtimeCheck();window.addEventListener('load',()=>{setTimeout(()=>installSaveGuard(),900);setTimeout(showRecoveryBanner,1200)},{once:true});if(document.readyState==='complete'){setTimeout(()=>installSaveGuard(),900);setTimeout(showRecoveryBanner,1200)}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
  window.AUAAppHealth={saveRecovery:writeRecovery,clearRecovery,logs:()=>{try{return JSON.parse(localStorage.getItem(LOG_KEY)||'[]')}catch{return[]}},recovery};
})();
