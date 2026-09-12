// History convenience: double-click a quotation row to open it using the existing Open Quotation path.
// Event-driven only; does not modify storage, saving, or History rendering logic.
(function(){
  let lastKey='';
  let lastClickAt=0;
  const DOUBLE_CLICK_MS=420;

  function rowForEvent(event){
    const target=event.target;
    if(!target||typeof target.closest!=='function')return null;
    const row=target.closest('.aua-history-row[data-aua-key]');
    const overlay=document.getElementById('auaHistoryOverlay');
    if(!row||!overlay||overlay.hidden||!overlay.contains(row))return null;
    return row;
  }

  function openSelectedAfterRowClick(key){
    setTimeout(()=>{
      const overlay=document.getElementById('auaHistoryOverlay');
      if(!overlay||overlay.hidden)return;
      const selected=overlay.querySelector('.aua-history-row.selected[data-aua-key]');
      if(!selected||String(selected.dataset.auaKey||'')!==String(key||''))return;
      const openButton=document.getElementById('auaHistoryOpen');
      if(openButton&&typeof openButton.click==='function')openButton.click();
    },0);
  }

  document.addEventListener('click',event=>{
    if(event.button!==0)return;
    const row=rowForEvent(event);
    if(!row)return;
    const key=String(row.dataset.auaKey||'');
    if(!key)return;
    const now=Date.now();
    const isDouble=key===lastKey&&(now-lastClickAt)<=DOUBLE_CLICK_MS;
    lastKey=key;
    lastClickAt=now;
    if(!isDouble)return;
    lastKey='';
    lastClickAt=0;
    openSelectedAfterRowClick(key);
  },true);
})();
