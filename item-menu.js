// Alan's United Auto - compact per-item options menu.
// Keeps the main item row clean; additional item functions are collapsed by default.
(function(){
  let busy=false;

  function injectStyle(){
    if(document.getElementById('auaItemMenuStyles')) return;
    const s=document.createElement('style');
    s.id='auaItemMenuStyles';
    s.textContent=`
      .aua-item-options{position:relative;margin-top:7px}
      .aua-item-options>summary{list-style:none;cursor:pointer;display:inline-flex;align-items:center;gap:6px;min-height:30px;padding:5px 10px;border:1px solid #d0d5dd;border-radius:8px;background:#f8fafc;color:#475569;font-size:10.5px;font-weight:700;user-select:none}
      .aua-item-options>summary::-webkit-details-marker{display:none}
      .aua-item-options>summary:hover{background:#eef2f7}
      .aua-item-options[open]>summary{background:#e9eef5;color:#334155}
      .aua-item-options .item-actions{display:flex!important;gap:7px;align-items:center;flex-wrap:wrap;margin-top:7px;padding:8px;border:1px solid #e2e8f0;border-radius:9px;background:#f8fafc}
      .aua-item-options .item-actions .btn{padding:6px 9px;font-size:10.5px}
      .aua-item-options .item-actions select{width:auto;min-width:125px;padding:6px 7px;font-size:10.5px}
      @media(max-width:600px){.aua-item-options .item-actions{display:grid!important;grid-template-columns:1fr 1fr}.aua-item-options .item-actions select{width:100%;grid-column:1/-1}}
    `;
    document.head.appendChild(s);
  }

  function decorateItem(row){
    if(!row || row.querySelector(':scope > .aua-item-options')) return;
    const actions=row.querySelector(':scope > .item-actions');
    if(!actions) return;

    // Remove any legacy Hide/Show Item control if an older cached script inserted one.
    actions.querySelectorAll('.aua-hide-btn').forEach(b=>b.remove());
    row.classList.remove('aua-hidden-item');
    row.querySelectorAll('.aua-hidden-badge').forEach(b=>b.remove());

    const menu=document.createElement('details');
    menu.className='aua-item-options';
    // Important: no "open" attribute — all per-item extras start collapsed.
    const summary=document.createElement('summary');
    summary.innerHTML='<span>More</span><span aria-hidden="true">▾</span>';
    summary.title='Item options';
    row.insertBefore(menu,actions);
    menu.appendChild(summary);
    menu.appendChild(actions);
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
