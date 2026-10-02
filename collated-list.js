// Alan's United Auto - Text -> Quotation importer (restored v53)
// Paste workshop parts lists and convert them into one quotation section.
// Quantity defaults to 1 unless an explicit multiplier such as x2 is present.
(function(){
  const NO_QTY_CONTEXT=/labou?r|workmanship|diagnos|inspection fee|outside service|program|coding|calibrat|road test|service charge/i;
  function escHtml(s){return String(s||'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]))}
  function cleanLine(s){return String(s||'').replace(/[•·]/g,' ').replace(/\t/g,' ').replace(/\s+/g,' ').trim()}
  function extractTopFields(lines){const fields={},patterns={customer:/^(?:customer(?:\s*name)?|name)\s*[:\-]\s*(.+)$/i,phone:/^(?:phone|mobile|contact|tel)\s*[:\-]\s*(.+)$/i,vehicle:/^(?:vehicle(?:\s*(?:no|number))?|car\s*(?:no|number)|registration|reg\s*no)\s*[:\-]\s*(.+)$/i,model:/^(?:model|vehicle\s*model|car\s*model)\s*[:\-]\s*(.+)$/i,mileage:/^(?:mileage|odo|odometer)\s*[:\-]\s*(.+)$/i};const consumed=new Set();lines.forEach((line,i)=>{for(const[k,rx]of Object.entries(patterns)){const m=line.match(rx);if(m){fields[k]=m[1].trim();consumed.add(i);break}}});return{fields,consumed}}

  const PRICE_RX=/(?:S\$|SGD|\$)\s*([0-9][0-9,]*(?:\.\d{1,2})?)/ig;
  const NA_RX=/\b(?:N\.?\s*\/?\s*A\.?|NOT\s+AVAILABLE)\b/i;
  const SOURCE_RX=/\b(?:ORI(?:GINAL)?|OEM|SEG)\b/ig;
  function stripListNumber(v){return cleanLine(v).replace(/^\s*\d{1,3}\s*[.)\-:]?\s+/,'').trim()}
  function amount(v){const n=Number(String(v||'').replace(/,/g,''));return Number.isFinite(n)?n:null}
  function money2(n){return Number(n||0).toLocaleString('en-SG',{minimumFractionDigits:2,maximumFractionDigits:2})}
  function tidy(v){return cleanLine(v).replace(/\s+([,;:)])/g,'$1').replace(/([(])\s+/g,'$1').replace(/\s*[-–—:=]\s*$/,'').replace(/^\s*[-–—:=]\s*/,'').trim().toUpperCase()}
  function stripSourceWords(v){return String(v||'').replace(SOURCE_RX,' ').replace(/\s+\bOR\b\s*$/i,' ').replace(/\s+/g,' ').trim()}
  function cleanDescription(v){return tidy(stripSourceWords(v))}
  function leadingQty(v){const m=v.match(/^\s*([0-9]+(?:\.\d+)?)\s*(?:PCS?|PIECES?|SETS?|UNITS?|PAIRS?|BOTTLES?|LITRES?|LITERS?|LTRS?)\b\s*/i);return m?{q:m[1],body:v.slice(m[0].length).trim()}:null}
  function prices(raw){const rx=new RegExp(PRICE_RX.source,'ig'),out=[];let m;while((m=rx.exec(raw))){const n=amount(m[1]);if(n!==null)out.push({n,start:m.index,end:m.index+m[0].length})}return out}
  function firstPrice(raw){const p=prices(raw)[0];if(!p)return null;const tail=raw.slice(p.end),m=tail.match(/^\s*x\s*([0-9]+(?:\.\d+)?)/i);return{...p,mult:m?Number(m[1]):1}}
  function additiveTerms(raw,first){if(!first)return[];const out=[{n:first.n,mult:first.mult||1}],tail=raw.slice(first.end),rx=/\+\s*(?:(?:S\$|SGD|\$)\s*)?([0-9][0-9,]*(?:\.\d{1,2})?)(?:\s*x\s*([0-9]+(?:\.\d+)?))?/ig;let m;while((m=rx.exec(tail))){const n=amount(m[1]),mult=m[2]?Number(m[2]):1;if(n!==null&&Number.isFinite(mult)&&mult>0)out.push({n,mult})}return out}
  function alternativeDescription(raw,ps){return cleanDescription(raw.slice(0,ps[0].start))}
  function parseItem(line){
    let raw=stripListNumber(line);if(!raw)return null;
    if(/^(?:SUBTOTAL|GRAND\s+TOTAL|TOTAL|GST|TAX|DISCOUNT|QUOTATION|QUOTE|INVOICE)\b/i.test(raw))return null;
    let q='1';const lead=leadingQty(raw);if(lead){q=lead.q;raw=lead.body}
    const ps=prices(raw),first=firstPrice(raw),hasNA=NA_RX.test(raw);
    if(!first){const d=cleanDescription(raw);return d&&d.length>1?{q,d,p:'',priced:false,kind:hasNA?'na':'unpriced',raw}:null}
    const plus=additiveTerms(raw,first);
    if(plus.length>1){const total=plus.reduce((s,t)=>s+t.n*t.mult,0),d=cleanDescription(raw.slice(0,first.start));return{q:'1',d:d||cleanDescription(raw),p:String(Number(total.toFixed(2))),priced:true,kind:'combined',raw}}
    if(ps.length>1)return{q:'1',d:alternativeDescription(raw,ps),p:'',priced:false,kind:'alternative',raw};
    let after=raw.slice(first.end);const xm=after.match(/^\s*x\s*([0-9]+(?:\.\d+)?)/i);if(xm){const n=Number(xm[1]);if(Number.isFinite(n)&&n>0)q=String(n);after=after.slice(xm[0].length)}
    const d=cleanDescription(raw.slice(0,first.start)+' '+after);return d?{q,d,p:String(first.n),priced:true,kind:'priced',raw}:null
  }
  function parseCollated(value){
    const lines=String(value||'').split(/\r?\n/).map(cleanLine).filter(Boolean),{fields,consumed}=extractTopFields(lines),items=[];
    lines.forEach((line,i)=>{if(consumed.has(i))return;const x=parseItem(line);if(x)items.push(x)});
    return{fields,groups:items.length?[{title:'REPAIR / PARTS',items}]:[],count:items.length,review:items.filter(x=>!x.p).length}
  }
  function prefill(fields){const map={customer:'customer',phone:'phone',vehicle:'vehicle',model:'model',mileage:'mileage'};Object.entries(map).forEach(([k,id])=>{const e=document.getElementById(id);if(e&&!e.value&&fields[k])e.value=k==='vehicle'?fields[k].replace(/\s/g,'').toUpperCase():fields[k]})}
  function preview(){const source=document.getElementById('collatedText'),out=document.getElementById('collatedPreview');if(!source||!out)return null;const raw=source.value||'';if(!raw.trim()){out.innerHTML='<span class="small">Paste a parts or repair list above to preview it.</span>';return null}const r=parseCollated(raw);if(!r.count){out.innerHTML='<span class="small">No quotation lines detected.</span>';return r}const g=r.groups[0];out.innerHTML='<div style="display:flex;justify-content:space-between;gap:10px;font-size:10.5px;font-weight:700;margin-bottom:6px"><span>'+r.count+' item'+(r.count===1?'':'s')+' detected</span><span>'+(r.review?r.review+' price'+(r.review===1?'':'s')+' to review':'Ready to import')+'</span></div><div>'+g.items.map((x,i)=>'<div style="display:grid;grid-template-columns:24px 42px 1fr 78px;gap:6px;font-size:10.5px;padding:4px 0;border-bottom:1px solid #eef1f4"><span>'+(i+1)+'</span><span>'+escHtml(x.q||'1')+'</span><span>'+escHtml(x.d)+(x.kind==='alternative'?'<br><em style="color:#9a5a08;font-size:8.5px">CHECK ALTERNATIVE PRICE</em>':x.kind==='combined'?'<br><em style="color:#52677f;font-size:8.5px">COMBINED PRICE</em>':'')+'</span><span style="text-align:right;font-weight:700">'+(x.p!==''?'S$ '+money2(x.p):'—')+'</span></div>').join('')+'</div>';return r}
  function fillQuote(){const r=preview();if(!r||!r.count)return;if(typeof S==='undefined'||typeof section!=='function'||typeof item!=='function'||typeof render!=='function'||typeof upd!=='function'){alert('Quotation editor is still loading. Please try again in a moment.');return}prefill(r.fields);const g=r.groups[0],imported=section({title:'REPAIR / PARTS',items:g.items.map(x=>item({q:x.q||'1',d:x.d,p:x.p,included:false}))}),mode=document.getElementById('collatedMode')?.value||'replace';if(mode==='append')S.push(imported);else S.splice(0,S.length,imported);render();upd();const status=document.getElementById('collatedStatus');if(status)status.textContent='Added '+r.count+' item'+(r.count===1?'':'s')+' to the quotation.'+(r.review?' '+r.review+' price'+(r.review===1?'':'s')+' left blank for review.':'');closeImporter();document.querySelector('.sections-panel')?.scrollIntoView({behavior:'smooth',block:'start'})}
  function ensureImportStyles(){
    if(document.getElementById('auaImportQuoteV55Styles'))return;
    const style=document.createElement('style');
    style.id='auaImportQuoteV55Styles';
    style.textContent=[
      '.aua-import-quote-trigger{margin-left:auto;white-space:nowrap}',
      '.aua-import-overlay{position:fixed;inset:0;z-index:12000;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(15,23,42,.38);backdrop-filter:blur(2px)}',
      '.aua-import-overlay.show{display:flex}',
      '.aua-import-dialog{width:min(760px,96vw);max-height:90vh;overflow:auto;border:1px solid #d8e2ee;border-radius:16px;background:#fff;box-shadow:0 24px 70px rgba(15,23,42,.24);padding:16px}',
      '.aua-import-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}',
      '.aua-import-head h3{margin:0;color:#172033;font-size:16px}',
      '.aua-import-close{width:36px;min-width:36px;height:36px;padding:0;border-radius:9px}',
      '.aua-import-tabs{display:flex;gap:7px;margin-bottom:12px;padding:4px;border-radius:10px;background:#f1f5f9}',
      '.aua-import-tab{flex:1;min-height:36px;border:0;border-radius:8px;background:transparent;color:#526276;font-weight:800;cursor:pointer}',
      '.aua-import-tab.active{background:#fff;color:#1d4ed8;box-shadow:0 1px 3px rgba(15,23,42,.08)}',
      '.aua-import-pane[hidden]{display:none!important}',
      '#collatedText{display:block;width:100%;min-height:190px;box-sizing:border-box;resize:vertical;padding:11px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;color:#111827;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:12px;line-height:1.45;text-transform:none!important}',
      '.aua-import-controls{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:8px;align-items:end;margin-top:9px}',
      '.aua-import-note{margin-top:7px;color:#64748b;font-size:10.5px;line-height:1.45}',
      '#collatedPreview{margin-top:9px;padding:9px;border:1px solid #e2e8f0;border-radius:9px;background:#f8fafc;max-height:280px;overflow:auto}',
      '.aua-photo-drop{padding:14px;border:1px dashed #a9b8ca;border-radius:11px;background:#f8fafc}',
      '#auaImportPhotoPreview{display:none;width:100%;max-height:260px;object-fit:contain;margin-top:10px;border:1px solid #e2e8f0;border-radius:9px;background:#fff}',
      '.aua-photo-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:10px}',
      '#auaImportPhotoStatus{flex:1;min-width:180px;color:#526276;font-size:10.5px;line-height:1.4}',
      '@media(max-width:620px){.aua-import-dialog{padding:13px}.aua-import-controls{grid-template-columns:1fr 1fr}.aua-import-controls>div{grid-column:1/-1}.aua-import-quote-trigger{margin-left:0}}',
      '@media print{.aua-import-quote-trigger,.aua-import-overlay{display:none!important}}'
    ].join('');
    document.head.appendChild(style)
  }
  function switchImportTab(which){
    const textTab=document.getElementById('auaImportTextTab'),photoTab=document.getElementById('auaImportPhotoTab');
    const textPane=document.getElementById('auaImportTextPane'),photoPane=document.getElementById('auaImportPhotoPane');
    const photo=which==='photo';
    textTab?.classList.toggle('active',!photo);photoTab?.classList.toggle('active',photo);
    if(textPane)textPane.hidden=photo;if(photoPane)photoPane.hidden=!photo
  }
  function openImporter(tab='text'){
    const overlay=document.getElementById('auaImportOverlay');if(!overlay)return;
    switchImportTab(tab);overlay.classList.add('show');overlay.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';
    if(tab==='text')setTimeout(()=>document.getElementById('collatedText')?.focus(),0)
  }
  function closeImporter(){
    const overlay=document.getElementById('auaImportOverlay');if(!overlay)return;
    overlay.classList.remove('show');overlay.setAttribute('aria-hidden','true');document.body.style.overflow=''
  }
  let ocrPromise=null,photoUrl='';
  function loadOcrEngine(){
    if(window.Tesseract)return Promise.resolve(window.Tesseract);if(ocrPromise)return ocrPromise;
    ocrPromise=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';script.async=true;script.onload=()=>window.Tesseract?resolve(window.Tesseract):reject(new Error('Photo reader did not initialise.'));script.onerror=()=>reject(new Error('Photo reader could not load. Check the internet connection.'));document.head.appendChild(script)}).catch(error=>{ocrPromise=null;throw error});
    return ocrPromise
  }
  function setPhotoStatus(value){const el=document.getElementById('auaImportPhotoStatus');if(el)el.textContent=value||''}
  function photoSelected(){
    const input=document.getElementById('auaImportPhotoFile'),img=document.getElementById('auaImportPhotoPreview'),file=input?.files?.[0];
    if(photoUrl){URL.revokeObjectURL(photoUrl);photoUrl=''}
    if(!file){if(img)img.style.display='none';setPhotoStatus('');return}
    photoUrl=URL.createObjectURL(file);if(img){img.src=photoUrl;img.style.display='block'}setPhotoStatus('Photo ready. Press Extract Text.')
  }
  async function extractPhoto(){
    const input=document.getElementById('auaImportPhotoFile'),button=document.getElementById('auaImportExtractBtn'),file=input?.files?.[0];
    if(!file){alert('Choose a photo or screenshot first.');return}if(button)button.disabled=true;setPhotoStatus('Loading photo reader…');
    try{
      const Tesseract=await loadOcrEngine();
      const result=await Tesseract.recognize(file,'eng',{logger:m=>{if(m.status==='recognizing text')setPhotoStatus('Reading photo… '+Math.round((m.progress||0)*100)+'%');else if(m.status)setPhotoStatus(String(m.status).replace(/_/g,' '))}});
      const raw=String(result?.data?.text||'').trim();if(!raw){setPhotoStatus('No readable text found. Try a clearer photo.');return}
      const target=document.getElementById('collatedText');if(target)target.value=raw;switchImportTab('text');preview();
      const status=document.getElementById('collatedStatus');if(status)status.textContent='Photo text extracted. Check the descriptions, quantities and prices before filling the quotation.';
    }catch(error){console.error('Photo quotation OCR failed',error);setPhotoStatus('Unable to read this photo.');alert(error?.message||'Unable to read this photo.')}finally{if(button)button.disabled=false}
  }
  function install(){
    const sections=document.querySelector('.sections-panel');if(!sections||document.getElementById('auaImportQuoteButton'))return;ensureImportStyles();
    const topbar=sections.querySelector('.aua-sections-topbar')||sections.querySelector('.panel-title')?.parentElement||sections;
    const trigger=document.createElement('button');trigger.id='auaImportQuoteButton';trigger.className='btn outline aua-import-quote-trigger';trigger.type='button';trigger.textContent='↥ Import Quote';trigger.title='Paste a quotation list or extract one from a photo';trigger.onclick=()=>openImporter('text');
    const add=sections.querySelector('#auaAddSectionTop');if(add&&add.parentNode===topbar)topbar.insertBefore(trigger,add);else topbar.appendChild(trigger);
    const overlay=document.createElement('div');overlay.id='auaImportOverlay';overlay.className='aua-import-overlay';overlay.setAttribute('aria-hidden','true');
    overlay.innerHTML=[
      '<div class="aua-import-dialog" role="dialog" aria-modal="true" aria-labelledby="auaImportTitle">',
      '<div class="aua-import-head"><h3 id="auaImportTitle">Import Quote</h3><button id="auaImportClose" class="btn outline aua-import-close" type="button" aria-label="Close">×</button></div>',
      '<div class="aua-import-tabs"><button id="auaImportTextTab" class="aua-import-tab active" type="button">Paste Text</button><button id="auaImportPhotoTab" class="aua-import-tab" type="button">Upload Photo</button></div>',
      '<div id="auaImportTextPane" class="aua-import-pane">',
      '<textarea id="collatedText" rows="9" placeholder="Paste parts / repair list here"></textarea>',
      '<div class="aua-import-controls"><div><label>Import Mode</label><select id="collatedMode"><option value="replace">Replace current items</option><option value="append">Add as new section</option></select></div><button id="collatedPreviewBtn" class="btn secondary" type="button">Preview</button><button id="collatedFillBtn" class="btn primary" type="button">Fill Quotation</button></div>',
      '<div class="aua-import-note">Quantity defaults to 1 unless x2 / x3 etc. is stated. ORI / OEM / SEG wording is removed. Ambiguous alternative prices are left blank for review.</div>',
      '<div id="collatedPreview"><span class="small">Paste text or use Upload Photo to begin.</span></div><div id="collatedStatus" class="small" style="margin-top:7px;color:#315a85;font-weight:700"></div></div>',
      '<div id="auaImportPhotoPane" class="aua-import-pane" hidden><div class="aua-photo-drop"><label>Photo / screenshot</label><input id="auaImportPhotoFile" type="file" accept="image/*" capture="environment"><img id="auaImportPhotoPreview" alt="Quotation photo preview"><div class="aua-photo-actions"><button id="auaImportExtractBtn" class="btn primary" type="button">Extract Text</button><span id="auaImportPhotoStatus">Choose a clear, straight photo of the quotation or parts list.</span></div></div><div class="aua-import-note">The photo reader converts the image to editable text first. Check it before filling the quotation, especially prices and quantities.</div></div>',
      '</div>'
    ].join('');
    document.body.appendChild(overlay);
    document.getElementById('auaImportClose').onclick=closeImporter;document.getElementById('auaImportTextTab').onclick=()=>switchImportTab('text');document.getElementById('auaImportPhotoTab').onclick=()=>switchImportTab('photo');document.getElementById('collatedPreviewBtn').onclick=preview;document.getElementById('collatedFillBtn').onclick=fillQuote;document.getElementById('auaImportPhotoFile').addEventListener('change',photoSelected);document.getElementById('auaImportExtractBtn').onclick=extractPhoto;
    overlay.addEventListener('click',event=>{if(event.target===overlay)closeImporter()});document.addEventListener('keydown',event=>{if(event.key==='Escape'&&overlay.classList.contains('show'))closeImporter()})
  }
  window.AUAImportQuoteV55={parseText:parseCollated,parseItem,preview,fillQuote,open:openImporter,close:closeImporter,extractPhoto};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,50));else setTimeout(install,50);
})();