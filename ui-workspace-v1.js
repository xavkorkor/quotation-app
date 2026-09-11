// Reversible UI-only workspace refresh. No quotation storage, calculation or PDF logic lives here.
(function(){
  const byId=id=>document.getElementById(id);
  let syncQueued=false;

  function text(value){return String(value??'').trim()}
  function statusTone(value){
    const s=text(value).toLowerCase();
    if(s==='approved'||s==='sent')return 'good';
    if(s==='completed')return 'done';
    if(s==='cancelled')return 'bad';
    return 'draft';
  }

  function ensureStyles(){
    if(byId('auaWorkspaceRefreshStyles'))return;
    const style=document.createElement('style');
    style.id='auaWorkspaceRefreshStyles';
    style.textContent=`
      :root{--aua-workspace-width:660px}
      html:not(.cloud-auth-gate) .app{grid-template-columns:var(--aua-workspace-width) minmax(0,1fr)}
      html:not(.cloud-auth-gate) .editor{padding:18px;background:#f3f6fa}
      html:not(.cloud-auth-gate) .panel{margin-bottom:12px;padding:16px;border-color:#e1e7ef;border-radius:13px;box-shadow:0 1px 2px rgba(15,39,71,.025)}
      html:not(.cloud-auth-gate) .panel-title{margin-bottom:11px;font-size:10px;letter-spacing:.1em;color:#506177}
      html:not(.cloud-auth-gate) .customer-panel{border-color:#cbd8e7;box-shadow:0 5px 18px rgba(15,39,71,.055)}
      html:not(.cloud-auth-gate) .customer-panel .grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:11px}
      html:not(.cloud-auth-gate) .aua-quote-workflow-panel .grid{grid-template-columns:1.35fr .65fr}
      html:not(.cloud-auth-gate) .sections-panel{background:#fbfdff;border-color:#c9d9eb;box-shadow:0 6px 18px rgba(37,99,235,.045)}
      html:not(.cloud-auth-gate) .section-card{margin-top:10px;padding:12px;border-color:#d9e3ee;background:#fff}
      html:not(.cloud-auth-gate) .section-head{padding:8px;background:#eef4fa}
      html:not(.cloud-auth-gate) .item{margin-top:8px;padding:10px;border-color:#e3e9f0}
      html:not(.cloud-auth-gate) .item-main{grid-template-columns:78px minmax(0,1fr) 118px 38px;gap:9px}
      html:not(.cloud-auth-gate) input,html:not(.cloud-auth-gate) select,html:not(.cloud-auth-gate) textarea{border-color:#cfd9e5;background:#fff}
      html:not(.cloud-auth-gate) .action-panel{position:relative;background:#f9fbfd;border-color:#d8e2ec}
      html:not(.cloud-auth-gate) .shortcut{opacity:.72}
      html:not(.cloud-auth-gate) #cloudPanel{padding:10px 13px;margin-bottom:12px;border-color:#d8e3ee;background:#fbfdff;box-shadow:none}
      html:not(.cloud-auth-gate) #cloudPanelTitle{display:none}
      html:not(.cloud-auth-gate) #cloudUser{margin:0 0 7px;font-size:10px}
      html:not(.cloud-auth-gate) #cloudPanel .toolbar{margin-top:6px;gap:7px}
      html:not(.cloud-auth-gate) #cloudPanel .btn{min-height:34px;padding:7px 9px;font-size:10.5px}
      html:not(.cloud-auth-gate) #cloudSignOut{min-height:32px;margin-top:6px;padding:6px 9px;font-size:10px}
      html:not(.cloud-auth-gate) #cloudStatus{margin-top:6px;padding:6px 8px;font-size:9.5px;background:#f4f7fa}
      .aua-workspace-header{position:sticky;top:-18px;z-index:90;margin:-18px -18px 14px;padding:15px 18px 13px;border-bottom:1px solid rgba(203,216,231,.94);background:rgba(248,250,252,.96);box-shadow:0 7px 20px rgba(15,39,71,.07);backdrop-filter:blur(14px)}
      .aua-workspace-main{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}
      .aua-workspace-brand{min-width:0}.aua-workspace-kicker{margin-bottom:3px;color:#64748b;font-size:8.5px;font-weight:850;letter-spacing:.14em;text-transform:uppercase}.aua-workspace-title{color:#0f2747;font-size:18px;font-weight:850;line-height:1.1}.aua-workspace-meta{display:flex;align-items:center;gap:7px;margin-top:7px;min-width:0}.aua-workspace-ref{max-width:260px;overflow:hidden;color:#64748b;font-size:9.5px;font-weight:750;text-overflow:ellipsis;white-space:nowrap}.aua-workspace-status{display:inline-flex;align-items:center;justify-content:center;min-width:58px;padding:3px 7px;border:1px solid #dbe3ec;border-radius:999px;background:#f1f5f9;color:#475569;font-size:8px;font-weight:850;text-transform:uppercase}.aua-workspace-status[data-tone="good"]{border-color:#bbf7d0;background:#dcfce7;color:#166534}.aua-workspace-status[data-tone="done"]{border-color:#bae6fd;background:#e0f2fe;color:#075985}.aua-workspace-status[data-tone="bad"]{border-color:#fecaca;background:#fee2e2;color:#b91c1c}
      .aua-workspace-actions{display:grid;grid-template-columns:1fr 1.25fr 1fr .85fr 1fr;gap:7px;margin-top:12px}.aua-workspace-actions .btn{min-height:37px;padding:8px 10px;font-size:10.5px}.aua-workspace-new{border:1px solid #b9c8d9!important;background:#eef4fa!important;color:#183b63!important}.aua-workspace-save{background:linear-gradient(135deg,#2563eb,#1d4ed8)!important;color:#fff!important;box-shadow:0 5px 12px rgba(37,99,235,.18)}.aua-workspace-history{border:1px solid #cbd5e1!important;background:#fff!important;color:#334155!important}.aua-workspace-pdf{border:1px solid #cbd5e1!important;background:#fff!important;color:#334155!important}.aua-workspace-wa{background:#22c55e!important;color:#fff!important}
      html:not(.cloud-auth-gate) .preview-wrap{padding:30px;background:linear-gradient(145deg,#e9eff6,#e2eaf3)}
      html:not(.cloud-auth-gate) .paper{box-shadow:0 20px 55px rgba(15,39,71,.16)}
      @media(max-width:1320px){:root{--aua-workspace-width:610px}.aua-workspace-title{font-size:17px}}
      @media(max-width:1120px){html:not(.cloud-auth-gate) .app{grid-template-columns:1fr}html:not(.cloud-auth-gate) .editor{padding:16px}.aua-workspace-header{top:-16px;margin:-16px -16px 14px;padding:14px 16px}.preview-wrap{padding:16px}}
      @media(max-width:760px){html:not(.cloud-auth-gate) .customer-panel .grid{grid-template-columns:1fr 1fr}.aua-workspace-actions{grid-template-columns:1fr 1fr}}
      @media(max-width:520px){html:not(.cloud-auth-gate) .editor{padding:11px}.aua-workspace-header{top:-11px;margin:-11px -11px 11px;padding:12px 11px}.aua-workspace-main{gap:9px}.aua-workspace-title{font-size:15px}.aua-workspace-ref{max-width:180px}.aua-workspace-actions{gap:6px}.aua-workspace-actions .btn{font-size:10px}html:not(.cloud-auth-gate) .customer-panel .grid{grid-template-columns:1fr}.aua-quote-workflow-panel .grid{grid-template-columns:1fr!important}}
      @media print{.aua-workspace-header{display:none!important}}
    `;
    document.head.appendChild(style);
  }

  function ensureHeader(){
    if(byId('auaWorkspaceHeader'))return true;
    const editor=document.querySelector('.editor');
    const customer=document.querySelector('.customer-panel');
    if(!editor||!customer)return false;
    const header=document.createElement('div');
    header.id='auaWorkspaceHeader';
    header.className='aua-workspace-header';
    header.innerHTML=`
      <div class="aua-workspace-main">
        <div class="aua-workspace-brand">
          <div class="aua-workspace-kicker">Alan's United Auto</div>
          <div class="aua-workspace-title">Quotation Workspace</div>
          <div class="aua-workspace-meta"><span id="auaUiQuoteRef" class="aua-workspace-ref">New quotation</span><span id="auaUiStatus" class="aua-workspace-status" data-tone="draft">Draft</span></div>
        </div>
      </div>
      <div class="aua-workspace-actions">
        <button id="auaUiNew" class="btn aua-workspace-new" type="button">New Quotation</button>
        <button id="auaUiSave" class="btn aua-workspace-save" type="button">Save Quotation</button>
        <button id="auaUiHistory" class="btn aua-workspace-history" type="button">History</button>
        <button id="auaUiPdf" class="btn aua-workspace-pdf" type="button">PDF</button>
        <button id="auaUiWhatsApp" class="btn aua-workspace-wa" type="button">WhatsApp</button>
      </div>`;
    editor.insertBefore(header,customer);

    byId('auaUiNew').onclick=()=>{if(typeof newQuote==='function'){newQuote();queueSync(80)}};
    byId('auaUiSave').onclick=()=>{try{const result=typeof saveRecord==='function'?saveRecord():null;if(result&&typeof result.finally==='function')result.finally(()=>queueSync(80));else queueSync(80)}catch(error){console.error('Save Quotation failed',error)}};
    byId('auaUiHistory').onclick=()=>byId('cloudRecordsTab')?.click();
    byId('auaUiPdf').onclick=()=>{if(typeof downloadPdf==='function')downloadPdf()};
    byId('auaUiWhatsApp').onclick=()=>{if(typeof sharePdfWhatsApp==='function')sharePdfWhatsApp()};
    return true;
  }

  function polishLabels(){
    document.querySelectorAll('.action-panel button').forEach(button=>{
      const code=button.getAttribute('onclick')||'';
      if(code.includes('saveRecord'))button.textContent='Save Quotation';
      else if(code.includes('newQuote'))button.textContent='New Quotation';
      else if(code.includes('duplicateQuote'))button.textContent='Duplicate Quotation';
      else if(code.includes('recordFile.click'))button.textContent='Load Backup';
    });
  }

  function syncHeader(){
    syncQueued=false;
    const quote=text(byId('auaQuoteNumber')?.value)||'New quotation';
    const status=text(byId('auaQuoteStatus')?.value)||'Draft';
    const ref=byId('auaUiQuoteRef'),badge=byId('auaUiStatus');
    if(ref)ref.textContent=quote;
    if(badge){badge.textContent=status;badge.dataset.tone=statusTone(status)}
  }

  function queueSync(delay=0){
    if(syncQueued&&delay===0)return;
    syncQueued=true;
    const run=()=>requestAnimationFrame(()=>requestAnimationFrame(syncHeader));
    if(delay)setTimeout(run,delay);else run();
  }

  function installEvents(){
    if(document.documentElement.dataset.auaWorkspaceEvents)return;
    document.documentElement.dataset.auaWorkspaceEvents='1';
    document.addEventListener('input',()=>queueSync(),true);
    document.addEventListener('change',()=>queueSync(),true);
    document.addEventListener('click',()=>queueSync(40),true);
    document.addEventListener('aua-history-updated',()=>queueSync(40));
  }

  function install(attempt=0){
    ensureStyles();
    const ready=ensureHeader();
    polishLabels();
    installEvents();
    queueSync(30);
    if(!ready&&attempt<20)setTimeout(()=>install(attempt+1),200);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>install(),{once:true});else install();
})();
