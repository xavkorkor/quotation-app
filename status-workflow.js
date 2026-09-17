// Expanded quotation status workflow without rebuilding the production bundle.
(function(){
  const STATUS=['Draft','Sent','Approved','Job In Progress','Completed','Cancelled'];
  const PROGRESS=['Draft','Sent','Approved','Job In Progress','Completed'];
  const $=id=>document.getElementById(id);
  let managedStatus='Draft',installed=false;
  const clone=value=>{try{return JSON.parse(JSON.stringify(value))}catch{return value}};

  function ensureOption(){
    const select=$('auaQuoteStatus');if(!select)return false;
    if(!Array.from(select.options).some(o=>o.value==='Job In Progress')){
      const completed=Array.from(select.options).find(o=>o.value==='Completed');
      const option=new Option('Job In Progress','Job In Progress');
      select.insertBefore(option,completed||null);
    }
    return true;
  }

  function applyStatus(value,{dispatch=false}={}){
    managedStatus=STATUS.includes(value)?value:'Draft';
    const select=$('auaQuoteStatus');if(select){
      ensureOption();
      if(select.value!==managedStatus)select.value=managedStatus;
      if(dispatch)select.dispatchEvent(new Event('change',{bubbles:true}));
    }
    syncProgressUi();
    window.auaSyncWorkspaceHeader?.();
  }

  function syncProgressUi(){
    const select=$('auaQuoteStatus'),button=$('auaStatusNext'),hint=$('auaStatusHint');if(!select)return;
    const current=STATUS.includes(select.value)?select.value:managedStatus;
    managedStatus=current;
    const index=PROGRESS.indexOf(current),next=index>=0&&index<PROGRESS.length-1?PROGRESS[index+1]:'';
    if(button){button.hidden=!next;button.textContent=next?`Next: ${next}`:'Workflow Complete'}
    if(hint)hint.textContent=current==='Cancelled'?'Cancelled quotation':next?`${current} → ${next}`:'Completed';
  }

  function ensureUi(){
    const select=$('auaQuoteStatus');if(!select)return false;ensureOption();
    if(!select.dataset.auaExpandedStatus){
      select.dataset.auaExpandedStatus='1';
      select.addEventListener('change',()=>{managedStatus=STATUS.includes(select.value)?select.value:'Draft';syncProgressUi()});
    }
    const holder=select.parentElement;
    if(holder&&!$('auaStatusWorkflow')){
      const row=document.createElement('div');row.id='auaStatusWorkflow';row.style.cssText='display:flex;align-items:center;gap:7px;margin-top:6px';
      row.innerHTML='<span id="auaStatusHint" style="flex:1;font-size:9px;color:#64748b"></span><button id="auaStatusNext" class="btn outline" type="button" style="min-height:30px;padding:5px 8px;font-size:9px"></button>';
      holder.appendChild(row);
      $('auaStatusNext').onclick=()=>{const current=$('auaQuoteStatus')?.value||managedStatus,index=PROGRESS.indexOf(current);if(index<0||index>=PROGRESS.length-1)return;applyStatus(PROGRESS[index+1],{dispatch:true})};
    }
    syncProgressUi();return true;
  }

  function installHooks(){
    if(installed)return true;
    if(typeof window.state!=='function'||typeof window.loadRecord!=='function'||typeof window.newQuote!=='function'||typeof window.duplicateQuote!=='function')return false;
    installed=true;
    const baseState=window.state,baseLoad=window.loadRecord,baseNew=window.newQuote,baseDuplicate=window.duplicateQuote;
    managedStatus=STATUS.includes($('auaQuoteStatus')?.value)?$('auaQuoteStatus').value:'Draft';

    function wrappedState(){const data=baseState.apply(this,arguments);data.status=managedStatus;return data}
    wrappedState.__auaQuoteWorkflow=true;wrappedState.__auaExpandedStatus=true;window.state=wrappedState;

    window.loadRecord=function(data){
      const wanted=STATUS.includes(data?.status)?data.status:'Draft',copy=clone(data||{});
      managedStatus=wanted;
      if(wanted==='Job In Progress')copy.status='Approved';
      const result=baseLoad.call(this,copy);
      setTimeout(()=>applyStatus(wanted,{dispatch:wanted==='Job In Progress'}),20);
      return result;
    };
    window.loadRecord.__auaExpandedStatus=true;

    window.newQuote=function(){managedStatus='Draft';const result=baseNew.apply(this,arguments);setTimeout(()=>applyStatus('Draft'),20);return result};
    window.duplicateQuote=function(){managedStatus='Draft';const result=baseDuplicate.apply(this,arguments);setTimeout(()=>applyStatus('Draft'),20);return result};
    return true;
  }

  function install(attempt=0){
    const ui=ensureUi(),hooks=installHooks();
    if(ui&&hooks){applyStatus(managedStatus);return}
    if(attempt<40)setTimeout(()=>install(attempt+1),100);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>install(),{once:true});else install();
})();
