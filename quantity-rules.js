// Quantity / validation rules for labour and other non-counted quotation lines.
(function(){
  function text(value){return String(value??'').trim()}

  function hookMemoryPick(){
    if(typeof window.memoryPick!=='function')return false;
    if(window.memoryPick.__auaQuantityRules)return true;
    const base=window.memoryPick;

    window.memoryPick=function(i,j,v){
      let preserveBlank=false;
      try{preserveBlank=text(S?.[i]?.items?.[j]?.q)===''}catch{}

      const result=base.apply(this,arguments);

      // Selecting a remembered description must not put a default/history quantity
      // back into a line where the user deliberately cleared Qty (e.g. labour).
      if(preserveBlank){
        try{
          const x=S?.[i]?.items?.[j];
          if(x&&text(x.q)!==''){
            x.q='';
            if(typeof render==='function')render();
            if(typeof upd==='function')upd();
          }
        }catch{}
      }
      return result;
    };
    window.memoryPick.__auaQuantityRules=true;
    return true;
  }

  function installValidation(){
    // User-facing completeness check: quantity is optional. Only a described,
    // non-Included item with no price should be flagged.
    window.validationIssues=function(){
      const issues=[];
      try{
        (Array.isArray(S)?S:[]).forEach(s=>{
          (s.items||[]).forEach((x,j)=>{
            if(x?.included)return;
            const description=text(x?.d);
            const price=text(x?.p);
            if(description&&price==='')issues.push(`${s.title}: item ${j+1} has a description but no price.`);
          });
        });
      }catch{}
      return issues;
    };
  }

  function install(){
    installValidation();
    if(!hookMemoryPick())setTimeout(install,200);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
