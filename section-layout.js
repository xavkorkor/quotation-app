// UI layout refinements for quotation sections.
(function(){
  let busy=false;

  function tidySection(sectionBody){
    if(!sectionBody) return;
    const nodes=[...sectionBody.children];
    const addBtn=nodes.find(el=>el.tagName==='BUTTON' && /\+\s*Item/i.test(el.textContent||''));
    const discountLabel=nodes.find(el=>el.classList?.contains('small') && /Section discount/i.test(el.textContent||''));
    if(addBtn && discountLabel && addBtn.previousElementSibling!==null){
      // Keep section discount as the final control in the section.
      sectionBody.insertBefore(addBtn,discountLabel);
      addBtn.style.marginTop='8px';
      addBtn.style.marginBottom='8px';
    }
  }

  function tidyRecent(){
    const editor=document.querySelector('.editor');
    const recent=document.querySelector('.recent-panel');
    if(editor&&recent&&editor.lastElementChild!==recent) editor.appendChild(recent);
  }

  function apply(){
    if(busy)return;
    busy=true;
    requestAnimationFrame(()=>{
      document.querySelectorAll('.section-body').forEach(tidySection);
      tidyRecent();
      busy=false;
    });
  }

  function install(){
    apply();
    const target=document.getElementById('sections')||document.body;
    new MutationObserver(apply).observe(target,{childList:true,subtree:true});
    new MutationObserver(tidyRecent).observe(document.querySelector('.editor')||document.body,{childList:true});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install);
  else install();
})();
