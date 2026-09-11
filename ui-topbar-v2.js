// Compact signed-in utility bar for the quotation workspace.
// UI-only: no quotation storage, calculation, PDF or history logic is changed here.
(function(){
  const byId=id=>document.getElementById(id);

  function displayName(raw){
    const value=String(raw||'').toLowerCase();
    if(value.includes('xavkqw@gmail.com'))return 'Xavier';
    if(value.includes('khong.shijie@gmail.com'))return 'Shijie';
    const match=String(raw||'').match(/^Signed in as\s+(.+)$/i);
    return match?.[1]||'Staff';
  }

  function ensureStyles(){
    if(byId('auaCompactTopbarStyles'))return;
    const style=document.createElement('style');
    style.id='auaCompactTopbarStyles';
    style.textContent=`
      html:not(.cloud-auth-gate) #cloudPanel{
        margin:0 0 11px;
        padding:8px 10px;
        border:1px solid #d9e3ee;
        border-radius:12px;
        background:rgba(255,255,255,.86);
        box-shadow:0 2px 8px rgba(15,39,71,.035);
      }
      html:not(.cloud-auth-gate) #cloudPanelTitle{display:none!important}
      html:not(.cloud-auth-gate) #cloudSignedIn:not([hidden]){
        display:grid;
        grid-template-columns:minmax(0,1fr) auto auto auto;
        gap:6px;
        align-items:center;
      }
      html:not(.cloud-auth-gate) #cloudSignedIn>.toolbar{display:contents}
      html:not(.cloud-auth-gate) #cloudSave,
      html:not(.cloud-auth-gate) #cloudRecordsTab{display:none!important}
      html:not(.cloud-auth-gate) #cloudRecordsPanel{display:none!important}
      html:not(.cloud-auth-gate) #cloudUser{
        display:flex;
        min-width:0;
        align-items:center;
        gap:7px;
        margin:0;
        overflow:hidden;
        color:#334155;
        font-size:0!important;
        font-weight:800;
        white-space:nowrap;
      }
      html:not(.cloud-auth-gate) #cloudUser::before{
        overflow:hidden;
        content:attr(data-aua-display);
        font-size:10.5px;
        text-overflow:ellipsis;
      }
      html:not(.cloud-auth-gate) #cloudUser::after{
        flex:0 0 auto;
        content:'ONLINE';
        padding:3px 6px;
        border:1px solid #bbf7d0;
        border-radius:999px;
        background:#ecfdf3;
        color:#15803d;
        font-size:7.5px;
        font-weight:900;
        letter-spacing:.06em;
      }
      html:not(.cloud-auth-gate) #cloudRefresh,
      html:not(.cloud-auth-gate) #cloudExport,
      html:not(.cloud-auth-gate) #cloudSignOut{
        width:auto;
        min-height:30px;
        margin:0;
        padding:6px 9px;
        border-radius:8px;
        background:#fff;
        color:#475569;
        border:1px solid #d5dee9;
        box-shadow:none;
        font-size:9.5px;
        font-weight:750;
        white-space:nowrap;
      }
      html:not(.cloud-auth-gate) #cloudRefresh:hover,
      html:not(.cloud-auth-gate) #cloudExport:hover,
      html:not(.cloud-auth-gate) #cloudSignOut:hover{background:#f8fafc;border-color:#bdcad8;transform:none}
      html:not(.cloud-auth-gate) #cloudSignOut{color:#64748b}
      html:not(.cloud-auth-gate) #cloudStatus{
        margin:6px 0 0;
        padding:6px 8px;
        border-radius:8px;
        background:#f8fafc;
        font-size:9px;
        line-height:1.25;
      }
      html:not(.cloud-auth-gate) #cloudStatus.aua-cloud-quiet{display:none!important}
      html:not(.cloud-auth-gate) .aua-workspace-header{
        top:0;
        margin:0 -18px 14px;
        padding-top:13px;
      }
      @media(max-width:1120px){
        html:not(.cloud-auth-gate) .aua-workspace-header{margin:0 -16px 14px}
      }
      @media(max-width:620px){
        html:not(.cloud-auth-gate) #cloudSignedIn:not([hidden]){grid-template-columns:minmax(0,1fr) auto auto}
        html:not(.cloud-auth-gate) #cloudSignOut{grid-column:2/4;width:100%}
      }
      @media(max-width:520px){
        html:not(.cloud-auth-gate) #cloudPanel{padding:7px 8px;margin-bottom:9px}
        html:not(.cloud-auth-gate) #cloudUser::after{display:none}
        html:not(.cloud-auth-gate) #cloudRefresh,
        html:not(.cloud-auth-gate) #cloudExport,
        html:not(.cloud-auth-gate) #cloudSignOut{padding:6px 7px;font-size:9px}
        html:not(.cloud-auth-gate) .aua-workspace-header{margin:0 -11px 11px}
      }
      @media print{#cloudPanel{display:none!important}}
    `;
    document.head.appendChild(style);
  }

  function polishCloudBar(){
    const user=byId('cloudUser');
    const refresh=byId('cloudRefresh'),exportButton=byId('cloudExport'),signOut=byId('cloudSignOut');
    const status=byId('cloudStatus');
    if(!user||!refresh||!exportButton||!signOut||!status)return false;

    const raw=String(user.textContent||'').trim();
    user.dataset.auaDisplay=displayName(raw);
    refresh.textContent='Refresh';
    exportButton.textContent='Export JSON';
    signOut.textContent='Sign Out';

    const message=String(status.textContent||'').trim();
    const quiet=status.dataset.tone==='success'&&(/ready/i.test(message)||/saved online/i.test(message)||/loaded\s+\d+\s+online quotation/i.test(message));
    status.classList.toggle('aua-cloud-quiet',quiet);
    return true;
  }

  function installButtonRefreshes(){
    const panel=byId('cloudPanel');
    if(!panel||panel.dataset.auaCompactTopbarEvents)return;
    panel.dataset.auaCompactTopbarEvents='1';
    panel.addEventListener('click',()=>{
      setTimeout(polishCloudBar,80);
      setTimeout(polishCloudBar,900);
      setTimeout(polishCloudBar,2200);
    });
  }

  function install(attempt=0){
    ensureStyles();
    const ready=polishCloudBar();
    installButtonRefreshes();
    if(!ready&&attempt<20)setTimeout(()=>install(attempt+1),200);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>install(),{once:true});else install();
})();
