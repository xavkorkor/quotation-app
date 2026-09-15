// Automatically choose the sensible default for Section Summary based on section count.
(function(){
  let lastCount=null;
  let queued=false;

  function sectionCount(){
    try{
      if(typeof S!=='undefined'&&Array.isArray(S))return S.length;
    }catch{}
    return document.querySelectorAll('#sections > .section-card').length;
  }

  function sync(force=false){
    queued=false;
    const box=document.getElementById('summaryOn');
    if(!box)return;
    const count=Math.max(0,sectionCount());

    // Only change the checkbox when the number of sections changes (or on first load).
    // This gives the requested automatic default while still allowing a manual override
    // until the section count changes again.
    if(!force&&lastCount===count)return;
    lastCount=count;

    const shouldCheck=count>1;
    if(box.checked!==shouldCheck){
      box.checked=shouldCheck;
      try{if(typeof upd==='function')upd()}catch{}
      box.dispatchEvent(new Event('change',{bubbles:true}));
    }
  }

  function queue(force=false){
    if(queued&&!force)return;
    queued=true;
    requestAnimationFrame(()=>sync(force));
  }

  function install(){
    const box=document.getElementById('summaryOn');
    const sections=document.getElementById('sections');
    if(!box||!sections){setTimeout(install,150);return}

    sync(true);
    new MutationObserver(()=>queue(false)).observe(sections,{childList:true,subtree:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,80),{once:true});
  else setTimeout(install,80);
})();
