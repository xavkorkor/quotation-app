// Ready-to-send is advisory only: it never blocks PDF generation or WhatsApp sharing.
(function(){
  const $=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));

  function collect(){
    try{return window.AUAReadyToSend?.collect?.()||{errors:[],warnings:[]}}
    catch{return{errors:[],warnings:[]}}
  }

  function syncInline(result){
    const box=$('validationBox');
    if(!box)return;
    const reminders=[...(result.errors||[]),...(result.warnings||[])];
    box.style.display=reminders.length?'block':'none';
    box.innerHTML=reminders.length?`<b>Reminder:</b><br>${reminders.map(item=>'• '+esc(item)).join('<br>')}`:'';
  }

  function showReminder(){
    const result=collect(),reminders=[...(result.errors||[]),...(result.warnings||[])];
    syncInline(result);
    const overlay=$('auaPreflightOverlay'),body=$('auaPreflightBody');
    if(overlay&&body){
      const title=overlay.querySelector('.aua-preflight-head h3'),subtitle=overlay.querySelector('.aua-preflight-head p');
      if(title)title.textContent='Ready to Send Reminder';
      if(subtitle)subtitle.textContent='Reminder only — PDF and WhatsApp are never blocked.';
      body.innerHTML=reminders.length
        ?`<div class="aua-preflight-status warn">Please review ${reminders.length} reminder${reminders.length===1?'':'s'} before sending.</div><div class="aua-preflight-group"><b>Reminders</b><ul>${reminders.map(item=>`<li>${esc(item)}</li>`).join('')}</ul></div>`
        :'<div class="aua-preflight-status good">No reminders found. You can continue with PDF or WhatsApp.</div>';
      overlay.classList.add('show');
    }
    return true;
  }

  function removeBlockingPdfWrapper(){
    if(typeof window.makePdfBlob!=='function')return false;
    if(window.makePdfBlob.__auaWorkflowPdfInspection&&typeof window.__auaBaseMakePdfBlob==='function'){
      window.makePdfBlob=window.__auaBaseMakePdfBlob;
    }
    return true;
  }

  function install(){
    removeBlockingPdfWrapper();

    // Existing PDF / WhatsApp paths may call this. Always allow them to continue.
    window.confirmValidation=function(){
      const result=collect();
      syncInline(result);
      return true;
    };

    const button=$('auaReadyCheckButton');
    if(button&&button.dataset.auaReminderOnly!=='1'){
      button.dataset.auaReminderOnly='1';
      button.textContent='✓ Ready to Send Reminder';
      button.onclick=()=>showReminder();
    }

    if(window.AUAReadyToSend){
      const originalCollect=window.AUAReadyToSend.collect;
      window.AUAReadyToSend={
        ...window.AUAReadyToSend,
        collect:typeof originalCollect==='function'?originalCollect:collect,
        check:async()=>showReminder(),
        advisoryOnly:true
      };
    }
  }

  function settle(){
    [0,150,350,700,1200,2200].forEach(delay=>setTimeout(install,delay));
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',settle,{once:true});
  else settle();
  window.addEventListener('load',settle,{once:true});
})();