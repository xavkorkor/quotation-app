// Stable quotation creator / last-editor audit for History.
(function(){
  const STAFF_BY_EMAIL={
    'xavkqw@gmail.com':'Xavier',
    'khong.shijie@gmail.com':'Shijie'
  };
  let auditMeta={createdBy:'',createdAt:'',lastEditedBy:'',lastEditedAt:'',legacy:false};

  function currentStaff(){
    const label=String(document.getElementById('cloudUser')?.textContent||'').trim();
    const match=label.match(/^Signed in as\s+(.+)$/i);
    const email=String(match?.[1]||'').trim().toLowerCase();
    return STAFF_BY_EMAIL[email]||'';
  }

  function cleanAudit(source){
    const a=source?.audit||{};
    return{
      createdBy:String(a.createdBy||'').trim(),
      createdAt:String(a.createdAt||'').trim(),
      lastEditedBy:String(a.lastEditedBy||source?.savedBy||source?.lastUpdatedBy||'').trim(),
      lastEditedAt:String(a.lastEditedAt||'').trim(),
      legacy:!String(a.createdBy||'').trim()
    };
  }

  function installDataHooks(){
    if(typeof state!=='function'||typeof loadRecord!=='function'||typeof newQuote!=='function'||typeof duplicateQuote!=='function')return false;
    if(state.__auaAuditStable)return true;

    const baseState=state,baseLoadRecord=loadRecord,baseNewQuote=newQuote,baseDuplicateQuote=duplicateQuote;

    state=function(){
      const data=baseState();
      const staff=currentStaff();
      const now=new Date().toISOString();
      if(staff){
        if(!auditMeta.legacy&&!auditMeta.createdBy){auditMeta.createdBy=staff;auditMeta.createdAt=now}
        auditMeta.lastEditedBy=staff;
        auditMeta.lastEditedAt=now;
      }
      data.audit={
        createdBy:auditMeta.createdBy,
        createdAt:auditMeta.createdAt,
        lastEditedBy:auditMeta.lastEditedBy,
        lastEditedAt:auditMeta.lastEditedAt
      };
      return data;
    };
    state.__auaAuditStable=true;

    loadRecord=function(data){
      auditMeta=cleanAudit(data||{});
      return baseLoadRecord(data);
    };
    newQuote=function(){
      auditMeta={createdBy:'',createdAt:'',lastEditedBy:'',lastEditedAt:'',legacy:false};
      return baseNewQuote();
    };
    duplicateQuote=function(){
      auditMeta={createdBy:'',createdAt:'',lastEditedBy:'',lastEditedAt:'',legacy:false};
      return baseDuplicateQuote();
    };
    return true;
  }

  function auditForRecord(record){
    const data=record?.data||{},a=data.audit||{};
    return{
      createdBy:String(a.createdBy||'').trim(),
      lastEditedBy:String(a.lastEditedBy||data.savedBy||data.lastUpdatedBy||'').trim()
    };
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
      .aua-history-audit-card{margin:0 0 18px;padding:11px 12px;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc;display:grid;grid-template-columns:1fr 1fr;gap:10px}
      .aua-history-audit-card span{display:block;font-size:8.5px;font-weight:800;text-transform:uppercase;color:#64748b;margin-bottom:3px}
      .aua-history-audit-card b{font-size:11px;color:#0f2747}
      @media(max-width:520px){.aua-history-audit-card{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function refreshHistoryAudit(){
    const overlay=document.getElementById('auaHistoryOverlay');
    if(!overlay||overlay.hidden)return;
    overlay.querySelectorAll('.aua-history-row[data-aua-key]').forEach(row=>{
      const record=getRecord(row.dataset.auaKey),audit=auditForRecord(record),cell=row.querySelector('.aua-history-updated-cell');
      if(!cell)return;
      let line=cell.querySelector('.aua-history-audit-line');
      if(!line){line=document.createElement('span');line.className='aua-history-audit-line';cell.appendChild(line)}
      const made=audit.createdBy||'Not recorded',last=audit.lastEditedBy||'Not recorded';
      line.textContent=`Made: ${made} · Last: ${last}`;
    });

    const selected=overlay.querySelector('.aua-history-row.selected[data-aua-key]'),preview=document.getElementById('auaHistoryPreview');
    if(!preview)return;
    const old=preview.querySelector('.aua-history-audit-card');
    if(!selected){old?.remove();return}
    const audit=auditForRecord(getRecord(selected.dataset.auaKey));
    let card=old;
    if(!card){
      card=document.createElement('div');
      card.className='aua-history-audit-card';
      const stats=preview.querySelector('.aua-history-stats');
      if(stats)preview.insertBefore(card,stats);else preview.prepend(card);
    }
    card.innerHTML=`<div><span>Made by</span><b>${audit.createdBy||'Not recorded'}</b></div><div><span>Last edited by</span><b>${audit.lastEditedBy||'Not recorded'}</b></div>`;
  }

  function installHistoryHooks(){
    const button=document.getElementById('cloudRecordsTab'),overlay=document.getElementById('auaHistoryOverlay');
    if(!button||!overlay)return false;
    if(overlay.dataset.auaAuditStable)return true;
    overlay.dataset.auaAuditStable='1';
    const refreshSoon=()=>requestAnimationFrame(refreshHistoryAudit);
    button.addEventListener('click',()=>{setTimeout(refreshSoon,120);setTimeout(refreshSoon,350)});
    overlay.addEventListener('click',()=>setTimeout(refreshSoon,0));
    overlay.addEventListener('input',()=>setTimeout(refreshSoon,0));
    overlay.addEventListener('change',()=>setTimeout(refreshSoon,0));
    return true;
  }

  function install(){
    ensureStyles();
    const dataReady=installDataHooks(),historyReady=installHistoryHooks();
    if(!dataReady||!historyReady)setTimeout(install,250);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
