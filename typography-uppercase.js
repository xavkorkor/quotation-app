// Alan's United Auto - slightly larger text + safe uppercase typing.
// IMPORTANT: uppercase is visual/entry-only and must never call render/upd while the user is typing.
(function(){
  let busy=false;
  function injectStyle(){
    if(document.getElementById('auaTypographyStyles'))return;
    const s=document.createElement('style');s.id='auaTypographyStyles';s.textContent=`
      .editor input,.editor select,.editor textarea{font-size:14.5px}
      .item-main input{font-size:14.5px}
      .section-head input{font-size:14.5px;font-weight:700}
      .panel-title{font-size:11.5px}
      .small{font-size:11px}
      .line{font-size:11.2px;line-height:1.35}
      .sectitle{font-size:10.8px}
      .meta{font-size:12px}
      .summary-head,.summary-row,.adjust{font-size:10.5px}
      .totals{font-size:11.5px}
      .notes{font-size:10px}
      .item-main input[type="text"],.section-head input[type="text"],#customer,#vehicle,#model,#remarks{text-transform:uppercase}
    `;document.head.appendChild(s);
  }
  function isUpperField(el){
    if(!el)return false;
    const id=el.id||'';
    if(['phone','date','mileage','overallDisc'].includes(id))return false;
    if(el.type==='number'||el.type==='date'||el.type==='tel')return false;
    return el.matches('.item-main input[type="text"],.section-head input[type="text"],#customer,#vehicle,#model,#remarks');
  }
  function bind(el){
    if(!isUpperField(el)||el.dataset.auaUpperBound==='1')return;
    el.dataset.auaUpperBound='1';
    // Convert only when the field is finished. This avoids triggering the app's render cycle per keystroke.
    el.addEventListener('change',()=>{
      const up=String(el.value||'').toUpperCase();
      if(el.value!==up)el.value=up;
    });
    el.addEventListener('blur',()=>{
      const up=String(el.value||'').toUpperCase();
      if(el.value!==up){el.value=up;el.dispatchEvent(new Event('change',{bubbles:true}))}
    });
  }
  function bindAll(){document.querySelectorAll('.editor input,.editor textarea').forEach(bind)}
  function apply(){if(busy)return;busy=true;requestAnimationFrame(()=>{bindAll();busy=false})}
  function install(){
    injectStyle();bindAll();
    const target=document.querySelector('.editor')||document.body;
    new MutationObserver(apply).observe(target,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,320));else setTimeout(install,320);
})();