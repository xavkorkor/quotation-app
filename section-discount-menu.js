// Alan's United Auto - keep section discount hidden inside the section ⋮ menu.
(function(){
  let busy=false;

  function injectStyle(){
    if(document.getElementById('auaSectionDiscountMenuStyles')) return;
    const s=document.createElement('style');
    s.id='auaSectionDiscountMenuStyles';
    s.textContent=`
      .section-menu-pop .aua-section-discount-wrap{border-top:1px solid #e2e8f0;margin-top:4px;padding-top:8px}
      .section-menu-pop .aua-section-discount-label{font-size:10.5px;font-weight:800;color:#475569;margin-bottom:6px;text-transform:uppercase}
      .section-menu-pop .aua-section-discount-wrap .disc{display:grid;grid-template-columns:64px minmax(110px,1fr);gap:7px;margin-top:0}
      .section-menu-pop .aua-section-discount-wrap select,.section-menu-pop .aua-section-discount-wrap input{font-size:12px;padding:7px}
    `;
    document.head.appendChild(s);
  }

  function moveDiscount(card){
    if(!card) return;
    const body=card.querySelector(':scope > .section-body');
    const pop=card.querySelector('.section-head .section-menu-pop');
    if(!body||!pop||pop.querySelector('.aua-section-discount-wrap')) return;

    const children=[...body.children];
    const label=children.find(el=>el.classList?.contains('small') && /section discount/i.test(el.textContent||''));
    if(!label) return;
    const disc=label.nextElementSibling;
    if(!disc || !disc.classList.contains('disc')) return;

    const wrap=document.createElement('div');
    wrap.className='aua-section-discount-wrap';
    const title=document.createElement('div');
    title.className='aua-section-discount-label';
    title.textContent='Section Discount — Optional';
    wrap.appendChild(title);
    wrap.appendChild(disc);
    pop.appendChild(wrap);
    label.remove();
  }

  function apply(){
    if(busy) return;
    busy=true;
    requestAnimationFrame(()=>{
      document.querySelectorAll('.section-card').forEach(moveDiscount);
      busy=false;
    });
  }

  function install(){
    injectStyle();
    apply();
    const target=document.getElementById('sections')||document.body;
    new MutationObserver(apply).observe(target,{childList:true,subtree:true});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(install,360));
  else setTimeout(install,360);
})();