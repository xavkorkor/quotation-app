// Reliable WhatsApp/PDF sharing.
// First click prepares the current PDF. On browsers that support file sharing,
// the second click invokes the native share sheet while user activation is intact.
(function(){
  let prepared=null;
  let preparing=false;

  function shareButton(){
    return document.querySelector('.aua-workspace-wa')
      || document.querySelector('button[onclick*="sharePdfWhatsApp"]');
  }

  function setButton(label,disabled=false){
    const button=shareButton();
    if(!button)return;
    button.textContent=label;
    button.disabled=disabled;
    button.dataset.auaWhatsappState=disabled?'preparing':(prepared?'ready':'idle');
  }

  function stableSignature(){
    try{
      const data=typeof window.state==='function'?window.state():{};
      const copy=JSON.parse(JSON.stringify(data||{}));
      delete copy.revisions;
      delete copy.revision;
      delete copy.audit;
      delete copy.archived;
      delete copy.archivedAt;
      delete copy.savedAt;
      delete copy.updatedAt;
      return JSON.stringify(copy);
    }catch{
      return [
        document.getElementById('customer')?.value||'',
        document.getElementById('vehicle')?.value||'',
        document.getElementById('date')?.value||''
      ].join('|');
    }
  }

  function nativeFileShareSupported(file){
    if(typeof navigator.share!=='function')return false;
    if(typeof navigator.canShare!=='function')return true;
    try{return navigator.canShare({files:[file]})}catch{return false}
  }

  async function preparePdf(sig){
    if(preparing)return null;
    preparing=true;
    setButton('Preparing PDF…',true);
    try{
      if(typeof window.makePdfBlob!=='function')throw new Error('PDF generator is not ready yet.');
      const blob=await window.makePdfBlob();
      if(!blob)throw new Error('PDF could not be created.');
      const latest=stableSignature();
      if(latest!==sig){
        prepared=null;
        setButton('WhatsApp PDF');
        throw new Error('Quotation changed while the PDF was being prepared. Please click WhatsApp again.');
      }
      const name=typeof window.pdfFileName==='function'?window.pdfFileName():'Quotation.pdf';
      const file=new File([blob],name,{type:'application/pdf'});
      prepared={sig,file,blob};
      setButton(nativeFileShareSupported(file)?'Share PDF Now':'WhatsApp PDF');
      return prepared;
    }finally{
      preparing=false;
      const button=shareButton();
      if(button)button.disabled=false;
    }
  }

  function fallbackDownloadAndWhatsApp(entry){
    const url=URL.createObjectURL(entry.blob);
    const anchor=document.createElement('a');
    anchor.href=url;
    anchor.download=entry.file.name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(()=>URL.revokeObjectURL(url),2500);

    const message=typeof window.whatsappMessage==='function'?window.whatsappMessage():'Quotation attached.';
    const popup=window.open('https://wa.me/?text='+encodeURIComponent(message),'_blank');
    if(!popup){
      alert('PDF downloaded. Please allow pop-ups, then attach the downloaded PDF in WhatsApp.');
    }
    prepared=null;
    setButton('WhatsApp PDF');
  }

  async function sharePrepared(entry){
    const title='Quotation - '+(
      document.getElementById('vehicle')?.value
      || document.getElementById('customer')?.value
      || "Alan's United"
    );
    const message=typeof window.whatsappMessage==='function'?window.whatsappMessage():'Quotation attached.';
    let promise;
    try{
      promise=navigator.share({title,text:message,files:[entry.file]});
    }catch(error){
      if(error?.name!=='AbortError')alert(error?.message||'Unable to share PDF.');
      return;
    }
    try{
      await promise;
      prepared=null;
      setButton('WhatsApp PDF');
    }catch(error){
      if(error?.name==='AbortError'){
        setButton('Share PDF Now');
        return;
      }
      setButton('Share PDF Now');
      if(!/user gesture|activation|notallowed/i.test(String(error?.message||''))){
        alert(error?.message||'Unable to share PDF.');
      }
    }
  }

  async function sharePdf(){
    if(preparing)return;
    const sig=stableSignature();

    if(prepared&&prepared.sig===sig){
      if(nativeFileShareSupported(prepared.file)){
        const entry=prepared;
        await sharePrepared(entry);
      }else{
        fallbackDownloadAndWhatsApp(prepared);
      }
      return;
    }

    prepared=null;
    if(typeof window.confirmValidation==='function')window.confirmValidation();

    try{
      const entry=await preparePdf(sig);
      if(!entry)return;
      if(!nativeFileShareSupported(entry.file))fallbackDownloadAndWhatsApp(entry);
      // Native file sharing intentionally waits for the user's next click.
    }catch(error){
      prepared=null;
      setButton('WhatsApp PDF');
      if(error?.message)alert(error.message);
    }
  }

  function invalidatePrepared(event){
    if(preparing||!prepared)return;
    if(event?.target?.closest?.('#auaHistoryOverlay,#auaVehicleMasterOverlay,#auaPreflightOverlay'))return;
    prepared=null;
    setButton('WhatsApp PDF');
  }

  function install(){
    window.sharePdfWhatsApp=sharePdf;
    const button=shareButton();
    if(button&&!button.dataset.auaWhatsappRuntime){
      button.dataset.auaWhatsappRuntime='1';
      button.textContent='WhatsApp PDF';
    }
    document.addEventListener('input',invalidatePrepared,true);
    document.addEventListener('change',invalidatePrepared,true);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
  window.addEventListener('load',()=>setTimeout(install,0),{once:true});
})();