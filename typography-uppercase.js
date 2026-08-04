// Alan's United Auto - slightly larger quotation/editor text and uppercase entry defaults.
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
    `;document.head.appendChild(s);
  }
  function upperValue(el){
    if(!el || el.dataset.auaUpperBound==='1')return;
    const id=el.id||'';
    if(['phone','date','mileage','overallDisc'].includes(id))return;
    if(el.type==='number'||el.type==='date'||el.type==='tel')return;
    el.dataset.auaUpperBound='1';
    el.addEventListener('input',()=>{
      const a=el.selectionStart,b=el.selectionEnd;
      const up=el.value.toUpperCase();
      if(el.value!==up){el.value=up;try{el.setSelectionRange(a,b)}catch{};el.dispatchEvent(new Event('change',{bubbles:true}))}
    });
  }
  function uppercaseModel(){
    try{
      if(window.S) S.forEach(sec=>{sec.title=String(sec.title||'').toUpperCase();sec.items.forEach(x=>x.d=String(x.d||'').toUpperCase())});
      ['customer','vehicle','model','remarks'].forEach(id=>{const e=document.getElementById(id);if(e)e.value=e.value.toUpperCase()});
    }catch{}
  }
  function bindAll(){
    document.querySelectorAll('.editor input[type="text"],.editor input:not([type]),.editor textarea').forEach(upperValue);
  }
  function patchRender(){
    if(window.__auaUpperPatched)return;window.__auaUpperPatched=true;
    if(typeof window.render==='function'){const old=window.render;window.render=function(){uppercaseModel();const r=old.apply(this,arguments);setTimeout(bindAll,0);return r}}
    if(typeof window.upd==='function'){const old=window.upd;window.upd=function(){uppercaseModel();return old.apply(this,arguments)}}
  }
  function apply(){if(busy)return;busy=true;requestAnimationFrame(()=>{bindAll();busy=false})}
  function install(){injectStyle();patchRender();uppercaseModel();bindAll();const target=document.querySelector('.editor')||document.body;new MutationObserver(apply).observe(target,{childList:true,subtree:true})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,320));else setTimeout(install,320);
})();
