// Improves generated quotation PDF sharpness without changing the quotation layout.
(function(){
  function install(){
    const original=window.html2pdf;
    if(typeof original!=='function'||original.__auaPdfQualityWrapped)return;

    function enhancedHtml2Pdf(){
      const worker=original.apply(this,arguments);
      if(!worker||typeof worker.set!=='function')return worker;
      const originalSet=worker.set;
      worker.set=function(options){
        if(options&&typeof options==='object'){
          const next={...options};
          next.image={...(options.image||{}),type:'png',quality:1};
          next.html2canvas={
            ...(options.html2canvas||{}),
            scale:3,
            useCORS:true,
            backgroundColor:'#ffffff',
            logging:false,
            removeContainer:true,
            letterRendering:true
          };
          next.jsPDF={
            ...(options.jsPDF||{}),
            compress:true,
            precision:16
          };
          return originalSet.call(worker,next);
        }
        return originalSet.call(worker,options);
      };
      return worker;
    }

    Object.keys(original).forEach(key=>{
      try{enhancedHtml2Pdf[key]=original[key]}catch{}
    });
    enhancedHtml2Pdf.__auaPdfQualityWrapped=true;
    window.html2pdf=enhancedHtml2Pdf;
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',install,{once:true});
  }else{
    install();
  }
})();
