// History-assisted values should be easy to overwrite: select an auto-filled value on first focus so typing replaces it.
(function(){
  const FLAG='auaHistoryAutofill';
  let listenersInstalled=false;

  function mark(input){
    if(!input||!('value' in input)||String(input.value||'')==='')return;
    input.dataset[FLAG]='1';
    if(document.activeElement===input&&typeof input.select==='function'){
      requestAnimationFrame(()=>{
        if(document.activeElement===input&&input.dataset[FLAG]==='1')input.select();
      });
    }
  }

  function markSelector(selector){mark(document.querySelector(selector))}

  function hookItemMemory(){
    if(typeof window.memoryPick!=='function')return false;
    if(window.memoryPick.__auaReplaceAutofill)return true;
    const base=window.memoryPick;

    window.memoryPick=function(i,j,v){
      let beforePrice='',beforeQty='';
      try{
        const x=S?.[i]?.items?.[j];
        beforePrice=String(x?.p??'');
        beforeQty=String(x?.q??'');
      }catch{}

      const result=base.apply(this,arguments);

      let afterPrice='',afterQty='';
      try{
        const x=S?.[i]?.items?.[j];
        afterPrice=String(x?.p??'');
        afterQty=String(x?.q??'');
      }catch{}

      const priceWasAutofilled=beforePrice===''&&afterPrice!=='';
      const qtyWasAutofilled=beforeQty===''&&afterQty!=='';
      if(priceWasAutofilled||qtyWasAutofilled){
        setTimeout(()=>{
          if(priceWasAutofilled)markSelector(`[data-price="${i}-${j}"]`);
          if(qtyWasAutofilled)markSelector(`[data-qty="${i}-${j}"]`);
        },0);
      }
      return result;
    };
    window.memoryPick.__auaReplaceAutofill=true;
    return true;
  }

  function installListeners(){
    if(listenersInstalled)return;
    listenersInstalled=true;

    document.addEventListener('focusin',event=>{
      const input=event.target;
      if(!input?.matches?.('input[data-aua-history-autofill="1"]'))return;
      requestAnimationFrame(()=>{
        if(document.activeElement===input&&input.dataset[FLAG]==='1'&&typeof input.select==='function')input.select();
      });
    },true);

    // Once the user actually changes an auto-filled value, it becomes a normal manual value.
    document.addEventListener('input',event=>{
      const input=event.target;
      if(input?.dataset?.[FLAG]==='1')delete input.dataset[FLAG];
    },true);

    // The vehicle-history helper fills customer/phone/model programmatically.
    // Mark those values after the helper button has completed its click handler.
    document.addEventListener('click',event=>{
      if(!event.target?.closest?.('#auaVehicleSuggestion button'))return;
      setTimeout(()=>{
        ['customer','phone','model'].forEach(id=>mark(document.getElementById(id)));
      },0);
    });
  }

  function install(){
    installListeners();
    if(!hookItemMemory())setTimeout(install,200);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
