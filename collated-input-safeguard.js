// Safety net: keep the Paste / Import Collated List input visible even if another UI enhancement rerenders nearby panels.
(function(){
  function ensure(){
    const panel=document.getElementById('collatedPanel');
    if(panel){
      let ta=document.getElementById('collatedText');
      if(!ta){
        ta=document.createElement('textarea');
        ta.id='collatedText';
        ta.rows=9;
        ta.placeholder='Paste repair list here';
        ta.style.cssText='display:block;width:100%;min-height:190px;box-sizing:border-box;resize:vertical;padding:10px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;color:#111827;margin-top:4px';
        const title=panel.querySelector('.panel-title');
        if(title) title.insertAdjacentElement('afterend',ta); else panel.prepend(ta);
      } else {
        ta.style.display='block';
        ta.style.width='100%';
        ta.style.minHeight='190px';
        ta.style.visibility='visible';
        ta.style.opacity='1';
      }
      return;
    }
    const settings=document.querySelector('.settings-panel');
    if(!settings)return;
    const p=document.createElement('div');
    p.id='collatedPanel';p.className='panel';p.style.borderLeft='4px solid #2563eb';
    p.innerHTML='<div class="panel-title" style="color:#1d4ed8">PASTE / IMPORT COLLATED LIST</div><textarea id="collatedText" rows="9" placeholder="Paste repair list here" style="display:block;width:100%;min-height:190px;box-sizing:border-box;resize:vertical;padding:10px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;color:#111827"></textarea>';
    settings.parentNode.insertBefore(p,settings);
  }
  function install(){ensure();setTimeout(ensure,400);setTimeout(ensure,1200);const editor=document.querySelector('.editor');if(editor)new MutationObserver(()=>requestAnimationFrame(ensure)).observe(editor,{childList:true,subtree:true})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();