// Staff attribution for shared quotation records and History.
(function(){
  const byId=id=>document.getElementById(id);
  const STAFF_BY_EMAIL={
    'xavkqw@gmail.com':'Xavier',
    'khong.shijie@gmail.com':'Shijie'
  };

  function currentEmail(){
    const value=String(byId('cloudUser')?.textContent||'').trim();
    const match=value.match(/^Signed in as\s+(.+)$/i);
    return String(match?.[1]||'').trim().toLowerCase();
  }

  function staffName(email){
    const value=String(email||'').trim().toLowerCase();
    if(!value)return 'Not recorded';
    return STAFF_BY_EMAIL[value]||'Staff';
  }

  function installStateAttribution(){
    if(typeof state!=='function')return false;
    if(state.__auaStaffAttribution)return true;
    const baseState=state;
    const wrapped=function(){
      const data=baseState();
      const email=currentEmail();
      if(email){
        const name=staffName(email);
        data.savedByEmail=email;
        data.savedBy=name;
        data.lastUpdatedByEmail=email;
        data.lastUpdatedBy=name;
      }
      return data;
    };
    wrapped.__auaStaffAttribution=true;
    state=wrapped;
    return true;
  }

  function getRecords(){
    try{return typeof getRecent==='function'?(getRecent()||[]):[]}catch{return[]}
  }

  function findRecord(key){
    return getRecords().find(record=>String(record?.key||'')===String(key||''));
  }

  function recordStaff(record){
    const data=record?.data||{};
    const email=String(data.savedByEmail||data.lastUpdatedByEmail||'').trim().toLowerCase();
    const stored=String(data.savedBy||data.lastUpdatedBy||'').trim();
    const mapped=staffName(email);
    const name=mapped!=='Not recorded'&&mapped!=='Staff'?mapped:(stored||mapped);
    return name||'Not recorded';
  }

  function addStyles(){
    if(byId('auaStaffAttributionStyles'))return;
    const style=document.createElement('style');
    style.id='auaStaffAttributionStyles';
    style.textContent=`
      .aua-history-updated-cell{display:flex;flex-direction:column;gap:4px;align-items:flex-start}
      .aua-history-updated-by{font-size:10px;font-weight:800;color:#334155;line-height:1.3}
      .aua-history-preview-updater{margin:-10px 0 18px;padding:9px 11px;border-radius:9px;background:#f8fafc;border:1px solid #e2e8f0;color:#475569;font-size:10.5px;line-height:1.45}
      .aua-history-preview-updater b{color:#0f2747}
      @media(max-width:900px){.aua-history-updated-cell{display:none}}
    `;
    document.head.appendChild(style);
  }

  function enhanceHistory(){
    const overlay=byId('auaHistoryOverlay');
    if(!overlay||overlay.hidden)return;
    const columns=overlay.querySelector('.aua-history-columns');
    if(columns?.children?.[4]&&columns.children[4].textContent!=='Last Updated')columns.children[4].textContent='Last Updated';

    overlay.querySelectorAll('.aua-history-row[data-aua-key]').forEach(row=>{
      const cell=row.querySelector('.aua-history-updated-cell');
      if(!cell)return;
      const name=recordStaff(findRecord(row.dataset.auaKey));
      let label=cell.querySelector('.aua-history-updated-by');
      if(!label){
        label=document.createElement('span');
        label.className='aua-history-updated-by';
        cell.appendChild(label);
      }
      const value=name==='Not recorded'?'Saved by —':`Saved by ${name}`;
      if(label.textContent!==value)label.textContent=value;
    });

    const selected=overlay.querySelector('.aua-history-row.selected[data-aua-key]');
    const preview=byId('auaHistoryPreview');
    if(!preview)return;
    let updater=preview.querySelector('.aua-history-preview-updater');
    if(!selected){updater?.remove();return}
    const name=recordStaff(findRecord(selected.dataset.auaKey));
    if(!updater){
      updater=document.createElement('div');
      updater.className='aua-history-preview-updater';
      const stats=preview.querySelector('.aua-history-stats');
      if(stats)preview.insertBefore(updater,stats);else preview.prepend(updater);
    }
    const value=name==='Not recorded'?'<b>Saved by:</b> Not recorded':`<b>Saved by:</b> ${name}`;
    if(updater.innerHTML!==value)updater.innerHTML=value;
  }

  function queueEnhance(){
    requestAnimationFrame(()=>enhanceHistory());
  }

  function installHistoryHooks(){
    const overlay=byId('auaHistoryOverlay');
    const button=byId('cloudRecordsTab');
    if(!overlay||!button)return false;
    if(overlay.dataset.auaStaffHooks)return true;
    overlay.dataset.auaStaffHooks='1';

    button.addEventListener('click',()=>{
      setTimeout(queueEnhance,0);
      setTimeout(queueEnhance,150);
      setTimeout(queueEnhance,400);
    });
    overlay.addEventListener('click',()=>setTimeout(queueEnhance,0));
    overlay.addEventListener('input',()=>setTimeout(queueEnhance,0));
    overlay.addEventListener('change',()=>setTimeout(queueEnhance,0));
    return true;
  }

  function install(){
    addStyles();
    const stateReady=installStateAttribution();
    const historyReady=installHistoryHooks();
    if(!stateReady||!historyReady)setTimeout(install,200);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
