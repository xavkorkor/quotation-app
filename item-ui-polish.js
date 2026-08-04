// Alan's United Auto - compact per-item controls and panel ordering
(function(){
  const openItems=new WeakSet();

  function addStyles(){
    if(document.getElementById('auaItemPolishStyle'))return;
    const s=document.createElement('style');s.id='auaItemPolishStyle';s.textContent=`
      .item-main{grid-template-columns:88px minmax(0,1fr) 108px 38px 42px!important}
      .item-more-btn{width:42px;height:38px;padding:0!important;border:1px solid #d0d5dd!important;background:#f8fafc!important;color:#475569!important;font-size:17px!important;line-height:1!important}
      .item-more-btn.open{background:#e9eef5!important;color:#1e293b!important}
      .item-actions{display:none!important;padding:8px;margin-top:7px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc}
      .item.item-tools-open>.item-actions{display:flex!important}
      .item.item-tools-open>.item-disc{display:grid}
      .item:not(.item-tools-open)>.item-disc{display:none!important}
      @media(max-width:600px){.item-main{grid-template-columns:64px minmax(0,1fr) 82px 34px 38px!important}.item-more-btn{width:38px;height:36px}}
    `;document.head.appendChild(s);
  }

  function polish(){
    addStyles();
    const editor=document.querySelector('.editor'),recent=document.querySelector('.recent-panel');
    if(editor&&recent&&editor.lastElementChild!==recent)editor.appendChild(recent);
    document.querySelectorAll('.item').forEach(item=>{
      const main=item.querySelector(':scope > .item-main');if(!main)return;
      let b=main.querySelector('.item-more-btn');
      if(!b){b=document.createElement('button');b.type='button';b.className='btn item-more-btn';b.title='More item options';b.setAttribute('aria-label','More item options');b.innerHTML='⋮';main.appendChild(b);b.onclick=e=>{e.preventDefault();e.stopPropagation();const opening=!item.classList.contains('item-tools-open');document.querySelectorAll('.item.item-tools-open').forEach(x=>{if(x!==item)x.classList.remove('item-tools-open')});item.classList.toggle('item-tools-open',opening);b.classList.toggle('open',opening);b.innerHTML=opening?'▴':'⋮'}}
    });
  }

  function install(){
    polish();
    const target=document.getElementById('sections');if(target){new MutationObserver(()=>requestAnimationFrame(polish)).observe(target,{childList:true,subtree:true})}
    const editor=document.querySelector('.editor');if(editor)new MutationObserver(()=>requestAnimationFrame(polish)).observe(editor,{childList:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,80));else setTimeout(install,80);
})();