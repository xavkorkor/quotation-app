// Stable unsaved-change protection. Uses snapshots only; no polling or DOM observers.
(function(){
  let cleanSnapshot='';
  let forcedDirty=false;
  const text=value=>String(value??'').trim();

  function currentState(){
    try{return typeof state==='function'?state():null}catch{return null}
  }
  function snapshot(data=currentState()){
    try{return data?JSON.stringify(data):''}catch{return''}
  }
  function hasMeaningfulContent(data=currentState()){
    if(!data)return false;

    // Generated date, quotation number, revision/audit metadata and default settings do not
    // count as user work. A fresh untouched quotation should always be safe to replace.
    if([data.customer,data.phone,data.vehicle,data.mileage,data.model,data.remarks].some(value=>text(value)))return true;
    if(text(data.overallDisc)&&Number(data.overallDisc)!==0)return true;
    if(text(data.status)&&text(data.status)!=='Draft')return true;

    const sections=Array.isArray(data.sections)?data.sections:[];
    return sections.some(section=>{
      const title=text(section?.title).toUpperCase();
      if(title&&title!=='REPAIR / SERVICE')return true;
      if(text(section?.dv)&&Number(section.dv)!==0)return true;

      return(Array.isArray(section?.items)?section.items:[]).some(item=>{
        const description=text(item?.d??item?.desc);
        const price=text(item?.p??item?.price);
        const discount=text(item?.dv);
        const quantity=text(item?.q??item?.qty??item?.quantity);
        if(description||price)return true;
        if(discount&&Number(discount)!==0)return true;
        if(item?.included)return true;
        // "1 pc" is the app's automatic blank-row quantity and is not user work.
        return !!quantity&&!/^1(?:\s*pc)?$/i.test(quantity);
      });
    });
  }
  function markClean(){cleanSnapshot=snapshot();forcedDirty=false}
  function isDirty(){
    const data=currentState();
    if(!hasMeaningfulContent(data))return false;
    const current=snapshot(data);
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

  window.AUAUnsavedProtection=Object.assign(window.AUAUnsavedProtection||{},{markClean,isDirty,confirmDiscard,hasMeaningfulContent});

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