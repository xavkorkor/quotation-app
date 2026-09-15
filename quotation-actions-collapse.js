// Compact quotation controls: move Add Section into the quotation section header and collapse bottom actions by default.
(function(){
  const byId=id=>document.getElementById(id);

  function addStyles(){
    if(byId('auaQuotationActionsCollapseStyles'))return;
    const style=document.createElement('style');
    style.id='auaQuotationActionsCollapseStyles';
    style.textContent=`
      html:not(.cloud-auth-gate) .sections-panel .aua-sections-topbar{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:10px;
        margin-bottom:11px;
      }
      html:not(.cloud-auth-gate) .sections-panel .aua-sections-topbar>.panel-title{margin:0!important}
      html:not(.cloud-auth-gate) #auaAddSectionTop{
        flex:0 0 auto;
        min-height:34px;
        padding:7px 11px;
        border:1px solid #bfdbfe;
        background:#eff6ff;
        color:#1d4ed8;
        font-size:10.5px;
        font-weight:800;
      }
      html:not(.cloud-auth-gate) #auaAddSectionTop:hover{background:#dbeafe}
      html:not(.cloud-auth-gate) .action-panel.aua-actions-collapsed{
        padding:10px!important;
        background:transparent!important;
        border-color:transparent!important;
        box-shadow:none!important;
      }
      html:not(.cloud-auth-gate) .action-panel.aua-actions-collapsed.aua-actions-open{
        padding:14px!important;
        background:#f9fbfd!important;
        border-color:#d8e2ec!important;
      }
      .aua-actions-body[hidden]{display:none!important}
      html:not(.cloud-auth-gate) #auaActionToggle{
        width:100%;
        min-height:42px;
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:10px;
        padding:9px 12px;
        border:1px solid #cbd5e1;
        border-radius:9px;
        background:#fff;
        color:#334155;
        font-size:11px;
        font-weight:850;
        cursor:pointer;
      }
      html:not(.cloud-auth-gate) #auaActionToggle:hover{background:#f8fafc}
      html:not(.cloud-auth-gate) .action-panel.aua-actions-open #auaActionToggle{
        margin-bottom:10px;
        background:#eef4fa;
        color:#183b63;
      }
      .aua-action-chevron{font-size:15px;line-height:1;transition:transform .16s ease}
      .action-panel.aua-actions-open .aua-action-chevron{transform:rotate(180deg)}
      .aua-actions-body>.toolbar:first-child{margin-top:0}
      @media(max-width:520px){
        html:not(.cloud-auth-gate) .sections-panel .aua-sections-topbar{align-items:stretch}
        html:not(.cloud-auth-gate) #auaAddSectionTop{min-height:32px;padding:6px 9px;font-size:10px}
      }
    `;
    document.head.appendChild(style);
  }

  function moveAddSection(){
    const sectionsPanel=document.querySelector('.sections-panel');
    if(!sectionsPanel)return false;
    let topbar=sectionsPanel.querySelector(':scope > .aua-sections-topbar');
    let title=topbar?.querySelector(':scope > .panel-title')||sectionsPanel.querySelector(':scope > .panel-title');
    if(!title)return false;

    if(!topbar){
      topbar=document.createElement('div');
      topbar.className='aua-sections-topbar';
      sectionsPanel.insertBefore(topbar,title);
      topbar.appendChild(title);
    }

    if(!byId('auaAddSectionTop')){
      const addButton=document.querySelector('.action-panel button[onclick*="addSection"]');
      if(!addButton)return false;
      addButton.id='auaAddSectionTop';
      addButton.classList.remove('secondary');
      addButton.classList.add('outline');
      addButton.textContent='＋ Add Section';
      topbar.appendChild(addButton);
    }
    return true;
  }

  function collapseActions(){
    const panel=document.querySelector('.action-panel');
    if(!panel)return false;
    if(byId('auaActionToggle')&&byId('auaActionsBody'))return true;

    const toggle=document.createElement('button');
    toggle.id='auaActionToggle';
    toggle.type='button';
    toggle.setAttribute('aria-expanded','false');
    toggle.innerHTML='<span>Quotation Actions</span><span class="aua-action-chevron">⌄</span>';

    const body=document.createElement('div');
    body.id='auaActionsBody';
    body.className='aua-actions-body';
    body.hidden=true;

    [...panel.children].forEach(child=>{
      if(child.classList.contains('panel-title'))child.remove();
      else body.appendChild(child);
    });
    panel.append(toggle,body);
    panel.classList.add('aua-actions-collapsed');

    toggle.onclick=()=>{
      const open=!panel.classList.contains('aua-actions-open');
      panel.classList.toggle('aua-actions-open',open);
      body.hidden=!open;
      toggle.setAttribute('aria-expanded',String(open));
    };

    // Keep anything later appended by validation/audit modules inside the collapsible body.
    new MutationObserver(records=>{
      records.forEach(record=>record.addedNodes.forEach(node=>{
        if(node.nodeType!==1||node===toggle||node===body||node.parentElement!==panel)return;
        if(node.classList?.contains('panel-title'))node.remove();
        else body.appendChild(node);
      }));
    }).observe(panel,{childList:true});

    return true;
  }

  function tidyOldToolbar(){
    const body=byId('auaActionsBody');
    body?.querySelectorAll(':scope > .toolbar').forEach(toolbar=>{
      if(!toolbar.children.length)toolbar.remove();
    });
  }

  function install(attempt=0){
    addStyles();
    const moved=moveAddSection();
    const collapsed=collapseActions();
    tidyOldToolbar();
    if((!moved||!collapsed)&&attempt<20)setTimeout(()=>install(attempt+1),150);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>install(),60),{once:true});
  else setTimeout(()=>install(),60);
})();
