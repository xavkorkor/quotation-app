// Alan's United Auto - compact per-item options menu.
// Triple-dot button sits beside delete; additional item functions stay collapsed by default.
(function(){
  let busy=false;

  function injectStyle(){
    if(document.getElementById('auaItemMenuStyles')) return;
    const s=document.createElement('style');
    s.id='auaItemMenuStyles';
    s.textContent=`
      .item-main{grid-template-columns:88px minmax(0,1fr) 108px 38px 38px!important;position:relative}
      .aua-item-options{position:relative;margin:0;width:38px;height:38px;align-self:center}
      .aua-item-options>summary{list-style:none;cursor:pointer;width:38px;height:38px;padding:0;border:1px solid #d0d5dd;border-radius:8px;background:#f8fafc;color:#475569;font-size:20px;font-weight:800;line-height:1;display:grid;place-items:center;user-select:none}
      .aua-item-options>summary::-webkit-details-marker{display:none}
      .aua-item-options>summary:hover,.aua-item-options[open]>summary{background:#e9eef5;color:#334155}
      .aua-item-options .item-actions{position:absolute;right:0;top:43px;z-index:40;min-width:285px;display:flex!important;gap:7px;align-items:center;flex-wrap:wrap;margin:0;padding:8px;border:1px solid #d0d5dd;border-radius:9px;background:#fff;box-shadow:0 10px 24px rgba(15,23,42,.16)}
      .aua-item-options .item-actions .btn{padding:7px 9px;font-size:10.5px}
      .aua-item-options .item-actions select{width:auto;min-width:125px;padding:6px 7px;font-size:10.5px}
      @media(max-width:600px){
        .item-main{grid-template-columns:64px minmax(0,1fr) 82px 34px 34px!important}
        .aua-item-options,.aua-item-options>summary{width:34px;height:34px}
        .aua-item-options .item-actions{right:0;min-width:245px;display:grid!important;grid-template-columns:1fr 1fr}
        .aua-item-options .item-actions select{width:100%;grid-column:1/-1}
      }
    `;
    document.head.appendChild(s);
  }

  function decorateItem(row){
    if(!row) return;
    const main=row.querySelector(':scope > .item-main');
    if(!main || main.querySelector(':scope > .aua-item-options')) return;
    const actions=row.querySelector(':scope > .item-actions');
    if(!actions) return;

    // Remove legacy Hide/Show controls completely.
    actions.querySelectorAll('.aua-hide-btn').forEach(b=>b.remove());
    row.classList.remove('aua-hidden-item');
    row.querySelectorAll('.aua-hidden-badge').forEach(b=>b.remove());

    const menu=document.createElement('details');
    menu.className='aua-item-options';
    const summary=document.createElement('summary');
    summary.textContent='⋮';
    summary.title='Item options';
    summary.setAttribute('aria-label','Item options');
    menu.appendChild(summary);
    menu.appendChild(actions);
    main.appendChild(menu);
  }

  function apply(){
    if(busy) return;
    busy=true;
    requestAnimationFrame(()=>{
      document.querySelectorAll('.section-card .item').forEach(decorateItem);
      busy=false;
    });
  }

  function install(){
    injectStyle();
    apply();
    const target=document.getElementById('sections')||document.body;
    new MutationObserver(apply).observe(target,{childList:true,subtree:true});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(install,220));
  else setTimeout(install,220);
})();
