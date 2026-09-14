// Compact quotation footer terms and automatic 7-day validity date.
(function(){
  function formatValidUntil(value){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(String(value||'')))return '—';
    const [year,month,day]=value.split('-').map(Number);
    const validUntil=new Date(Date.UTC(year,month-1,day+7));
    return validUntil.toLocaleDateString('en-GB',{
      day:'2-digit',
      month:'short',
      year:'numeric',
      timeZone:'UTC'
    });
  }

  function refreshValidUntil(){
    const output=document.getElementById('quoteValidUntil');
    if(!output)return;
    const quoteDate=document.getElementById('date')?.value||'';
    output.textContent=formatValidUntil(quoteDate);
  }

  function install(){
    const notes=document.querySelector('.paper .notes');
    if(!notes)return;

    notes.innerHTML=`
      <div style="font-weight:700;margin-bottom:1.2mm">IMPORTANT TERMS &amp; CONDITIONS</div>
      <div><b>1. Ad-Hoc / Supplementary Items:</b> Additional parts, labour or repairs may be required upon dismantling, diagnosis or during repair. Items not specifically stated will be charged separately where required.</div>
      <div style="margin-top:1mm"><b>2. Quotation Validity:</b> Valid for 7 calendar days from the date of issue. <b>Valid Until: <span id="quoteValidUntil"></span></b></div>
      <div style="margin-top:1mm"><b>3. Electronic Document:</b> This quotation is electronically generated and issued. No physical or electronic signature is required.</div>`;

    const dateInput=document.getElementById('date');
    dateInput?.addEventListener('input',refreshValidUntil);
    dateInput?.addEventListener('change',refreshValidUntil);

    const printedDate=document.getElementById('pd');
    if(printedDate){
      new MutationObserver(refreshValidUntil).observe(printedDate,{
        childList:true,
        characterData:true,
        subtree:true
      });
    }

    refreshValidUntil();
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',install,{once:true});
  }else{
    install();
  }
})();
