// Stable quotation creator / last-editor audit with event-driven History refresh.
(function(){
  const STAFF_BY_EMAIL={'xavkqw@gmail.com':'Xavier','khong.shijie@gmail.com':'Shijie'};
  const emptyAudit=()=>({createdBy:'',createdAt:'',lastEditedBy:'',lastEditedAt:'',legacy:false});
  let auditMeta=emptyAudit(),lastStampMs=0;

  function currentStaff(){
    const label=String(document.getElementById('cloudUser')?.textContent||'').trim();
    const match=label.match(/^Signed in as\s+(.+)$/i);
    return STAFF_BY_EMAIL[String(match?.[1]||'').trim().toLowerCase()]||'';
  }
  function cleanAudit(source){
    const a=source?.audit||{},createdBy=String(a.createdBy||'').trim(),createdAt=String(a.createdAt||'').trim();
    let lastEditedBy=String(a.lastEditedBy||source?.savedBy||source?.lastUpdatedBy||'').trim(),lastEditedAt=String(a.lastEditedAt||'').trim();
    if(createdBy&&lastEditedBy===createdBy&&createdAt&&lastEditedAt){
      const gap=Math.abs(new Date(lastEditedAt).getTime()-new Date(createdAt).getTime());
      if(Number.isFinite(gap)&&gap<5000){lastEditedBy='';lastEditedAt=''}
    }
    return{createdBy,createdAt,lastEditedBy,lastEditedAt,legacy:!createdBy};
  }
  function stampSave(){
    const staff=currentStaff();if(!staff)return;
    const nowMs=Date.now();if(nowMs-lastStampMs<1500)return;lastStampMs=nowMs;
    const now=new Date(nowMs).toISOString();
    if(!auditMeta.createdBy){auditMeta={createdBy:staff,createdAt:now,lastEditedBy:'',lastEditedAt:'',legacy:false};return}
    auditMeta.lastEditedBy=staff;auditMeta.lastEditedAt=now;
  }

  function installDataHooks(){
    if(typeof state!=='function'||typeof loadRecord!=='function'||typeof newQuote!=='function'||typeof duplicateQuote!=='function'||typeof saveRecord!=='function'||typeof saveRecent!=='function')return false;
    if(state.__auaAuditStableV3)return true;
    const baseState=state,baseLoadRecord=loadRecord,baseNewQuote=newQuote,baseDuplicateQuote=duplicateQuote,baseSaveRecord=saveRecord,baseSaveRecent=saveRecent;
    state=function(){const data=baseState();data.audit={createdBy:auditMeta.createdBy,createdAt:auditMeta.createdAt,lastEditedBy:auditMeta.lastEditedBy,lastEditedAt:auditMeta.lastEditedAt};return data};
    state.__auaAuditStableV3=true;
    loadRecord=function(data){auditMeta=cleanAudit(data||{});lastStampMs=0;return baseLoadRecord(data)};
    newQuote=function(){auditMeta=emptyAudit();lastStampMs=0;return baseNewQuote()};
    duplicateQuote=function(){auditMeta=emptyAudit();lastStampMs=0;return baseDuplicateQuote()};
    saveRecord=function(){stampSave();return baseSaveRecord.apply(this,arguments)};
    saveRecent=function(){stampSave();return baseSaveRecent.apply(this,arguments)};
    return true;
  }

  function installCloudSaveHook(){
    const button=document.getElementById('cloudSave');
    if(!button)return false;
    if(button.dataset.auaAuditSaveHook)return true;
    button.dataset.auaAuditSaveHook='1';button.addEventListener('click',stampSave,true);return true;
  }
  function displayAudit(audit){
    if(audit.lastEditedBy)return{label:'Last edited by',name:audit.lastEditedBy};
    if(audit.createdBy)return{label:'Made by',name:audit.createdBy};
    return{label:'Made by',name:'Not recorded'};
  }
  function getRecord(key){try{return (typeof getRecent==='function'?getRecent():[]).find(r=>String(r?.key||'')===String(key||''))}catch{return null}}

  function ensureStyles(){
    if(document.getElementById('auaQuotationAuditStyles'))return;
    const style=document.createElement('style');style.id='auaQuotationAuditStyles';
    style.textContent=`
      .aua-history-audit-line{display:block;margin:0;font-size:8.8px;font-weight:700;color:#64748b;line-height:1.25;white-space:nowrap}
      .aua-history-audit-card{margin:0 0 18px;padding:11px 12px;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc}
      .aua-history-audit-card span{display:block;font-size:8.5px;font-weight:800;text-transform:uppercase;color:#64748b;margin-bottom:3px}
      .aua-history-audit-card b{font-size:11px;color:#0f2747}
      .aua-history-quote-ref{display:none!important}
      .aua-history-updated-cell{display:flex;flex-direction:column;align-items:flex-end;justify-content:center;gap:4px;min-width:0;text-align:right}
      .aua-history-updated-cell .aua-history-updated{display:block;margin:0;line-height:1.25;white-space:nowrap}
      .aua-history-updated-cell .aua-history-status-badge{display:block;min-width:72px;width:max-content;margin:0;padding:3px 8px;text-align:center;line-height:1.2}
      @media(max-width:900px){.aua-history-updated-cell{display:none}}
    `;
    document.head.appendChild(style);
  }

  function refreshHistoryAudit(){
    const overlay=document.getElementById('auaHistoryOverlay');if(!overlay||overlay.hidden)return;
    overlay.querySelectorAll('.aua-history-row[data-aua-key]').forEach(row=>{
      const record=getRecord(row.dataset.auaKey),view=displayAudit(cleanAudit(record?.data||{})),cell=row.querySelector('.aua-history-updated-cell');if(!cell)return;
      const status=row.querySelector('.aua-history-status-badge');
      if(status&&status.parentElement!==cell)cell.appendChild(status);
      let line=cell.querySelector('.aua-history-audit-line');if(!line){line=document.createElement('span');line.className='aua-history-audit-line';cell.appendChild(line)}
      line.textContent=`${view.label} ${view.name}`;
    });
    const selected=overlay.querySelector('.aua-history-row.selected[data-aua-key]'),preview=document.getElementById('auaHistoryPreview');if(!preview)return;
    const old=preview.querySelector('.aua-history-audit-card');if(!selected){old?.remove();return}
    const view=displayAudit(cleanAudit(getRecord(selected.dataset.auaKey)?.data||{}));
    let card=old;if(!card){card=document.createElement('div');card.className='aua-history-audit-card';const stats=preview.querySelector('.aua-history-stats');if(stats)preview.insertBefore(card,stats);else preview.prepend(card)}
    card.innerHTML=`<span>${view.label}</span><b>${view.name}</b>`;
  }

  function install(attempt=0){
    ensureStyles();
    const dataReady=installDataHooks(),cloudReady=installCloudSaveHook();
    if(dataReady&&!document.documentElement.dataset.auaAuditHistoryEvent){
      document.documentElement.dataset.auaAuditHistoryEvent='1';
      document.addEventListener('aua-history-updated',refreshHistoryAudit);
    }
    if(dataReady&&cloudReady)return;
    if(attempt<20)setTimeout(()=>install(attempt+1),200);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>install());else install();
})();
