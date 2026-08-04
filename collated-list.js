// Alan's United Auto - collated text list importer
// Replaces photo/OCR input while handwriting AI is paused.
(function(){
  // Strong category signals. These are used to START or CHANGE a repair group.
  // Generic words such as bearing, bush, sensor, labour, gasket etc. are handled
  // contextually below so they stay with neighbouring workshop items.
  const STRONG_CATEGORY_RULES = [
    ['GEARBOX / DRIVETRAIN', /gearbox|transmission|\batf\b|\bcvt\b|\bdct\b|\bdsg\b|clutch|flywheel|drive ?shaft|cv joint|differential|transfer case|mechatronic|valve body/i],
    ['SUSPENSION / STEERING', /shock|absorber|strut|top mount|lower arm|upper arm|control arm|ball joint|anti.?roll|stabili[sz]er|sway bar|tie rod|rack end|steering|wheel bearing|hub bearing|wheel hub|alignment|coil spring|suspension/i],
    ['BRAKES', /brake|caliper|rotor|brake disc|abs sensor|wheel speed|handbrake|parking brake|brake servo/i],
    ['AIRCON', /air.?con|air conditioning|compressor|condenser|evaporator|cooling coil|blower|refrigerant|expansion valve|receiver drier/i],
    ['TYRES / WHEELS', /tyre|tire|rim|wheel balancing|rotation|tpms|puncture/i],
    ['BODY / PAINT', /bumper|fender|bonnet|hood|door|tailgate|boot lid|lamp|headlight|headlamp|tail light|tail lamp|mirror|windscreen|windshield|panel beat|spray|paint|respray|chrome|reflector|cross member/i],
    ['ENGINE / SERVICE', /engine|engine oil|oil filter|air filter|cabin filter|spark plug|ignition coil|timing|water pump|thermostat|radiator|coolant|engine mount|drive belt|serpentine|pulley|turbo|intake manifold|exhaust manifold/i],
    ['ELECTRICAL / BATTERY', /battery|alternator|starter|window motor|window regulator|keyless|push start|camera|pdc|parking sensor|ecu|bcm/i]
  ];

  // These words are deliberately NOT allowed to create a new section on their own.
  // In workshop lists they usually belong to the repair group immediately above them.
  const CONTEXTUAL_ONLY = /^(?:.*\b)?(?:bearing|bearings|bush|bushes|bushing|bushings|gasket|gaskets|o[ -]?ring|seal|seals|sensor|sensors|switch|module|control unit|mount|mounting|mountings|bracket|brackets|cover|covers|stopper|stoppers|boot|boots|hose|hoses|pipe|pipes|bolt|bolts|nut|nuts|washer|washers|clip|clips)(?:\b.*)?$/i;
  const LABOUR_CONTEXT = /labou?r|workmanship|installation|install|remove and renew|remove & renew|remove|renew|replace|replacement|repair|overhaul|service charge|outside service|inspection fee|diagnos|program|coding|calibrat|road test/i;

  function escHtml(s){return String(s||'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]))}
  function cleanLine(s){return String(s||'').replace(/[•·]/g,' ').replace(/\t/g,' ').replace(/\s+/g,' ').trim()}
  function strongCategory(desc){for(const [name,rx] of STRONG_CATEGORY_RULES) if(rx.test(desc)) return name; return ''}
  function fallbackCategory(desc){
    if(/gasket|o[ -]?ring|seal|mounting|mount\b|belt|pulley/i.test(desc)) return 'ENGINE / SERVICE';
    if(/sensor|switch|control unit|module|wiring/i.test(desc)) return 'ELECTRICAL / BATTERY';
    if(/bearing|bush/i.test(desc)) return 'SUSPENSION / STEERING';
    if(LABOUR_CONTEXT.test(desc)) return 'LABOUR / SERVICE';
    return 'OTHER ITEMS';
  }
  function contextualCategory(desc,currentCategory){
    const strong=strongCategory(desc);
    if(strong) return strong;
    // Labour and generic components stay in the active repair section whenever possible.
    if(currentCategory && currentCategory!=='OTHER ITEMS' && (LABOUR_CONTEXT.test(desc)||CONTEXTUAL_ONLY.test(desc))) return currentCategory;
    return fallbackCategory(desc);
  }
  function isHeading(line){
    if(!line || /\d/.test(line) || /[$@=]/.test(line)) return false;
    const t=line.replace(/[:\-–—]+$/,'').trim();
    if(t.length<2 || t.length>45) return false;
    return /:$/.test(line) || line===line.toUpperCase() || /^(engine|gearbox|transmission|suspension|steering|brakes?|aircon|air conditioning|electrical|battery|tyres?|wheels?|body|paint|labou?r|service|parts?|repair)$/i.test(t);
  }
  function normalizeHeading(line){return line.replace(/[:\-–—]+$/,'').trim().toUpperCase()}

  function extractTopFields(lines){
    const fields={};
    const patterns={
      customer:/^(?:customer(?:\s*name)?|name)\s*[:\-]\s*(.+)$/i,
      phone:/^(?:phone|mobile|contact|tel)\s*[:\-]\s*(.+)$/i,
      vehicle:/^(?:vehicle(?:\s*(?:no|number))?|car\s*(?:no|number)|registration|reg\s*no)\s*[:\-]\s*(.+)$/i,
      model:/^(?:model|vehicle\s*model|car\s*model)\s*[:\-]\s*(.+)$/i,
      mileage:/^(?:mileage|odo|odometer)\s*[:\-]\s*(.+)$/i
    };
    const consumed=new Set();
    lines.forEach((line,i)=>{for(const [k,rx] of Object.entries(patterns)){const m=line.match(rx);if(m){fields[k]=m[1].trim();consumed.add(i);break}}});
    return {fields,consumed};
  }

  function parseQtyAndDesc(body){
    let q='1 pc', desc=body.trim();
    let m=desc.match(/^([0-9]+(?:\.\d+)?)\s*(pcs?|pc|sets?|set|bottles?|bottle|litres?|liters?|ltr|l|units?|unit|pairs?|pair|boxes?|box|packs?|pack|tins?|tin|cans?|can)\b\s*/i);
    if(m){q=`${m[1]} ${m[2]}`;desc=desc.slice(m[0].length).trim();return{q,desc}}
    m=desc.match(/^([0-9]+(?:\.\d+)?)\s*[xX]\s*/);
    if(m){q=m[1];desc=desc.slice(m[0].length).trim();return{q,desc}}
    m=desc.match(/^([0-9]+(?:\.\d+)?)\s+(?=[A-Za-z])/);
    if(m){q=m[1];desc=desc.slice(m[0].length).trim()}
    return{q,desc};
  }

  function parseItem(line){
    let raw=cleanLine(line); if(!raw) return null;
    raw=raw.replace(/^[-–—]+\s*/,'').trim();
    let price=null, body=raw, priced=false;
    let m=raw.match(/(?:\s+|^)(?:@\s*|S\$\s*|SGD\s*|\$\s*)([0-9][0-9,]*(?:\.\d{1,2})?)\s*$/i);
    if(m){price=Number(m[1].replace(/,/g,''));body=raw.slice(0,m.index).trim();priced=true}
    else {
      m=raw.match(/\s+([0-9][0-9,]*(?:\.\d{1,2})?)\s*$/);
      if(m){const n=Number(m[1].replace(/,/g,''));if(Number.isFinite(n)&&n>=5&&!(n>=1900&&n<=2100)){price=n;body=raw.slice(0,m.index).trim();priced=true}}
    }
    body=body.replace(/\s*[-–—:=]\s*$/,'').trim();
    const {q,desc}=parseQtyAndDesc(body);
    if(!desc || desc.length<2) return null;
    return {q,d:desc,p:priced?String(price):'',priced,raw};
  }

  function parseCollated(text){
    const lines=String(text||'').split(/\r?\n/).map(cleanLine).filter(Boolean);
    const {fields,consumed}=extractTopFields(lines);
    const groups=[]; let explicitHeading=null, sawExplicit=false, pricedSeen=false, activeCategory='';
    function getGroup(title){
      // Keep sections in the order they first appear. Repeated later items of the same category return to that section.
      let g=groups.find(x=>x.title===title);if(!g){g={title,items:[]};groups.push(g)}return g
    }
    lines.forEach((line,i)=>{
      if(consumed.has(i)) return;
      if(isHeading(line)){explicitHeading=normalizeHeading(line);sawExplicit=true;activeCategory=explicitHeading;return}
      if(/^(subtotal|grand total|total|gst|tax|discount|quotation|quote|invoice)\b/i.test(line)) return;
      const x=parseItem(line); if(!x) return;
      if(x.priced) pricedSeen=true;
      if(!pricedSeen && !x.priced) return;
      if(!x.priced && !document.getElementById('collatedIncluded')?.checked) return;

      let title;
      if(sawExplicit && explicitHeading){
        title=explicitHeading;
      }else{
        title=contextualCategory(x.d,activeCategory);
        // Once a strong repair category has appeared, it becomes the working context for
        // following generic parts and labour until another strong category appears.
        if(title!=='LABOUR / SERVICE' && title!=='OTHER ITEMS') activeCategory=title;
        else if(activeCategory && (LABOUR_CONTEXT.test(x.d)||CONTEXTUAL_ONLY.test(x.d))) title=activeCategory;
      }
      x.included=!x.priced;
      getGroup(title).items.push(x);
    });
    return {fields,groups:groups.filter(g=>g.items.length),count:groups.reduce((n,g)=>n+g.items.length,0)};
  }

  function prefill(fields){
    const map={customer:'customer',phone:'phone',vehicle:'vehicle',model:'model',mileage:'mileage'};
    Object.entries(map).forEach(([k,id])=>{const e=document.getElementById(id);if(e&&!e.value&&fields[k])e.value=k==='vehicle'?fields[k].replace(/\s/g,'').toUpperCase():fields[k]});
  }

  function preview(){
    const text=document.getElementById('collatedText')?.value||'';
    const out=document.getElementById('collatedPreview');
    if(!text.trim()){out.innerHTML='<span class="small">Paste a list above to preview it.</span>';return null}
    const r=parseCollated(text);
    if(!r.count){out.innerHTML='<span class="small">No priced quotation items detected. Put the amount at the end of each chargeable line, e.g. <b>2 pcs Shock Absorbers @265</b>.</span>';return r}
    out.innerHTML=`<div style="font-size:11px;font-weight:700;margin-bottom:6px">${r.count} item${r.count===1?'':'s'} detected in ${r.groups.length} section${r.groups.length===1?'':'s'}</div>`+
      r.groups.map(g=>`<div style="margin:6px 0"><b style="font-size:10px">${escHtml(g.title)}</b>${g.items.map(x=>`<div style="display:grid;grid-template-columns:62px 1fr 72px;gap:6px;font-size:10.5px;padding:3px 0;border-bottom:1px solid #eef1f4"><span>${escHtml(x.q)}</span><span>${escHtml(x.d)}${x.included?' <em>(Included)</em>':''}</span><span style="text-align:right">${x.included?'':('$'+Number(x.p).toFixed(2))}</span></div>`).join('')}</div>`).join('');
    return r;
  }

  function fillQuote(){
    const r=preview(); if(!r||!r.count) return;
    prefill(r.fields);
    const sections=r.groups.map(g=>section({title:g.title,items:g.items.map(x=>item({q:x.q,d:x.d,p:x.p,included:x.included}))}));
    const mode=document.getElementById('collatedMode')?.value||'replace';
    if(mode==='append') S.push(...sections); else S.splice(0,S.length,...sections);
    render();upd();
    const status=document.getElementById('collatedStatus');if(status)status.textContent=`Added ${r.count} item${r.count===1?'':'s'} into ${r.groups.length} quotation section${r.groups.length===1?'':'s'}. Nearby generic parts and labour are kept with their repair group.`;
    document.querySelector('.sections-panel')?.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function install(){
    const old=document.querySelector('.scan-panel'); if(old) old.style.display='none';
    const settings=document.querySelector('.settings-panel'); if(!settings||document.getElementById('collatedPanel')) return;
    const panel=document.createElement('div'); panel.id='collatedPanel';panel.className='panel';panel.style.borderLeft='4px solid #2563eb';
    panel.innerHTML=`<div class="panel-title" style="color:#1d4ed8">PASTE / IMPORT COLLATED LIST</div>
      <div class="small" style="margin-bottom:8px">Paste a parts or repair list from WhatsApp, Notes, email or another system. Items are grouped using both the part name and the surrounding lines. Generic parts and labour stay with the repair group above them.</div>
      <textarea id="collatedText" style="min-height:180px" placeholder="Example:\n2 pcs Front Shock Absorbers @265\n2 pcs Front Wheel Bearings @160\n2 pcs Top Mounts @105\nLabour 450"></textarea>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px"><div><label>Import Mode</label><select id="collatedMode"><option value="replace">Replace current items</option><option value="append">Add to current quotation</option></select></div><label style="display:flex;align-items:flex-end;gap:7px;padding-bottom:9px"><input id="collatedIncluded" type="checkbox" checked style="width:16px"> Unpriced lines after first value = Included</label></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:9px"><button id="collatedPreviewBtn" class="btn secondary">Preview Breakdown</button><button id="collatedFillBtn" class="btn primary">Sort & Fill Quotation</button></div>
      <div id="collatedPreview" style="margin-top:9px;padding:9px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc"><span class="small">Paste a list above to preview it.</span></div><div id="collatedStatus" class="small" style="margin-top:7px"></div>`;
    settings.parentNode.insertBefore(panel,settings);
    document.getElementById('collatedPreviewBtn').onclick=preview;
    document.getElementById('collatedFillBtn').onclick=fillQuote;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,50));else setTimeout(install,50);
})();