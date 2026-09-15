// Dedicated item drag/drop reordering without restoring the removed legacy workflow module.
(function(){
  let dragSource=null;
  let dropRow=null;
  let dropPosition='before';
  let applying=false;

  function keyFor(row){
    const field=row?.querySelector?.('[data-desc],[data-qty]');
    const raw=field?.dataset?.desc||field?.dataset?.qty||'';
    const match=String(raw).match(/^(\d+)-(\d+)$/);
    return match?{si:Number(match[1]),ii:Number(match[2])}:null;
  }

  function injectStyles(){
    if(document.getElementById('auaItemDragStyles'))return;
    const style=document.createElement('style');
    style.id='auaItemDragStyles';
    style.textContent=`
      #sections .item{position:relative;padding-left:29px!important}
      .aua-item-drag-handle{position:absolute;left:6px;top:11px;width:17px;height:32px;display:grid;place-items:center;border:1px solid #d0d5dd;border-radius:6px;background:#f8fafc;color:#64748b;font-size:13px;font-weight:900;line-height:1;cursor:grab;user-select:none;z-index:3}
      .aua-item-drag-handle:hover{background:#e9eef5;color:#334155;border-color:#b8c2cf}
      .aua-item-drag-handle:active{cursor:grabbing}
      #sections .item.aua-drag-source{opacity:.42}
      #sections .item.aua-drop-before{box-shadow:inset 0 3px 0 #2563eb}
      #sections .item.aua-drop-after{box-shadow:inset 0 -3px 0 #2563eb}
      @media(max-width:600px){#sections .item{padding-left:27px!important}.aua-item-drag-handle{left:5px;top:9px;width:16px;height:30px;font-size:12px}}
    `;
    document.head.appendChild(style);
  }

  function decorate(row){
    const key=keyFor(row);
    if(!key)return;
    row.dataset.auaDragSection=String(key.si);
    row.dataset.auaDragItem=String(key.ii);
    if(row.querySelector(':scope > .aua-item-drag-handle'))return;
    const handle=document.createElement('span');
    handle.className='aua-item-drag-handle';
    handle.textContent='⋮⋮';
    handle.title='Drag to reorder item';
    handle.setAttribute('aria-label','Drag to reorder item');
    handle.setAttribute('role','button');
    handle.setAttribute('draggable','true');
    row.appendChild(handle);
  }

  function apply(){
    if(applying)return;
    applying=true;
    requestAnimationFrame(()=>{
      document.querySelectorAll('#sections .section-card .item').forEach(decorate);
      applying=false;
    });
  }

  function clearDropIndicators(){
    if(dropRow){dropRow.classList.remove('aua-drop-before','aua-drop-after');dropRow=null}
  }

  function cleanup(){
    clearDropIndicators();
    document.querySelectorAll('#sections .aua-drag-source').forEach(el=>el.classList.remove('aua-drag-source'));
    dragSource=null;
  }

  function moveDraggedItem(target,position){
    if(!dragSource||!target)return;
    if(typeof S==='undefined'||typeof render!=='function'||typeof upd!=='function')return;
    const fromSection=S[dragSource.si],toSection=S[target.si];
    const moving=fromSection?.items?.[dragSource.ii];
    if(!fromSection||!toSection||!moving)return;

    let insertAt=target.ii+(position==='after'?1:0);
    fromSection.items.splice(dragSource.ii,1);

    if(dragSource.si===target.si){
      if(dragSource.ii<insertAt)insertAt--;
      insertAt=Math.max(0,Math.min(insertAt,fromSection.items.length));
      fromSection.items.splice(insertAt,0,moving);
    }else{
      insertAt=Math.max(0,Math.min(insertAt,toSection.items.length));
      toSection.items.splice(insertAt,0,moving);
      if(!fromSection.items.length){
        fromSection.items.push(typeof item==='function'?item():{q:'1 pc',d:'',p:'',dt:'percent',dv:'',open:false,included:false});
      }
      toSection.collapsed=false;
    }

    if(typeof activeItem!=='undefined')activeItem={i:target.si,j:insertAt};
    render();
    upd();
  }

  function install(){
    injectStyles();
    const root=document.getElementById('sections');
    if(!root){setTimeout(install,200);return}
    if(root.dataset.auaDragInstalled==='1')return;
    root.dataset.auaDragInstalled='1';
    apply();

    root.addEventListener('dragstart',event=>{
      const handle=event.target?.closest?.('.aua-item-drag-handle');
      if(!handle||!root.contains(handle))return;
      const row=handle.closest('.item'),key=keyFor(row);
      if(!row||!key)return;
      dragSource=key;
      row.classList.add('aua-drag-source');
      if(event.dataTransfer){
        event.dataTransfer.effectAllowed='move';
        event.dataTransfer.setData('text/plain',`${key.si}:${key.ii}`);
      }
    });

    root.addEventListener('dragover',event=>{
      if(!dragSource)return;
      const row=event.target?.closest?.('.item');
      if(!row||!root.contains(row))return;
      event.preventDefault();
      if(event.dataTransfer)event.dataTransfer.dropEffect='move';
      if(dropRow!==row)clearDropIndicators();
      dropRow=row;
      const rect=row.getBoundingClientRect();
      dropPosition=event.clientY>rect.top+rect.height/2?'after':'before';
      row.classList.toggle('aua-drop-before',dropPosition==='before');
      row.classList.toggle('aua-drop-after',dropPosition==='after');
    });

    root.addEventListener('drop',event=>{
      if(!dragSource)return;
      const row=event.target?.closest?.('.item');
      if(!row||!root.contains(row)){cleanup();return}
      event.preventDefault();
      const target=keyFor(row);
      moveDraggedItem(target,dropPosition);
      cleanup();
    });

    root.addEventListener('dragend',cleanup);
    new MutationObserver(apply).observe(root,{childList:true,subtree:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,80),{once:true});
  else setTimeout(install,80);
})();
