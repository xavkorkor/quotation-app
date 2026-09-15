// Improves generated quotation PDF sharpness and keeps a single-page A4 quotation from spilling onto a blank second page.
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

          // The quotation canvas is already A4 height (297 mm). The base generator used
          // an additional 7 mm top + 10 mm bottom PDF margin, which made an otherwise
          // one-page quotation overflow and created a trailing blank page. Use no
          // vertical outer margin and a tiny horizontal fit margin so rounding cannot
          // push the 210 mm-wide canvas beyond the A4 page boundary.
          next.margin=[0,1,0,1];

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
