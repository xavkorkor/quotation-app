// Reliable WhatsApp/PDF sharing: avoids losing the browser's transient user gesture
// while a high-resolution PDF is being generated.
(function(){
  let prepared=null;
  let preparing=false;

  function shareButton(){
    return document.querySelector('button[onclick="sharePdfWhatsApp()"]');
  }

  function setButton(label,disabled=false){
    const btn=shareButton();
    if(!btn)return;
    btn.textContent=label;
    btn.disabled=disabled;
  }

  function signature(){
    try{return JSON.stringify(typeof state==='function'?state():{});}catch{return '';}
  }

  function nativeFileShareSupported(file){
    if(typeof navigator.share!=='function')return false;
    if(typeof navigator.canShare!=='function')return true;
    try{return navigator.canShare({files:[file]});}catch{return false;}
  }

  async function prepareCurrentPdf(sig){
    if(preparing)return null;
    preparing=true;
    setButton('Preparing PDF…',true);
    try{
      // Use the app's active PDF generator so quality upgrades remain applied.
      const blob=await makePdfBlob();
      if(signature()!==sig){
        prepared=null;
        setButton('WhatsApp PDF');
        return null;
      }
      const file=new File([blob],pdfFileName(),{type:'application/pdf'});
      prepared={sig,file,blob};
      setButton(nativeFileShareSupported(file)?'WhatsApp PDF — Click Again':'WhatsApp PDF');
      return prepared;
    }finally{
      preparing=false;
    }
  }

  async function fallbackDownloadAndWhatsApp(entry){
    const url=URL.createObjectURL(entry.blob);
    const a=document.createElement('a');
    a.href=url;
    a.download=entry.file.name;
    a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
    window.open(`https://wa.me/?text=${encodeURIComponent(whatsappMessage())}`,'_blank');
    setButton('WhatsApp PDF');
    prepared=null;
  }

  async function fixedSharePdfWhatsApp(){
    if(preparing)return;
    const sig=signature();

    // If a matching PDF has already been prepared, call navigator.share
    // immediately in this click handler before any await. This preserves
    // the browser's required user activation.
    if(prepared&&prepared.sig===sig&&nativeFileShareSupported(prepared.file)){
      const entry=prepared;
      let sharePromise;
      try{
        sharePromise=navigator.share({
          title:`Quotation - ${vehicle.value||customer.value||"Alan's United"}`,
          text:whatsappMessage(),
          files:[entry.file]
        });
      }catch(error){
        if(error?.name!=='AbortError')alert(error?.message||'Unable to share PDF.');
        return;
      }
      try{
        await sharePromise;
        prepared=null;
        setButton('WhatsApp PDF');
      }catch(error){
        if(error?.name==='AbortError'){
          setButton('WhatsApp PDF — Click Again');
          return;
        }
        // Keep the already-prepared file available for another genuine click.
        setButton('WhatsApp PDF — Click Again');
        if(!/user gesture|activation|notallowed/i.test(String(error?.message||''))){
          alert(error?.message||'Unable to share PDF.');
        }
      }
      return;
    }

    // The quotation changed, or this is the first click. Validate and prepare it.
    prepared=null;
    if(typeof confirmValidation==='function'&&!confirmValidation())return;
    if(typeof saveRecent==='function')saveRecent();

    try{
      const entry=await prepareCurrentPdf(sig);
      if(!entry)return;
      if(!nativeFileShareSupported(entry.file))await fallbackDownloadAndWhatsApp(entry);
      // Native sharing intentionally waits for a second click. Calling
      // navigator.share here would reproduce the lost-user-gesture bug.
    }catch(error){
      prepared=null;
      setButton('WhatsApp PDF');
      alert(error?.message||'Unable to create PDF for WhatsApp.');
    }
  }

  function invalidatePrepared(){
    if(preparing)return;
    if(prepared&&prepared.sig!==signature()){
      prepared=null;
      setButton('WhatsApp PDF');
    }
  }

  function install(){
    window.sharePdfWhatsApp=fixedSharePdfWhatsApp;
    document.addEventListener('input',invalidatePrepared,true);
    document.addEventListener('change',invalidatePrepared,true);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
