// Alan's United Auto runtime bootstrap.
// Normal quotation features are shipped as compact production bundles. History stays on-demand.
(function(){
  function loadScript(src){
    return new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src=src;
      script.async=false;
      script.onload=()=>resolve(src);
      script.onerror=()=>reject(new Error(`Unable to load ${src}`));
      document.head.appendChild(script);
    });
  }

  function loadOrdered(sources){
    return sources.reduce((promise,src)=>promise.then(()=>loadScript(src)),Promise.resolve());
  }

  function captureLocalPdfGenerator(){
    if(typeof window.makePdfBlob==='function'&&!window.__auaBaseMakePdfBlob)window.__auaBaseMakePdfBlob=window.makePdfBlob;
  }

  function blockLegacyAutoMigration(){
    if(typeof window.getRecent!=='function'||window.getRecent.__auaNoAutoMigration)return;
    const baseGetRecent=window.getRecent;
    window.getRecent=function(){
      const list=baseGetRecent.apply(this,arguments);
      try{if(String(new Error().stack||'').includes('migrateLocal'))return []}catch{}
      return list;
    };
    window.getRecent.__auaNoAutoMigration=true;
  }

  function blockBackgroundPersistence(){
    if(typeof window.saveRecent==='function')window.saveRecent=function(){return false};
    if(typeof window.__auaBaseMakePdfBlob==='function')window.makePdfBlob=window.__auaBaseMakePdfBlob;
  }

  function cleanupLegacyState(){
    try{['aua_quote_autodraft_v1','auaQuoteRevisionsV1','auaVehicleMemoryV1'].forEach(key=>localStorage.removeItem(key))}catch{}
  }

  function disableCustomerVehicleHistory(){
    ['customer','phone','vehicle','mileage','model'].forEach(id=>{
      const el=document.getElementById(id);if(!el)return;
      el.setAttribute('autocomplete','off');
      el.setAttribute('autocorrect','off');
      el.setAttribute('autocapitalize',id==='vehicle'?'characters':'off');
    });
  }

  function installPrivateSettlementToggle(){
    const CLAUSE_KEY='PRIVATE SETTLEMENT / GOODWILL QUOTATION';
    const CLAUSE_END='This quotation does not constitute an admission of liability by any party.';

    function clauseActive(editor=document.getElementById('auaRemarksEditor')){
      return !!editor&&String(editor.innerText||editor.textContent||'').toUpperCase().includes(CLAUSE_KEY);
    }
    function syncLabel(){
      const button=document.getElementById('auaPrivateSettlementButton');
      if(button)button.textContent=clauseActive()?'Private Settlement ×':'Private Settlement';
    }

    document.addEventListener('click',event=>{
      const button=event.target?.closest?.('#auaPrivateSettlementButton');
      if(!button)return;
      const editor=document.getElementById('auaRemarksEditor');
      if(!editor)return;
      const existing=String(editor.innerText||editor.textContent||'').toUpperCase();
      if(!existing.includes(CLAUSE_KEY)){
        setTimeout(syncLabel,0);
        return;
      }

      const html=String(editor.innerHTML||''),marker='<strong>'+CLAUSE_KEY+'</strong>';
      const start=html.indexOf(marker),endAt=html.indexOf(CLAUSE_END,start);
      if(start<0||endAt<0)return;

      event.preventDefault();
      event.stopImmediatePropagation();
      let from=start,to=endAt+CLAUSE_END.length;
      if(html.slice(Math.max(0,from-8),from)==='<br><br>')from-=8;
      while(html.slice(to,to+4)==='<br>')to+=4;
      editor.innerHTML=(html.slice(0,from)+html.slice(to)).replace(/^(?:<br>)+|(?:<br>)+$/g,'');
      editor.dispatchEvent(new Event('input',{bubbles:true}));
      syncLabel();
      editor.focus();
    },true);

    document.addEventListener('input',event=>{
      if(event.target?.id==='auaRemarksEditor')syncLabel();
    },true);

    const syncWhenReady=(attempt=0)=>{
      if(document.getElementById('auaPrivateSettlementButton')){syncLabel();return}
      if(attempt<30)setTimeout(()=>syncWhenReady(attempt+1),100);
    };
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>syncWhenReady(),{once:true});else syncWhenReady();
  }

  function startupGuards(){
    captureLocalPdfGenerator();
    blockLegacyAutoMigration();
    cleanupLegacyState();
    disableCustomerVehicleHistory();
    setTimeout(blockBackgroundPersistence,0);
  }

  installPrivateSettlementToggle();

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startupGuards,{once:true});
  else startupGuards();

  const corePromise=loadOrdered(['./app-core.js','./history-stability-guard.js','./workflow-suite.js','./preflight-reminder-only.js','./cloud-workshop-data.js']).catch(error=>{
    console.error('Quotation runtime failed to initialise',error);
    throw error;
  });

  // Templates are intentionally user-owned only. Clear the template library once for this
  // migration, then preserve everything the user saves from this point onward.
  const TEMPLATE_RESET_KEY='auaUserOwnedTemplatesResetV1';
  function resetExistingTemplatesOnce(){
    try{
      if(localStorage.getItem(TEMPLATE_RESET_KEY)==='1')return;
      localStorage.removeItem('auaJobTemplatesV1');
      localStorage.setItem(TEMPLATE_RESET_KEY,'1');
    }catch{}
  }
  function enforceUserOwnedTemplateUi(attempt=0){
    const panel=document.getElementById('auaTemplatePanel');
    if(!panel){if(attempt<30)setTimeout(()=>enforceUserOwnedTemplateUi(attempt+1),100);return}
    if(panel.dataset.auaUserOwnedTemplates==='1')return;
    panel.dataset.auaUserOwnedTemplates='1';

    const clean=()=>{
      panel.querySelectorAll('.aua-template-card').forEach(card=>{
        const button=card.querySelector('[data-aua-template]');
        const id=String(button?.dataset?.auaTemplate||'');
        if(id&&!id.startsWith('custom-'))card.remove();
      });
      const grid=panel.querySelector('.aua-template-grid');
      if(!grid)return;
      const cards=grid.querySelectorAll('.aua-template-card');
      const empty=grid.querySelector('.aua-template-empty');
      if(cards.length){empty?.remove();return}
      if(!empty){
        const message=document.createElement('div');
        message.className='aua-template-empty';
        message.style.cssText='grid-column:1/-1;padding:14px;border:1px dashed #cbd5e1;border-radius:9px;background:#f8fafc;color:#64748b;font-size:10.5px;line-height:1.45;text-align:center';
        message.textContent='No templates yet. Build a quotation section, then choose “Save Current Section as Template”.';
        grid.appendChild(message);
      }
    };

    clean();
    new MutationObserver(clean).observe(panel,{childList:true,subtree:true});
  }

  corePromise.then(()=>{
    resetExistingTemplatesOnce();
    enforceUserOwnedTemplateUi();
  });

  const historyModules=[
    './history-enhancements.js',
    './history-spacing-polish.js',
    './history-tools.js',
    './history-permanent-delete.js',
    './history-doubleclick.js'
  ];
  let historyPromise=null;

  function loadHistoryRuntime(){
    if(historyPromise)return historyPromise;
    historyPromise=loadScript(historyModules[0])
      .then(()=>Promise.all(historyModules.slice(1).map(loadScript)))
      .catch(error=>{historyPromise=null;throw error});
    return historyPromise;
  }

  function warmHistoryAssets(){
    Promise.all(historyModules.map(src=>fetch(src,{cache:'force-cache'}).catch(()=>null))).catch(()=>{});
  }

  corePromise.then(()=>{
    const warm=()=>warmHistoryAssets();
    if('requestIdleCallback'in window)requestIdleCallback(warm,{timeout:2500});
    else setTimeout(warm,1200);
  }).catch(()=>{});

  window.auaOpenHistory=async function(){
    try{
      await corePromise;
      await loadHistoryRuntime();
      await new Promise(resolve=>requestAnimationFrame(resolve));
      document.getElementById('cloudRecordsTab')?.click();
    }catch(error){
      console.error('History could not load',error);
      alert('History could not load. Please refresh and try again.');
    }
  };
})();