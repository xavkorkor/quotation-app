// Stable quotation creator / last-editor audit for History.
(function(){
  const STAFF_BY_EMAIL={
    'xavkqw@gmail.com':'Xavier',
    'khong.shijie@gmail.com':'Shijie'
  };
  const emptyAudit=()=>({createdBy:'',createdAt:'',lastEditedBy:'',lastEditedAt:'',legacy:false});
  let auditMeta=emptyAudit();

  function currentStaff(){
    const label=String(document.getElementById('cloudUser')?.textContent||'').trim();
    const match=label.match(/^Signed in as\s+(.+)$/i);
    const email=String(match?.[1]||'').trim().toLowerCase();
    return STAFF_BY_EMAIL[email]||'';
  }

  function cleanAudit(source){
    const a=source?.audit||{};
    const createdBy=String(a.createdBy||'').trim();
    const createdAt=String(a.createdAt||'').trim();
    let lastEditedBy=String(a.lastEditedBy||source?.savedBy||source?.lastUpdatedBy||'').trim();
    let lastEditedAt=String(a.lastEditedAt||'').trim();

    // Older audit builds stamped creator and editor at the same moment.
    // Treat that as creation-only so History does not falsely show an edit.
    if(createdBy&&lastEditedBy===createdBy&&createdAt&&lastEditedAt){
      const gap=Math.abs(new Date(lastEditedAt).getTime()-new Date(createdAt).getTime());
      if(Number.isFinite(gap)&&gap<5000){lastEditedBy='';lastEditedAt=''}
    }
    return{createdBy,createdAt,lastEditedBy,lastEditedAt,legacy:!createdBy};
  }

  function stampSave(){
    const staff=currentStaff();
    if(!staff)return;
    const now=new Date().toISOString();
    if(!auditMeta.createdBy){
      auditMeta.createdBy=staff;
      auditMeta.createdAt=now;
      auditMeta.lastEditedBy='';
      auditMeta.lastEditedAt='';
      auditMeta.legacy=false;
      return;
    }
    auditMeta.lastEditedBy=staff;
    auditMeta.lastEditedAt=now;
  }

  function installDataHooks(){
    if(typeof state!=='function'||typeof loadRecord!=='function'||typeof newQuote!=='function'||typeof duplicateQuote!=='function'||typeof saveRecord!=='function'||typeof saveRecent!=='function')return false;
    if(state.__auaAuditStableV2)return true;

    const baseState=state;
    const baseLoadRecord=loadRecord;
    const baseNewQuote=newQuote;
    const baseDuplicateQuote=duplicateQuote;
    const baseSaveRecord=saveRecord;
    const baseSaveRecent=saveRecent;

    state=function(){
      const data=baseState();
      data.audit={
        createdBy:auditMeta.createdBy,
        createdAt:auditMeta.createdAt,
        lastEditedBy:auditMeta.lastEditedBy,
        lastEditedAt:auditMeta.lastEditedAt
      };
      return data;
    };
    state.__auaAuditStableV2=true;

    loadRecord=function(data){
      auditMeta=cleanAudit(data||{});
      return baseLoadRecord(data);
    };
    newQuote=function(){
      auditMeta=emptyAudit();
      return baseNewQuote();
    };
    duplicateQuote=function(){
      auditMeta=emptyAudit();
      return baseDuplicateQuote();
    };
    saveRecord=function(){
      stampSave();
      return baseSaveRecord.apply(this,arguments);
    };
    saveRecent=function(){
      stampSave();
      return baseSaveRecent.apply(this,arguments);
    };
    return true;
  }

  function installCloudSaveHook(){
    const button=document.getElementById('cloudSave');
    if(!button)return false;
    if(button.dataset.auaAuditSaveHook)return true;
    button.dataset.auaAuditSaveHook='1';
    button.addEventListener('click',stampSave,true);
    return true;
  }

  function auditForRecord(record){
    return cleanAudit(record?.data||{});
  }

  function displayAudit(audit){
    if(audit.lastEditedBy)return{label:'Last edited by',name:audit.lastEditedBy};
    if(audit.createdBy)return{label:'Made by',name:audit.createdBy};
    return{label:'Made by',name:'Not recorded'};
  }

  function getRecord(key){
    try{return (typeof getRecent==='function'?getRecent():[]).find(r=>String(r?.key||'')===String(key||''))}catch{return null}
  }

  function ensureStyles(){
    if(document.getElementById('auaQuotationAuditStyles'))return;
    const style=document.createElement('style');
    style.id='auaQuotationAuditStyles';
    style.textContent=`
      .aua-history-audit-line{display:block;margin-top:4px;font-size:9.5px;font-weight:700;color:#475569;line-height:1.35}
      .aua-history-audit-card{margin:0 0 18px;padding:11px 12px;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc}
      .aua-history-audit-card span{display:block;font-size:8.5px;font-weight:800;text-transform:uppercase;color:#64748b;margin-bottom:3px}
      .aua-history-audit-card b{font-size:11px;color:#0f2747}
    `;
    document.head.appendChild(style);
  }

  function refreshHistoryAudit(){
    const overlay=document.getElementById('auaHistoryOverlay');
    if(!overlay||overlay.hidden)return;
    overlay.querySelectorAll('.aua-history-row[data-aua-key]').forEach(row=>{
      const view=displayAudit(auditForRecord(getRecord(row.dataset.auaKey)));
      const cell=row.querySelector('.aua-history-updated-cell');
      if(!cell)return;
      let line=cell.querySelector('.aua-history-audit-line');
      if(!line){line=document.createElement('span');line.className='aua-history-audit-line';cell.appendChild(line)}
      line.textContent=`${view.label} ${view.name}`;
    });

    const selected=overlay.querySelector('.aua-history-row.selected[data-aua-key]');
    const preview=document.getElementById('auaHistoryPreview');
    if(!preview)return;
    const old=preview.querySelector('.aua-history-audit-card');
    if(!selected){old?.remove();return}
    const view=displayAudit(auditForRecord(getRecord(selected.dataset.auaKey)));
    let card=old;
    if(!card){
      card=document.createElement('div');
      card.className='aua-history-audit-card';
      const stats=preview.querySelector('.aua-history-stats');
      if(stats)preview.insertBefore(card,stats);else preview.prepend(card);
    }
    card.innerHTML=`<span>${view.label}</span><b>${view.name}</b>`;
  }

  function installHistoryHooks(){
    const button=document.getElementById('cloudRecordsTab');
    const overlay=document.getElementById('auaHistoryOverlay');
    if(!button||!overlay)return false;
    if(overlay.dataset.auaAuditStableV2)return true;
    overlay.dataset.auaAuditStableV2='1';
    const refreshSoon=()=>requestAnimationFrame(refreshHistoryAudit);
    button.addEventListener('click',()=>{setTimeout(refreshSoon,120);setTimeout(refreshSoon,350)});
    overlay.addEventListener('click',()=>setTimeout(refreshSoon,0));
    overlay.addEventListener('input',()=>setTimeout(refreshSoon,0));
    overlay.addEventListener('change',()=>setTimeout(refreshSoon,0));
    return true;
  }

  function install(){
    ensureStyles();
    const dataReady=installDataHooks();
    const cloudReady=installCloudSaveHook();
    const historyReady=installHistoryHooks();
    if(!dataReady||!cloudReady||!historyReady)setTimeout(install,250);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
