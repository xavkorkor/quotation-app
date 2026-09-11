// Always start the app on a fresh quotation without touching saved History records.
(function(){
  let initialised=false;

  function blankQuote(){
    const today=new Date().toISOString().slice(0,10);
    return{
      customer:'',
      phone:'',
      date:today,
      vehicle:'',
      mileage:'',
      model:'',
      useHeader:true,
      gstOn:true,
      summaryOn:true,
      remarks:'',
      overallType:'percent',
      overallDisc:'',
      sections:[{
        title:'REPAIR / SERVICE',
        dt:'percent',
        dv:'',
        collapsed:false,
        items:[{}]
      }],
      audit:{createdBy:'',createdAt:'',lastEditedBy:'',lastEditedAt:''}
    };
  }

  function resetToFreshQuote(force=false){
    if(initialised&&!force)return true;
    if(typeof loadRecord!=='function')return false;
    loadRecord(blankQuote());
    initialised=true;
    requestAnimationFrame(()=>document.getElementById('customer')?.focus());
    return true;
  }

  function install(){
    if(!resetToFreshQuote())setTimeout(install,200);
  }

  window.addEventListener('pageshow',event=>{
    if(event.persisted){
      initialised=false;
      resetToFreshQuote(true);
    }
  });

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
