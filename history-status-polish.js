// Safe History status polish: remove amount filters, color statuses, edit status inline.
(function(){
  const byId=id=>document.getElementById(id);
  const STATUS=['Draft','Sent','Approved','Completed','Cancelled'];
  const text=value=>String(value??'').trim();
  const clone=value=>{try{return JSON.parse(JSON.stringify(value))}catch{return value}};
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

  function records(){
    try{return typeof getRecent==='function'?(getRecent()||[]):[]}catch{return[]}
  }
  function recordForKey(key){return records().find(r=>String(r?.key||'')===String(key||''))||null}
  function statusFor(record){
    const value=text(record?.data?.status);
    return STATUS.includes(value)?value:'Draft';
  }
  function statusClass(status){
    if(status==='Sent'||status==='Approved')return 'aua-status-green';
    if(status==='Cancelled')return 'aua-status-red';
    if(status==='Completed')return 'aua-status-blue';
    return 'aua-status-grey';
  }

  function addStyles(){
    if(byId('auaHistoryStatusPolishStyles'))return;
    const style=document.createElement('style');
    style.id='auaHistoryStatusPolishStyles';
    style.textContent=`
      #auaHistoryAdvanced{grid-template-columns:1.15fr 1fr 1fr 1fr auto!important}
      .aua-history-status-badge.aua-status-grey{background:#f1f5f9!important;color:#475569!important;border:1px solid #e2e8f0}
      .aua-history-status-badge.aua-status-green{background:#dcfce7!important;color:#166534!important;border:1px solid #bbf7d0}
      .aua-history-status-badge.aua-status-red{background:#fee2e2!important;color:#b91c1c!important;border:1px solid #fecaca}
      .aua-history-status-badge.aua-status-blue{background:#e0f2fe!important;color:#075985!important;border:1px solid #bae6fd}
      .aua-inline-status-editor{margin:0 0 16px;padding:12px;border:1px solid #dbe3ed;border-radius:10px;background:#fbfdff}
      .aua-inline-status-editor label{font-size:8.5px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;color:#64748b;margin-bottom:5px}
      .aua-inline-status-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center}
      .aua-inline-status-row select{min-height:38px;font-size:11px}.aua-inline-status-row button{min-height:38px;white-space:nowrap}
      .aua-inline-status-message{min-height:14px;margin-top:6px;font-size:9.5px;color:#64748b}
      .aua-inline-status-message[data-tone="success"]{color:#166534}.aua-inline-status-message[data-tone="error"]{color:#b42318}
      @media(max-width:900px){#auaHistoryAdvanced{grid-template-columns:1fr 1fr!important}.aua-inline-status-row{grid-template-columns:1fr}}
      @media(max-width:520px){#auaHistoryAdvanced{grid-template-columns:1fr!important}}
    `;
    document.head.appendChild(style);
  }

  function removeAmountFilters(){
    ['auaHistMin','auaHistMax'].forEach(id=>{
      const el=byId(id);
      el?.closest('.aua-history-filter-field')?.remove();
    });
  }

  function colorBadges(){
    const overlay=byId('auaHistoryOverlay');
    if(!overlay||overlay.hidden)return;
    overlay.querySelectorAll('.aua-history-row[data-aua-key]').forEach(row=>{
      const record=recordForKey(row.dataset.auaKey);
      const badge=row.querySelector('.aua-history-status-badge');
      if(!record||!badge)return;
      const status=statusFor(record);
      badge.textContent=status;
      badge.classList.remove('aua-status-grey','aua-status-green','aua-status-red','aua-status-blue');
      badge.classList.add(statusClass(status));
    });
    overlay.querySelectorAll('.aua-history-vehicle-entry .aua-history-status-badge').forEach(badge=>{
      const status=text(badge.textContent);
      badge.classList.remove('aua-status-grey','aua-status-green','aua-status-red','aua-status-blue');
      badge.classList.add(statusClass(status));
    });
  }

  async function saveStatus(key,newStatus,select,button,message){
    const record=recordForKey(key);
    if(!record||!STATUS.includes(newStatus))return;
    const oldStatus=statusFor(record);
    if(newStatus===oldStatus){message.textContent='No change to save.';message.dataset.tone='';return}
    if(typeof state!=='function'||typeof loadRecord!=='function'||typeof saveRecord!=='function'){
      message.textContent='Status editing is unavailable.';message.dataset.tone='error';select.value=oldStatus;return;
    }

    const previous=clone(state());
    const updated=clone(record.data||{});
    updated.status=newStatus;
    select.disabled=true;button.disabled=true;button.textContent='Saving…';message.textContent='Saving status…';message.dataset.tone='';

    try{
      loadRecord(updated);
      const result=saveRecord();
      if(result&&typeof result.then==='function')await result;
      await wait(100);
      const cloud=byId('cloudStatus');
      if(cloud?.dataset?.tone==='error')throw new Error(cloud.textContent||'Online save failed.');
      if(previous)loadRecord(previous);
      message.textContent=`Status changed to ${newStatus}.`;
      message.dataset.tone='success';
      await wait(80);
      refresh();
    }catch(error){
      if(previous)try{loadRecord(previous)}catch{}
      select.value=oldStatus;
      message.textContent=error?.message||'Unable to save status.';
      message.dataset.tone='error';
    }finally{
      select.disabled=false;button.disabled=false;button.textContent='Save Status';
    }
  }

  function renderEditor(){
    const overlay=byId('auaHistoryOverlay'),preview=byId('auaHistoryPreview');
    if(!overlay||overlay.hidden||!preview)return;
    const selected=overlay.querySelector('.aua-history-row.selected[data-aua-key]');
    const existing=preview.querySelector('.aua-inline-status-editor');
    if(!selected){existing?.remove();return}
    const record=recordForKey(selected.dataset.auaKey);
    if(!record){existing?.remove();return}
    if(existing?.dataset?.auaKey===selected.dataset.auaKey)return;
    existing?.remove();

    const editor=document.createElement('div');
    editor.className='aua-inline-status-editor';
    editor.dataset.auaKey=selected.dataset.auaKey;
    const stats=preview.querySelector('.aua-history-stats');
    if(stats)preview.insertBefore(editor,stats);else preview.prepend(editor);
    const status=statusFor(record);
    editor.innerHTML=`<label>Edit Status</label><div class="aua-inline-status-row"><select id="auaInlineStatusSelect">${STATUS.map(x=>`<option value="${x}"${x===status?' selected':''}>${x}</option>`).join('')}</select><button id="auaInlineStatusSave" class="btn primary" type="button">Save Status</button></div><div id="auaInlineStatusMessage" class="aua-inline-status-message"></div>`;
    const select=byId('auaInlineStatusSelect'),button=byId('auaInlineStatusSave'),message=byId('auaInlineStatusMessage');
    if(select&&button&&message)button.onclick=event=>{event.stopPropagation();saveStatus(selected.dataset.auaKey,select.value,select,button,message)};
  }

  function refresh(){
    removeAmountFilters();
    colorBadges();
    renderEditor();
  }
  function schedule(delay=0){setTimeout(()=>requestAnimationFrame(refresh),delay)}

  function install(){
    addStyles();
    const overlay=byId('auaHistoryOverlay'),button=byId('cloudRecordsTab');
    if(!overlay||!button){setTimeout(install,250);return}
    removeAmountFilters();
    if(overlay.dataset.auaHistoryStatusPolish)return;
    overlay.dataset.auaHistoryStatusPolish='1';
    button.addEventListener('click',()=>{schedule(120);schedule(350);schedule(700)});
    overlay.addEventListener('click',()=>schedule(0));
    overlay.addEventListener('input',()=>schedule(0));
    overlay.addEventListener('change',()=>schedule(0));
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
