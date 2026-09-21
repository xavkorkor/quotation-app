// Workspace navigation is UI-only. It never changes quotation data or save/PDF actions.
(function(){
  const destinations=[
    ['Customer','.customer-panel'],
    ['Items','.sections-panel'],
    ['Remarks','.remarks-panel']
  ];

  function addStyles(){
    if(document.getElementById('auaWorkspaceV46Styles'))return;
    const style=document.createElement('style');
    style.id='auaWorkspaceV46Styles';
    style.textContent=`
      html:not(.cloud-auth-gate) .aua-workspace-main{align-items:center;flex-wrap:wrap;gap:7px 10px}
      html:not(.cloud-auth-gate) .aua-quick-jump{display:flex;align-items:center;flex-wrap:wrap;gap:5px;margin-left:auto}
      html:not(.cloud-auth-gate) .aua-quick-jump button{min-height:29px;padding:5px 9px;border:1px solid #d6e0ec;border-radius:8px;background:#fff;color:#425673;font:750 10px/1.2 inherit;cursor:pointer;white-space:nowrap}
      html:not(.cloud-auth-gate) .aua-quick-jump button:hover{background:#eff6ff;border-color:#adc9f2;color:#1d4ed8}
      html:not(.cloud-auth-gate) .aua-quick-jump button:focus-visible{outline:3px solid rgba(37,99,235,.25);outline-offset:2px}
      html:not(.cloud-auth-gate) .customer-panel,
      html:not(.cloud-auth-gate) .sections-panel,
      html:not(.cloud-auth-gate) .remarks-panel{scroll-margin-top:140px}
      html:not(.cloud-auth-gate) .sections-panel .section-card:focus-within{border-color:#99bdf4;box-shadow:0 0 0 2px rgba(37,99,235,.09)}
      @media(min-width:1121px){html:not(.cloud-auth-gate) .app{grid-template-columns:minmax(600px,min(48vw,710px)) minmax(0,1fr)}}
      @media(max-width:620px){
        html:not(.cloud-auth-gate) .aua-quick-jump{width:100%;margin-left:0}
        html:not(.cloud-auth-gate) .aua-quick-jump button{flex:1}
        html:not(.cloud-auth-gate) .sections-panel .aua-sections-topbar{flex-wrap:wrap}
        html:not(.cloud-auth-gate) .sections-panel .aua-sections-topbar>.panel-title{flex:1 0 100%}
      }
      @media(max-width:520px){
        html:not(.cloud-auth-gate) .aua-workspace-actions{grid-template-columns:repeat(6,minmax(0,1fr))}
        html:not(.cloud-auth-gate) .aua-workspace-actions .btn{grid-column:span 2;min-width:0}
        html:not(.cloud-auth-gate) .aua-workspace-actions .aua-workspace-new,
        html:not(.cloud-auth-gate) .aua-workspace-actions .aua-workspace-save{grid-column:span 3}
        html:not(.cloud-auth-gate) .customer-panel .grid{grid-template-columns:repeat(2,minmax(0,1fr))}
      }
      @media(max-width:370px){html:not(.cloud-auth-gate) .customer-panel .grid{grid-template-columns:1fr}}
      @media print{.aua-quick-jump{display:none!important}}
    `;
    document.head.appendChild(style);
  }

  function install(){
    const header=document.getElementById('auaWorkspaceHeader');
    const main=header?.querySelector('.aua-workspace-main');
    if(!main||document.getElementById('auaQuickJump'))return;
    addStyles();
    const nav=document.createElement('nav');
    nav.id='auaQuickJump';
    nav.className='aua-quick-jump';
    nav.setAttribute('aria-label','Jump to quotation section');
    for(const [label,selector] of destinations){
      const button=document.createElement('button');
      button.type='button';
      button.textContent=label;
      button.title=`Jump to ${label}`;
      button.addEventListener('click',()=>{
        const target=document.querySelector(selector);
        if(!target)return;
        const reduceMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
        target.scrollIntoView({behavior:reduceMotion?'auto':'smooth',block:'start'});
      });
      nav.appendChild(button);
    }
    main.appendChild(nav);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();