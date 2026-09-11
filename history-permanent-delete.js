// Restore a deliberate, permanent delete action alongside recoverable Archive/Restore.
(function(){
  const byId=id=>document.getElementById(id);
  function records(){try{return typeof getRecent==='function'?(getRecent()||[]):[]}catch{return[]}}

  async function deleteSelected(key,button){
    const list=records(),index=list.findIndex(record=>String(record?.key||'')===String(key||''));
    const sourceButton=index>=0?document.querySelector(`[data-cloud-delete="${index}"]`):null;
    if(!sourceButton?.onclick){alert('Permanent delete is unavailable until shared records finish loading. Press Refresh and try again.');return}
    button.disabled=true;
    try{
      await sourceButton.onclick();
      byId('auaHistoryRefresh')?.click();
    }finally{
      button.disabled=false;
    }
  }

  function ensureButton(){
    const overlay=byId('auaHistoryOverlay');
    if(!overlay||overlay.hidden)return;
    const selected=overlay.querySelector('.aua-history-row.selected[data-aua-key]');
    const actions=document.querySelector('#auaHistoryPreview .aua-history-actions');
    const old=byId('auaHistoryPermanentDelete');
    if(!selected||!actions){old?.remove();return}
    let button=old;
    if(!button){
      button=document.createElement('button');
      button.id='auaHistoryPermanentDelete';
      button.type='button';
      button.className='btn outline aua-history-delete wide';
      button.textContent='Permanent Delete';
      actions.appendChild(button);
    }
    button.onclick=event=>{event.stopPropagation();deleteSelected(selected.dataset.auaKey,button)};
  }

  function install(){
    if(!byId('auaPermanentDeleteStyles')){
      const style=document.createElement('style');
      style.id='auaPermanentDeleteStyles';
      style.textContent='#auaHistoryPermanentDelete{margin-top:2px;background:#fff7f7!important;border-color:#fecaca!important;color:#b42318!important}#auaHistoryPermanentDelete:hover{background:#fef2f2!important}';
      document.head.appendChild(style);
    }
    document.addEventListener('aua-history-updated',ensureButton);
    byId('auaHistoryList')?.addEventListener('click',()=>requestAnimationFrame(ensureButton));
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
