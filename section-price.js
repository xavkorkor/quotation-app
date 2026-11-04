// Optional whole-section pricing for Alan's United Auto quotation app.
// When a section price is entered, it replaces the sum of individual item prices for that section.
// Item details remain editable/saved; the customer-facing quotation shows them as Included.
(function(){
  const money=n=>Number(n||0).toLocaleString('en-SG',{minimumFractionDigits:2,maximumFractionDigits:2});
  const num=v=>{const n=parseFloat(String(v??'').replace(/[^0-9.-]/g,''));return Number.isFinite(n)?n:0};
  const discount=(base,type,value)=>Math.min(base,type==='percent'?base*Math.min(100,Math.max(0,num(value)))/100:Math.max(0,num(value)));

  function active(sectionData){
    return String(sectionData?.sectionPrice??'').trim()!=='';
  }

  function price(sectionData){
    return Math.max(0,num(sectionData?.sectionPrice));
  }

  function normalizeExisting(){
    try{if(typeof S!=='undefined'&&Array.isArray(S))S.forEach(s=>{if(s.sectionPrice==null)s.sectionPrice=''})}catch{}
  }

  function patchSectionFactory(){
    if(typeof window.section!=='function'||window.section.__auaSectionPrice)return false;
    const base=window.section;
    window.section=function(x={}){
      const result=base.apply(this,arguments);
      result.sectionPrice=x?.sectionPrice??x?.wholeSectionPrice??'';
      return result;
    };
    window.section.__auaSectionPrice=true;
    return true;
  }

  function patchTotals(){
    if(typeof window.totals!=='function'||window.totals.__auaSectionPrice)return false;
    const base=window.totals;
    window.totals=function(){
      const result=base.apply(this,arguments);
      if(!result||!Array.isArray(result.secs))return result;
      let subtotal=0;
      result.secs=result.secs.map((entry,index)=>{
        const sectionData=(typeof S!=='undefined'&&S[index])||entry.s;
        if(!active(sectionData)){
          subtotal+=Number(entry.net||0);
          return Object.assign({},entry,{sectionPriceActive:false});
        }
        const whole=price(sectionData);
        const sd=discount(whole,sectionData?.dt,sectionData?.dv);
        const net=Math.max(0,whole-sd);
        subtotal+=net;
        return Object.assign({},entry,{
          originalItemNet:Number(entry.itemNet||0),
          itemNet:whole,
          sd,
          net,
          sectionPrice:whole,
          sectionPriceActive:true
        });
      });
      const overallType=document.getElementById('overallType')?.value||'percent';
      const overallDisc=document.getElementById('overallDisc')?.value||0;
      const od=discount(subtotal,overallType,overallDisc);
      const tax=Math.max(0,subtotal-od);
      const gstOn=document.getElementById('gstOn')?.checked!==false;
      const g=gstOn?tax*.09:0;
      return Object.assign({},result,{subtotal,od,tax,g,grand:tax+g});
    };
    window.totals.__auaSectionPrice=true;
    return true;
  }

  function patchValidation(){
    if(typeof window.validationIssues!=='function'||window.validationIssues.__auaSectionPrice)return false;
    window.validationIssues=function(){
      const issues=[];
      try{
        (S||[]).forEach(sectionData=>{
          const sectionPriced=active(sectionData);
          (sectionData.items||[]).forEach((itemData,index)=>{
            if(itemData.included)return;
            const description=String(itemData.d||'').trim();
            const itemPrice=String(itemData.p??'').trim();
            if(description&&itemPrice===''&&!sectionPriced)issues.push(`${sectionData.title}: item ${index+1} has a description but no price.`);
          });
        });
      }catch{}
      return issues;
    };
    window.validationIssues.__auaSectionPrice=true;
    return true;
  }

  function refreshMiniTotal(index){
    try{
      const total=window.totals?.()?.secs?.[index]?.net||0;
      const card=document.querySelectorAll('#sections .section-card')[index];
      const mini=card?.querySelector('.section-mini-total');
      if(mini)mini.textContent='S$ '+money(total);
    }catch{}
  }

  function decorateEditor(){
    let sectionsData;
    try{sectionsData=typeof S!=='undefined'&&Array.isArray(S)?S:null}catch{return}
    if(!sectionsData)return;
    const cards=[...document.querySelectorAll('#sections .section-card')];
    cards.forEach((card,index)=>{
      const sectionData=sectionsData[index];
      const body=card.querySelector('.section-body');
      if(!sectionData||!body)return;
      if(sectionData.sectionPrice==null)sectionData.sectionPrice='';
      let box=body.querySelector(':scope > .aua-section-price-box');
      if(!box){
        box=document.createElement('div');
        box.className='aua-section-price-box';
        box.innerHTML='<div class="aua-section-price-label">Whole Section Price — optional</div><div class="aua-section-price-row"><span>S$</span><input class="aua-section-price-input" type="number" min="0" step=".01" placeholder="Use item prices"></div><div class="aua-section-price-note">When entered, this amount prices the whole section. Individual items will appear as Included on the customer quotation.</div>';
        const discountLabel=[...body.children].find(el=>el.classList?.contains('small')&&/section discount/i.test(el.textContent||''));
        if(discountLabel)body.insertBefore(box,discountLabel);
        else body.appendChild(box);
        const input=box.querySelector('.aua-section-price-input');
        input.addEventListener('input',()=>{
          sectionData.sectionPrice=input.value;
          box.classList.toggle('active',active(sectionData));
          try{if(typeof window.upd==='function')window.upd()}catch{}
          refreshMiniTotal(index);
        });
        input.addEventListener('change',()=>{
          try{if(typeof window.render==='function')window.render()}catch{}
          try{if(typeof window.upd==='function')window.upd()}catch{}
        });
      }
      const input=box.querySelector('.aua-section-price-input');
      if(input&&document.activeElement!==input)input.value=sectionData.sectionPrice??'';
      box.classList.toggle('active',active(sectionData));
      const discountLabel=[...body.children].find(el=>el.classList?.contains('small')&&/section discount/i.test(el.textContent||''));
      if(discountLabel)discountLabel.textContent=active(sectionData)?'Section discount — optional (applies to whole section price)':'Section discount — optional';
    });
  }

  function decoratePreview(){
    let sectionsData,totalData;
    try{
      sectionsData=typeof S!=='undefined'&&Array.isArray(S)?S:null;
      totalData=typeof window.totals==='function'?window.totals():null;
    }catch{return}
    if(!sectionsData||!totalData)return;
    const cards=[...document.querySelectorAll('#psecs .secprint')];
    cards.forEach((card,index)=>{
      const sectionData=sectionsData[index],entry=totalData.secs?.[index];
      if(!sectionData||!entry||!active(sectionData))return;
      card.querySelectorAll('.line').forEach(line=>{
        if(line.children[2])line.children[2].textContent='';
        if(line.children[3])line.children[3].textContent='Included';
      });
      const final=card.querySelector('.adjust.final');
      if(final?.children?.[0])final.children[0].textContent=Number(entry.sd||0)>0?'SECTION TOTAL':'SECTION PRICE';
    });
  }

  function patchRender(){
    if(typeof window.render!=='function'||window.render.__auaSectionPrice)return false;
    const base=window.render;
    window.render=function(){
      const result=base.apply(this,arguments);
      decorateEditor();
      return result;
    };
    window.render.__auaSectionPrice=true;
    return true;
  }

  function patchUpdate(){
    if(typeof window.upd!=='function'||window.upd.__auaSectionPrice)return false;
    const base=window.upd;
    window.upd=function(){
      const result=base.apply(this,arguments);
      decoratePreview();
      return result;
    };
    window.upd.__auaSectionPrice=true;
    return true;
  }

  function styles(){
    if(document.getElementById('auaSectionPriceStyles'))return;
    const style=document.createElement('style');
    style.id='auaSectionPriceStyles';
    style.textContent=`
      .aua-section-price-box{margin-top:10px;padding:10px 11px;border:1px solid #dbe3ed;border-radius:9px;background:#f8fafc}
      .aua-section-price-box.active{border-color:#93c5fd;background:#eff6ff}
      .aua-section-price-label{font-size:10.5px;font-weight:800;color:#334155;text-transform:uppercase;letter-spacing:.025em}
      .aua-section-price-row{display:grid;grid-template-columns:auto minmax(0,1fr);gap:7px;align-items:center;margin-top:6px}
      .aua-section-price-row>span{font-size:12px;font-weight:800;color:#475569}
      .aua-section-price-input{min-height:38px!important;font-size:14px!important;font-weight:700}
      .aua-section-price-note{margin-top:5px;color:#64748b;font-size:9.5px;line-height:1.35}
      @media(max-width:600px){.aua-section-price-box{padding:9px}}
    `;
    document.head.appendChild(style);
  }

  function install(attempt=0){
    styles();
    const ready=patchSectionFactory()&&patchTotals()&&patchRender()&&patchUpdate();
    patchValidation();
    normalizeExisting();
    if(ready){
      decorateEditor();
      try{window.upd()}catch{}
      window.AUASectionPrice={active,price,refresh:()=>{decorateEditor();try{window.upd()}catch{}}};
      return;
    }
    if(attempt<40)setTimeout(()=>install(attempt+1),100);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>install(),{once:true});
  else install();
})();
