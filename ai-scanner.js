(function(){
  function fileToDataUrl(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)})}
  function el(id){return document.getElementById(id)}
  function setStatus(s){const x=el('scanStatus');if(x)x.textContent=s}
  function toQuoteText(data){const lines=[];if(data.customer)lines.push(`Customer: ${data.customer}`);if(data.phone)lines.push(`Phone: ${data.phone}`);if(data.vehicle)lines.push(`Vehicle: ${data.vehicle}`);if(data.model)lines.push(`Model: ${data.model}`);if(data.mileage)lines.push(`Mileage: ${data.mileage}`);for(const sec of data.sections||[]){if(sec.title)lines.push(`\n[${sec.title}]`);for(const it of sec.items||[]){const q=it.qty||'1 pc', p=it.price==null?'':` $${Number(it.price).toFixed(2)}`, inc=it.included?' [Included]':'', conf=it.confidence==='low'?' [CHECK]':'';lines.push(`${q} ${it.description}${p}${inc}${conf}`)}}if(data.notes)lines.push(`\nNotes: ${data.notes}`);return lines.join('\n')}
  function applyAIResult(data){
    if(!window.S || !window.section || !window.item || !window.render || !window.upd) throw new Error('Quotation app is not ready.');
    if(!el('customer').value && data.customer)el('customer').value=data.customer;
    if(!el('phone').value && data.phone)el('phone').value=data.phone;
    if(!el('vehicle').value && data.vehicle)el('vehicle').value=String(data.vehicle).replace(/\s/g,'').toUpperCase();
    if(!el('model').value && data.model)el('model').value=data.model;
    if(!el('mileage').value && data.mileage)el('mileage').value=data.mileage;
    const secs=(data.sections||[]).filter(s=>Array.isArray(s.items)&&s.items.length).map(s=>window.section({title:s.title||'SCANNED ITEMS',items:s.items.map(x=>window.item({q:x.qty||'1 pc',d:x.description||'',p:x.price==null?'':String(x.price),included:!!x.included}))}));
    if(secs.length){const has=window.S.some(s=>s.items.some(x=>String(x.d||'').trim()||String(x.p||'').trim()));if(has)window.S.push(...secs);else window.S.splice(0,window.S.length,...secs)}
    if(data.notes && !el('remarks').value)el('remarks').value=data.notes;
    window.render();window.upd();
    const low=(data.sections||[]).flatMap(s=>s.items||[]).filter(x=>x.confidence==='low').length;
    setStatus(`AI filled ${secs.reduce((n,s)=>n+s.items.length,0)} item(s). ${low?low+' low-confidence item(s) marked for checking.':'Please review before sending.'}`);
    document.querySelector('.sections-panel')?.scrollIntoView({behavior:'smooth',block:'start'});
  }
  async function aiScan(){
    const file=el('scanFile')?.files?.[0];if(!file){alert('Please choose a photo first.');return}
    const btn=el('scanBtn'),apply=el('applyScanBtn');if(btn)btn.disabled=true;if(apply)apply.disabled=true;setStatus('AI is reading the whole image and automotive context…');
    try{
      const image=await fileToDataUrl(file);
      const r=await fetch('/api/scan-quote',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image,mimeType:file.type||'image/jpeg'})});
      if(!r.ok){let msg='AI scanner is not available on this host.';try{const j=await r.json();msg=j.error||msg}catch{}throw new Error(msg)}
      const data=await r.json();window.__lastAIQuote=data;const txt=el('scanText');if(txt){txt.value=toQuoteText(data);txt.style.display='block'}
      if(apply){apply.disabled=false;apply.textContent='✓ Fill Quote from AI';apply.onclick=()=>applyAIResult(window.__lastAIQuote)}
      setStatus('AI scan complete. Review the extracted lines, then fill the quotation.');
    }catch(e){setStatus(`${e.message} Falling back to basic OCR.`);if(window.__basicScanImage)return window.__basicScanImage();throw e}
    finally{if(btn)btn.disabled=false}
  }
  function install(){
    if(typeof window.scanImage==='function' && !window.__basicScanImage)window.__basicScanImage=window.scanImage;
    window.scanImage=aiScan;
    const b=el('scanBtn');if(b){b.textContent='✨ AI Scan Handwriting';b.title='Uses AI vision when the secure backend is available; otherwise falls back to OCR.'}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,0));else setTimeout(install,0);
})();
