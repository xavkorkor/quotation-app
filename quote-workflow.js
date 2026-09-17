// Stable quotation workflow metadata: status, quotation number and vehicle lookup.
(function(){
  const STATUS_OPTIONS=['Draft','Sent','Approved','Job In Progress','Completed','Cancelled'];
  let quoteNumber='';
  let quoteStatus='Draft';

  const byId=id=>document.getElementById(id);
  const pad=n=>String(n).padStart(2,'0');
  const normalVehicle=value=>String(value||'').toUpperCase().replace(/\s+/g,'').trim();

  function generateQuoteNumber(){
    const d=new Date();
    const date=`${String(d.getFullYear()).slice(-2)}${pad(d.getMonth()+1)}${pad(d.getDate())}`;
    const time=`${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
    return `AUA${date}${time}`;
  }

  function ensureMeta(){
    if(!quoteNumber)quoteNumber=generateQuoteNumber();
    if(!STATUS_OPTIONS.includes(quoteStatus))quoteStatus='Draft';
  }

  function ensureStyles(){
    if(byId('auaQuoteWorkflowStyles'))return;
    const style=document.createElement('style');
    style.id='auaQuoteWorkflowStyles';
    style.textContent=`
      .aua-quote-workflow-panel{border-left-color:#64748b}
      #auaQuoteNumber{background:#f8fafc;color:#475569;font-weight:700}
      .aua-vehicle-suggestion{margin-top:5px;display:none}
      .aua-vehicle-suggestion button{width:100%;text-align:left;border:1px solid #bfdbfe;background:#eff6ff;color:#1e40af;border-radius:8px;padding:7px 8px;font-size:10.5px;font-weight:700;cursor:pointer}
      .aua-preview-quote-ref{font-weight:700}
    `;
    document.head.appendChild(style);
  }

  function ensureUi(){
    let panel=byId('auaQuoteWorkflowPanel');
    if(!panel){
      const customerPanel=document.querySelector('.customer-panel');
      if(!customerPanel)return false;
      panel=document.createElement('div');
      panel.id='auaQuoteWorkflowPanel';
      panel.className='panel settings-panel aua-quote-workflow-panel';
      panel.innerHTML=`<div class="panel-title">QUOTATION DETAILS</div><div class="grid"><div><label>Quotation No.</label><input id="auaQuoteNumber" data-preserve-case readonly></div><div><label>Status</label><select id="auaQuoteStatus">${STATUS_OPTIONS.map(x=>`<option value="${x}">${x}</option>`).join('')}</select></div></div>`;
      customerPanel.insertAdjacentElement('afterend',panel);
    }

    ensureStyles();

    const status=byId('auaQuoteStatus');
    if(status&&status.dataset.auaStatusBound!=='1'){
      status.dataset.auaStatusBound='1';
      status.addEventListener('change',e=>{
        quoteStatus=e.target.value||'Draft';
        window.auaSyncWorkspaceHeader?.();
      });
    }

    const meta=document.querySelector('.paper .meta');
    if(meta&&!byId('pQuoteNumberWrap')){
      const row=document.createElement('div');
      row.id='pQuoteNumberWrap';
      row.className='aua-preview-quote-ref';
      row.innerHTML='Quotation No.: <span id="pQuoteNumber"></span>';
      meta.prepend(row);
    }

    injectVehicleLookup();
    syncUi();
    return true;
  }

  function syncUi(){
    ensureMeta();
    const q=byId('auaQuoteNumber'),s=byId('auaQuoteStatus'),p=byId('pQuoteNumber');
    if(q&&q.value!==quoteNumber)q.value=quoteNumber;
    if(s&&s.value!==quoteStatus)s.value=quoteStatus;
    if(p&&p.textContent!==quoteNumber)p.textContent=quoteNumber;
    window.auaSyncWorkspaceHeader?.();
  }

  function records(){
    try{return typeof getRecent==='function'?(getRecent()||[]):[]}catch{return[]}
  }

  function markAutofill(input){
    if(input&&String(input.value||'')!=='')input.dataset.auaHistoryAutofill='1';
  }

  function injectVehicleLookup(){
    const input=byId('vehicle');
    if(!input||byId('auaVehicleLookupList'))return;
    const list=document.createElement('datalist');
    list.id='auaVehicleLookupList';
    document.body.appendChild(list);
    input.setAttribute('list','auaVehicleLookupList');

    const suggestion=document.createElement('div');
    suggestion.id='auaVehicleSuggestion';
    suggestion.className='aua-vehicle-suggestion';
    input.insertAdjacentElement('afterend',suggestion);

    const refreshList=()=>{
      const seen=new Set(),items=[];
      records().slice().sort((a,b)=>Number(b.ts||0)-Number(a.ts||0)).forEach(record=>{
        const vehicle=String(record?.data?.vehicle||'').trim();
        const key=normalVehicle(vehicle);
        if(!key||seen.has(key))return;
        seen.add(key);items.push(vehicle);
      });
      list.innerHTML=items.slice(0,100).map(v=>`<option value="${String(v).replace(/&/g,'&amp;').replace(/"/g,'&quot;')}"></option>`).join('');
    };

    const updateSuggestion=()=>{
      refreshList();
      const key=normalVehicle(input.value);
      if(!key){suggestion.style.display='none';suggestion.innerHTML='';return}
      const matches=records().filter(r=>normalVehicle(r?.data?.vehicle)===key).sort((a,b)=>Number(b.ts||0)-Number(a.ts||0));
      const record=matches[0];
      if(!record){suggestion.style.display='none';suggestion.innerHTML='';return}
      const d=record.data||{};
      const bits=[d.customer,d.model].filter(Boolean).join(' · ');
      suggestion.innerHTML=`<button type="button">Use previous details${bits?`: ${escapeHtml(bits)}`:''}</button>`;
      suggestion.style.display='block';
      suggestion.querySelector('button').onclick=()=>{
        const customer=byId('customer'),phone=byId('phone'),model=byId('model');
        if(d.customer&&customer){customer.value=d.customer;markAutofill(customer)}
        if(d.phone&&phone){phone.value=d.phone;markAutofill(phone)}
        if(d.model&&model){model.value=d.model;markAutofill(model)}
        suggestion.style.display='none';
        if(typeof upd==='function')upd();
      };
    };

    input.addEventListener('focus',refreshList);
    input.addEventListener('input',updateSuggestion);
  }

  function escapeHtml(value){
    return String(value??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  }

  function installHooks(){
    if(typeof state!=='function'||typeof loadRecord!=='function'||typeof newQuote!=='function'||typeof duplicateQuote!=='function')return false;
    if(state.__auaQuoteWorkflow)return true;

    const baseState=state;
    const baseLoadRecord=loadRecord;
    const baseNewQuote=newQuote;
    const baseDuplicateQuote=duplicateQuote;

    ensureMeta();

    state=function(){
      const data=baseState();
      ensureMeta();
      data.quoteNumber=quoteNumber;
      data.status=quoteStatus;
      return data;
    };
    state.__auaQuoteWorkflow=true;

    loadRecord=function(data){
      quoteNumber=String(data?.quoteNumber||'').trim()||generateQuoteNumber();
      quoteStatus=STATUS_OPTIONS.includes(data?.status)?data.status:'Draft';
      const result=baseLoadRecord(data);
      setTimeout(syncUi,0);
      return result;
    };

    newQuote=function(){
      const before=JSON.stringify(baseState());
      const previousNumber=quoteNumber,previousStatus=quoteStatus;
      const result=baseNewQuote.apply(this,arguments);
      setTimeout(()=>{
        const after=JSON.stringify(baseState());
        if(after!==before){quoteNumber=generateQuoteNumber();quoteStatus='Draft'}
        else{quoteNumber=previousNumber;quoteStatus=previousStatus}
        syncUi();
      },0);
      return result;
    };

    duplicateQuote=function(){
      const result=baseDuplicateQuote.apply(this,arguments);
      quoteNumber=generateQuoteNumber();
      quoteStatus='Draft';
      setTimeout(syncUi,0);
      return result;
    };
    return true;
  }

  function install(){
    const hooks=installHooks();
    const ui=ensureUi();
    if(!hooks||!ui){setTimeout(install,120);return}
    syncUi();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();