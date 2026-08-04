// Alan's United Auto - direct editing from the quotation preview.
// User-entered fields are editable; calculated summary/amount/total fields stay read-only.
(function(){
  let busy=false;
  const $=id=>document.getElementById(id);
  const undo=[];
  const clone=o=>JSON.parse(JSON.stringify(o));
  function sections(){try{return (typeof S!=='undefined'&&Array.isArray(S))?S:null}catch{return null}}
  function snap(){const ss=sections();return {fields:['customer','phone','vehicle','mileage','model','date','remarks','overallType','overallDisc'].reduce((o,id)=>(o[id]=$(id)?.value||'',o),{}),sections:ss?clone(ss):[]}}
  function pushUndo(){undo.push(snap());if(undo.length>40)undo.shift()}
  function restore(s){if(!s)return;Object.entries(s.fields||{}).forEach(([id,v])=>{if($(id))$(id).value=v});const ss=sections();if(ss)ss.splice(0,ss.length,...clone(s.sections||[]));refresh()}
  function undoRight(){const s=undo.pop();if(s){restore(s);return true}return false}
  window.auaPushUndo=pushUndo;window.auaUndoRight=undoRight;

  function injectStyle(){
    if($('auaPreviewEditStyles'))return;
    const s=document.createElement('style');s.id='auaPreviewEditStyles';s.textContent=`
      .paper .aua-editable{cursor:text;border-radius:3px;transition:background .12s,outline .12s;min-height:1em}
      .paper .aua-editable:hover{background:#eff6ff;outline:1px dashed #60a5fa}
      .paper .aua-editing{background:#fff!important;outline:2px solid #2563eb!important;padding:1px 3px;min-width:28px!important;display:inline-block!important}
      .paper .meta span.aua-editable{display:inline-block;min-width:52px;min-height:14px;vertical-align:bottom}
      .paper .line>div.aua-editable{min-height:16px;padding-left:2px;padding-right:2px}
      .paper .sectitle.aua-editable{display:inline-block;min-width:55px;padding:1px 3px}
      .paper .summary,.paper .totals,.paper .line>div:nth-child(4){cursor:default}
      .paper .aua-empty-phone{display:inline!important}
      @media print{.paper .aua-editable:hover,.paper .aua-editing{background:transparent!important;outline:none!important;padding:0}.paper .aua-empty-phone{display:none!important}}
    `;document.head.appendChild(s);
  }
  function refresh(){if(typeof render==='function')render();if(typeof upd==='function')upd()}
  function setTextInput(id,value){const el=$(id);if(!el)return;el.value=value;if(typeof upd==='function')upd()}
  function commitCell(el,get,set,opts={}){
    if(!el||el.dataset.auaEditing==='1')return;
    el.dataset.auaEditing='1';el.classList.add('aua-editing');el.setAttribute('contenteditable','true');
    const original=String(get()??'');el.textContent=original;el.focus();
    const r=document.createRange();r.selectNodeContents(el);r.collapse(false);const sel=window.getSelection();sel.removeAllRanges();sel.addRange(r);
    let done=false;
    const finish=(cancel=false)=>{if(done)return;done=true;el.removeEventListener('keydown',key);el.removeEventListener('blur',blur);el.removeAttribute('contenteditable');el.classList.remove('aua-editing');delete el.dataset.auaEditing;if(!cancel){let v=el.textContent.trim();if(opts.upper)v=v.toUpperCase();if(opts.number)v=v.replace(/[^0-9.]/g,'');if(v!==original){pushUndo();set(v)}}requestAnimationFrame(markEditable)};
    const key=e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z')return;if(e.key==='Enter'){e.preventDefault();finish(false)}else if(e.key==='Escape'){e.preventDefault();el.textContent=original;finish(true)}};
    const blur=()=>finish(false);el.addEventListener('keydown',key);el.addEventListener('blur',blur,{once:true});
  }
  function bind(el,handler,title){if(!el)return;el.classList.add('aua-editable');el.title=title||'Click to edit';if(el.dataset.auaEditBound==='1')return;el.dataset.auaEditBound='1';el.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();handler(el)})}
  function keepBlankTargetsVisible(){const wrap=$('pphoneWrap'),phone=$('phone');if(wrap&&phone){if(!String(phone.value||'').trim()){wrap.classList.add('aua-empty-phone');wrap.style.display='inline'}else wrap.classList.remove('aua-empty-phone')}}
  function markMeta(){keepBlankTargetsVisible();const map={pc:'customer',pphone:'phone',pv:'vehicle',pm:'mileage',pmod:'model'};Object.entries(map).forEach(([pid,iid])=>{const p=$(pid),input=$(iid);if(!p||!input)return;bind(p,el=>commitCell(el,()=>input.value,v=>setTextInput(iid,v),{upper:!['phone','mileage'].includes(iid)}),'Click to edit')});const pd=$('pd'),date=$('date');if(pd&&date)bind(pd,el=>commitCell(el,()=>date.value,v=>{date.value=v;if(typeof upd==='function')upd()}),'Click to edit date');const remarks=$('pRemarks'),rin=$('remarks');if(remarks&&rin){if(!rin.value){remarks.style.display='block';remarks.dataset.auaBlankRemark='1';remarks.style.minHeight='18px'}bind(remarks,el=>commitCell(el,()=>rin.value,v=>setTextInput('remarks',v),{upper:true}),'Click to edit remarks')}}
  function markSections(){const ss=sections();if(!ss)return;const cards=[...document.querySelectorAll('#psecs .secprint')];cards.forEach((card,si)=>{const sec=ss[si];if(!sec)return;const title=card.querySelector('.sectitle');if(title)bind(title,el=>commitCell(el,()=>sec.title||'',v=>{sec.title=v.toUpperCase();refresh()},{upper:true}),'Click to edit section name');const lines=[...card.querySelectorAll('.line')];lines.forEach((line,ii)=>{const item=sec.items?.[ii];if(!item)return;const cells=[...line.children];if(cells[0])bind(cells[0],el=>commitCell(el,()=>item.q??'',v=>{item.q=v;refresh()}),'Click to edit quantity');if(cells[1])bind(cells[1],el=>commitCell(el,()=>item.d??'',v=>{item.d=v.toUpperCase();refresh()},{upper:true}),'Click to edit description');if(cells[2]&&!item.included)bind(cells[2],el=>commitCell(el,()=>item.p??'',v=>{item.p=v;refresh()},{number:true}),'Click to edit unit price')});const adjust=[...card.querySelectorAll('.adjust')].find(x=>/section discount/i.test(x.textContent||''));if(adjust)bind(adjust,()=>{const current=Number(sec.dv||0),isPct=sec.dt==='percent';const v=prompt(isPct?'Section discount %:':'Section discount S$:',current||'');if(v===null)return;const n=Number(String(v).replace(/[^0-9.]/g,''));if(Number.isFinite(n)&&String(n)!==String(sec.dv||0)){pushUndo();sec.dv=String(n);refresh()}},'Click to edit section discount')})}
  function markOverall(){const row=$('overallRow');if(row&&row.style.display!=='none')bind(row,()=>{const inp=$('overallDisc');if(!inp)return;inp.focus();inp.select?.();document.querySelector('.discount-panel')?.scrollIntoView({behavior:'smooth',block:'center'})},'Click to edit overall discount')}
  function markEditable(){if(busy)return;busy=true;requestAnimationFrame(()=>{markMeta();markSections();markOverall();busy=false})}
  function install(){
    injectStyle();markEditable();
    const paper=document.querySelector('.paper');
    if(paper)new MutationObserver(markEditable).observe(paper,{childList:true,subtree:true,attributes:true,attributeFilter:['style']});
    // Global Ctrl/Cmd+Z for committed changes made on the right quotation.
    // Do not hijack native undo while the user is actively typing in a normal input/textarea/contenteditable field.
    document.addEventListener('keydown',e=>{
      if(!(e.ctrlKey||e.metaKey)||e.key.toLowerCase()!=='z'||e.shiftKey)return;
      const a=document.activeElement;
      const typing=a&&(a.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/i.test(a.tagName));
      if(typing)return;
      if(!undo.length)return;
      e.preventDefault();e.stopImmediatePropagation();undoRight();
    },true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,650));else setTimeout(install,650);
})();