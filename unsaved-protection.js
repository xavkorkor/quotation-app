// Stable unsaved-change protection. Uses snapshots only; no polling or DOM observers.
(function(){
  let cleanSnapshot='';
  let forcedDirty=false;

  function snapshot(){
    try{return typeof state==='function'?JSON.stringify(state()):''}catch{return''}
  }
  function markClean(){cleanSnapshot=snapshot();forcedDirty=false}
  function isDirty(){
    const current=snapshot();
    return forcedDirty||!!(cleanSnapshot&&current&&current!==cleanSnapshot);
  }
  function confirmDiscard(message){return !isDirty()||window.confirm(message||'You have unsaved quotation changes. Continue without saving?')}
  function cloudSaveConfirmed(){
    const status=document.getElementById('cloudStatus');
    const message=String(status?.textContent||'');
    return status?.dataset?.tone==='success'&&(/Saved online/i.test(message)||/Saved quotation/i.test(message));
  }
  function markRecordWhenConfirmed(result){
    const check=()=>{if(cloudSaveConfirmed())markClean()};
    if(result&&typeof result.then==='function')result.then(()=>setTimeout(check,20)).catch(()=>{});
    else setTimeout(check,80);
    return result;
  }

  window.AUAUnsavedProtection=Object.assign(window.AUAUnsavedProtection||{},{markClean,isDirty,confirmDiscard});

  function installFunctionHooks(){
    if(typeof state!=='function'||typeof loadRecord!=='function'||typeof newQuote!=='function'||typeof duplicateQuote!=='function'||typeof saveRecord!=='function'||typeof saveRecent!=='function')return false;
    if(state.__auaUnsavedProtection)return true;

    const baseState=state;
    const baseLoadRecord=loadRecord;
    const baseNewQuote=newQuote;
    const baseDuplicateQuote=duplicateQuote;
    const baseSaveRecord=saveRecord;
    const baseSaveRecent=saveRecent;

    state=function(){return baseState.apply(this,arguments)};
    state.__auaUnsavedProtection=true;

    loadRecord=function(){
      const result=baseLoadRecord.apply(this,arguments);
      setTimeout(markClean,40);
      return result;
    };

    newQuote=function(){
      const before=snapshot();
      const result=baseNewQuote.apply(this,arguments);
      setTimeout(()=>{if(snapshot()!==before)markClean()},60);
      return result;
    };

    duplicateQuote=function(){
      const result=baseDuplicateQuote.apply(this,arguments);
      setTimeout(()=>{forcedDirty=true},20);
      return result;
    };

    saveRecord=function(){return markRecordWhenConfirmed(baseSaveRecord.apply(this,arguments))};
    saveRecent=function(){return baseSaveRecent.apply(this,arguments)};
    return true;
  }

  function installNavigationHooks(){
    const history=document.getElementById('cloudRecordsTab');
    const recordFile=document.getElementById('recordFile');
    if(!history||!recordFile)return false;
    if(history.dataset.auaUnsavedProtection)return true;
    history.dataset.auaUnsavedProtection='1';

    history.addEventListener('click',event=>{
      if(confirmDiscard('This quotation has unsaved changes. Open History anyway?'))return;
      event.preventDefault();event.stopImmediatePropagation();
    },true);

    recordFile.addEventListener('click',event=>{
      if(confirmDiscard('This quotation has unsaved changes. Load another record anyway?'))return;
      event.preventDefault();event.stopImmediatePropagation();
    },true);

    const cloudSave=document.getElementById('cloudSave');
    if(cloudSave&&!cloudSave.dataset.auaUnsavedSaveHook){
      cloudSave.dataset.auaUnsavedSaveHook='1';
      cloudSave.addEventListener('click',()=>{
        const before=String(document.getElementById('cloudStatus')?.textContent||'');
        setTimeout(()=>{
          const after=String(document.getElementById('cloudStatus')?.textContent||'');
          if(after!==before&&cloudSaveConfirmed())markClean();
        },500);
      });
    }

    window.addEventListener('beforeunload',event=>{
      if(!isDirty())return;
      event.preventDefault();
      event.returnValue='';
    });
    return true;
  }

  function install(){
    const functions=installFunctionHooks();
    const navigation=installNavigationHooks();
    if(!functions||!navigation){setTimeout(install,250);return}
    setTimeout(markClean,100);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
