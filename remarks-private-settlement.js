// Optional Remarks preset for private-settlement quotations.
// UI-only helper: inserts a pre-approved clause into the existing rich Remarks editor.
(function(){
  const byId=id=>document.getElementById(id);
  const CLAUSE_KEY='PRIVATE SETTLEMENT / GOODWILL QUOTATION';
  const CLAUSE_HTML=`<strong>PRIVATE SETTLEMENT / GOODWILL QUOTATION</strong><br><br>This quotation is issued strictly for the purpose of facilitating an amicable <strong>private settlement</strong> between the parties.<br><br>The prices stated in this quotation include <strong>special goodwill and commercial concessions offered solely for the purpose of private settlement</strong>. Such prices, including the prices of parts, labour and repair works, may be lower than the workshop's prevailing standard rates and <strong>shall not be regarded as the applicable rates for an insurance or third-party claim</strong>.<br><br>Should the matter subsequently proceed as an insurance or third-party claim, the private-settlement concessions stated herein shall no longer apply. Parts, labour and repair charges may instead be assessed based on the <strong>prevailing parts prices, supplier/OEM pricing, workshop rates, repair methodology, surveyor or insurer requirements and the actual scope of repairs applicable at the relevant time</strong>.<br><br>To preserve the vehicle in its pre-repair condition and comply with the applicable insurance inspection process, the damaged parts have <strong>not been dismantled, removed or disturbed</strong> at the time this quotation is prepared.<br><br>Accordingly, this quotation is based primarily on damage that is reasonably visible and identifiable during the initial inspection. <strong>Additional, consequential or hidden damage may only become apparent upon dismantling or during the course of repairs.</strong> Any additional parts, labour, materials or repairs subsequently found to be necessary shall be treated as supplementary items and charged accordingly.<br><br>In the event that the matter is referred to an insurer, solicitor, motor surveyor, loss adjuster or other claims representative, a <strong>separate repair quotation, supplementary quotation and/or final repair invoice may be issued</strong>, and the amount may differ from this private-settlement quotation.<br><br>Accordingly, the amount stated herein <strong>should not be relied upon as representing the final repair cost or quantum of any subsequent insurance or third-party claim</strong>.<br><br>This quotation does not constitute an admission of liability by any party.`;

  function ensureStyles(){
    if(byId('auaPrivateSettlementStyles'))return;
    const style=document.createElement('style');
    style.id='auaPrivateSettlementStyles';
    style.textContent=`
      .aua-remarks-presets{display:flex;align-items:center;gap:8px;margin-top:9px}
      .aua-private-settlement-btn{min-height:34px;padding:7px 11px;border:1px solid #cbd5e1!important;background:#f8fafc!important;color:#334155!important;font-size:10.5px}
      .aua-private-settlement-btn:hover{border-color:#94a3b8!important;background:#f1f5f9!important}
    `;
    document.head.appendChild(style);
  }

  function insertClause(){
    const editor=byId('auaRemarksEditor');
    if(!editor)return;
    const existing=String(editor.innerText||editor.textContent||'').toUpperCase();
    if(existing.includes(CLAUSE_KEY)){
      alert('Private Settlement wording is already included in Remarks.');
      return;
    }
    const hasExisting=String(editor.innerText||editor.textContent||'').trim().length>0;
    editor.innerHTML=`${editor.innerHTML}${hasExisting?'<br><br>':''}${CLAUSE_HTML}`;
    editor.dispatchEvent(new Event('input',{bubbles:true}));
    editor.focus();
  }

  function install(attempt=0){
    ensureStyles();
    const editor=byId('auaRemarksEditor');
    if(!editor){if(attempt<20)setTimeout(()=>install(attempt+1),200);return}
    if(byId('auaPrivateSettlementButton'))return;
    const row=document.createElement('div');
    row.className='aua-remarks-presets';
    row.innerHTML='<button id="auaPrivateSettlementButton" class="btn outline aua-private-settlement-btn" type="button">Private Settlement</button>';
    editor.insertAdjacentElement('afterend',row);
    byId('auaPrivateSettlementButton').addEventListener('click',insertClause);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>install(),{once:true});else install();
})();
