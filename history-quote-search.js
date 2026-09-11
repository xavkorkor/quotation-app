// Quotation-number search support for History without changing the stable History core.
(function(){
  const byId=id=>document.getElementById(id);
  const compact=value=>String(value||'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const digits=value=>String(value||'').replace(/\D/g,'');

  function records(){
    try{return typeof getRecent==='function'?(getRecent()||[]):[]}catch{return[]}
  }

  function quoteMatches(query){
    const qCompact=compact(query),qDigits=digits(query);
    const looksLikeQuote=qCompact.startsWith('aua')||qDigits.length>=9;
    if(!looksLikeQuote)return[];
    return records().filter(record=>{
      const ref=String(record?.data?.quoteNumber||'').trim();
      if(!ref)return false;
      const rCompact=compact(ref),rDigits=digits(ref);
      if(qCompact.startsWith('aua'))return rCompact.includes(qCompact);
      return qDigits.length>=9&&rDigits.includes(qDigits);
    });
  }

  function applyQuoteFilter(query){
    const input=byId('auaHistorySearch');
    const overlay=byId('auaHistoryOverlay');
    if(!input||!overlay||overlay.hidden||input.value!==query)return;
    const matches=quoteMatches(query);
    if(!matches.length)return;
    const keys=new Set(matches.map(record=>String(record?.key||'')));
    let visible=0;
    overlay.querySelectorAll('.aua-history-row[data-aua-key]').forEach(row=>{
      if(!keys.has(String(row.dataset.auaKey||'')))row.style.display='none';
      if(row.style.display!=='none')visible++;
      wrapRow(row);
    });
    const count=byId('auaHistoryCount');
    if(count)count.textContent=`${visible} shown · ${matches.length} quotation number match${matches.length===1?'':'es'}`;
  }

  function withSearchTemporarilyBlank(action){
    const input=byId('auaHistorySearch');
    if(!input)return action();
    const query=input.value;
    if(!quoteMatches(query).length)return action();
    input.value='';
    try{return action()}finally{
      input.value=query;
      setTimeout(()=>applyQuoteFilter(query),30);
    }
  }

  function wrapRow(row){
    if(!row||row.dataset.auaQuoteSearchWrapped)return;
    const base=row.onclick;
    if(typeof base!=='function')return;
    row.dataset.auaQuoteSearchWrapped='1';
    row.onclick=function(event){return withSearchTemporarilyBlank(()=>base.call(this,event))};
  }

  function wrapSynchronousRenderControl(el,property){
    if(!el||el.dataset.auaQuoteSearchWrapped)return;
    const base=el[property];
    if(typeof base!=='function')return;
    el.dataset.auaQuoteSearchWrapped='1';
    el[property]=function(event){return withSearchTemporarilyBlank(()=>base.call(this,event))};
  }

  function install(){
    const input=byId('auaHistorySearch'),overlay=byId('auaHistoryOverlay');
    if(!input||!overlay){setTimeout(install,250);return}
    if(input.dataset.auaQuoteSearch)return;
    input.dataset.auaQuoteSearch='1';
    input.placeholder='Search quotation no., vehicle, customer, phone, model or item…';

    const baseInput=input.oninput;
    input.oninput=function(event){
      const query=this.value;
      const matches=quoteMatches(query);
      if(!matches.length){
        if(typeof baseInput==='function')return baseInput.call(this,event);
        return;
      }
      this.value='';
      if(typeof baseInput==='function')baseInput.call(this,event);
      this.value=query;
      applyQuoteFilter(query);
      setTimeout(()=>applyQuoteFilter(query),30);
    };

    wrapSynchronousRenderControl(byId('auaHistorySort'),'onchange');
    overlay.querySelectorAll('[data-aua-filter]').forEach(button=>wrapSynchronousRenderControl(button,'onclick'));

    overlay.addEventListener('click',()=>{
      const query=input.value;
      if(quoteMatches(query).length)setTimeout(()=>applyQuoteFilter(query),40);
    });
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
