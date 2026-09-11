// Reliable quotation-number search for History. Keeps normal text search unchanged.
(function(){
  const byId=id=>document.getElementById(id);
  const compact=value=>String(value||'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const digits=value=>String(value||'').replace(/\D/g,'');
  const esc=value=>String(value??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const money=value=>Number(value||0).toLocaleString('en-SG',{minimumFractionDigits:2,maximumFractionDigits:2});

  function records(){
    try{return typeof getRecent==='function'?(getRecent()||[]):[]}catch{return[]}
  }

  function isQuoteQuery(query){
    const q=compact(query),n=digits(query);
    return q.startsWith('aua')||n.length>=10;
  }

  function quoteMatches(query){
    if(!isQuoteQuery(query))return[];
    const qCompact=compact(query),qDigits=digits(query);
    return records().filter(record=>{
      const ref=String(record?.data?.quoteNumber||'').trim();
      if(!ref)return false;
      const rCompact=compact(ref),rDigits=digits(ref);
      if(qCompact.startsWith('aua'))return rCompact.includes(qCompact);
      return qDigits.length>=10&&rDigits.includes(qDigits);
    });
  }

  function dateLabel(record){
    const raw=record?.data?.date||record?.ts;
    const d=typeof raw==='number'?new Date(raw):new Date(String(raw||'').length===10?raw+'T00:00:00':raw);
    return Number.isNaN(d.getTime())?'No date':d.toLocaleDateString('en-SG',{day:'2-digit',month:'short',year:'numeric'});
  }

  function updatedLabel(record){
    const d=new Date(record?.ts||0);
    return Number.isNaN(d.getTime())?'':d.toLocaleString('en-SG',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
  }

  function statusFor(record){
    const value=String(record?.data?.status||'Draft').trim();
    return value||'Draft';
  }

  function statusClass(status){
    if(status==='Sent'||status==='Approved')return 'aua-status-green';
    if(status==='Cancelled')return 'aua-status-red';
    if(status==='Completed')return 'aua-status-blue';
    return 'aua-status-grey';
  }

  function renderQuoteResults(query,selectedKey=''){
    const list=byId('auaHistoryList'),count=byId('auaHistoryCount');
    if(!list)return;
    const matches=quoteMatches(query);
    list.innerHTML=matches.length?matches.map(record=>{
      const d=record.data||{},status=statusFor(record),selected=String(record.key)===String(selectedKey);
      return `<button class="aua-history-row${selected?' selected':''}" type="button" data-aua-key="${esc(record.key)}"><span class="aua-history-date">${esc(dateLabel(record))}</span><span><span class="aua-history-vehicle">${esc(d.vehicle||'NO VEHICLE')}</span><span class="aua-history-sub">${esc(d.customer||'Unnamed customer')}</span><span class="aua-history-status-badge ${statusClass(status)}">${esc(status)}</span></span><span class="aua-history-model-cell"><span class="aua-history-model">${esc(d.model||'—')}</span></span><span class="aua-history-total">S$ ${money(record.total)}</span><span class="aua-history-updated-cell"><span class="aua-history-updated">${esc(updatedLabel(record))}</span></span></button>`;
    }).join(''):'<div class="aua-history-no-results">No quotation matches that quotation number.</div>';
    if(count)count.textContent=`${matches.length} quotation number match${matches.length===1?'':'es'}`;
    list.querySelectorAll('.aua-history-row[data-aua-key]').forEach(row=>{
      row.onclick=()=>openPreviewThroughCore(row.dataset.auaKey,query);
    });
  }

  function openPreviewThroughCore(key,query){
    const input=byId('auaHistorySearch');
    if(!input)return;
    const baseInput=input.__auaBaseHistoryInput;
    if(typeof baseInput!=='function')return;

    input.value='';
    baseInput.call(input,{target:input});
    const coreRow=Array.from(document.querySelectorAll('#auaHistoryList .aua-history-row[data-aua-key]'))
      .find(row=>String(row.dataset.auaKey||'')===String(key||''));
    if(coreRow&&typeof coreRow.onclick==='function')coreRow.onclick();
    input.value=query;
    renderQuoteResults(query,key);
  }

  function install(){
    const input=byId('auaHistorySearch'),overlay=byId('auaHistoryOverlay');
    if(!input||!overlay){setTimeout(install,250);return}
    if(input.dataset.auaQuoteSearchV2)return;
    input.dataset.auaQuoteSearchV2='1';
    input.placeholder='Search quotation no., vehicle, customer, phone, model or item…';

    const baseInput=input.oninput;
    input.__auaBaseHistoryInput=baseInput;
    input.oninput=function(event){
      const query=this.value.trim();
      if(!isQuoteQuery(query)){
        if(typeof baseInput==='function')return baseInput.call(this,event);
        return;
      }
      renderQuoteResults(query);
    };

    const refreshQuoteResults=()=>{
      const query=input.value.trim();
      if(isQuoteQuery(query))setTimeout(()=>renderQuoteResults(query),0);
    };
    byId('auaHistoryRefresh')?.addEventListener('click',()=>setTimeout(refreshQuoteResults,400));
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
