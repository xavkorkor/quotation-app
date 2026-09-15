// Style A: one customer/vehicle PDF render path using the original preview fields directly.
// No duplicate legacy detail block is created. Editor-side fields are untouched.
(function(){
  const byId=id=>document.getElementById(id);

  function addStyles(){
    if(byId('auaPdfCustomerVehicleStyles'))return;
    const style=document.createElement('style');
    style.id='auaPdfCustomerVehicleStyles';
    style.textContent=`
      .paper .meta.aua-pdf-meta{
        display:block!important;
        margin:0 0 6mm!important;
        font-size:11.5px!important;
      }
      .paper .meta.aua-pdf-meta>#pQuoteNumberWrap{
        margin:0 0 2.5mm!important;
        padding:0 0 1.5mm!important;
        border:0!important;
        border-bottom:1px solid #e2e8f0!important;
        color:#475569;
        font-size:10px;
        text-align:right;
      }
      .paper .meta.aua-pdf-meta .aua-pdf-details{
        display:grid!important;
        grid-template-columns:1fr 1fr!important;
        gap:4mm!important;
        margin:0!important;
        padding:0!important;
        border:0!important;
        break-inside:avoid;
        page-break-inside:avoid;
      }
      .paper .meta.aua-pdf-meta .aua-pdf-detail-card{
        min-width:0;
        margin:0!important;
        padding:0!important;
        overflow:hidden;
        border:1px solid #9fb6ce!important;
        border-radius:1.8mm;
        background:#fff;
        break-inside:avoid;
        page-break-inside:avoid;
      }
      .paper .meta.aua-pdf-meta .aua-pdf-detail-head{
        margin:0!important;
        padding:2.1mm 3mm!important;
        border:0!important;
        border-bottom:1px solid #c8d7e6!important;
        background:#eaf2fb;
        color:#173b61;
        font-size:10.5px;
        font-weight:800;
        letter-spacing:.08em;
      }
      .paper .meta.aua-pdf-meta .aua-pdf-detail-body{
        display:grid!important;
        gap:0!important;
        margin:0!important;
        padding:1.7mm 3mm 2.1mm!important;
        border:0!important;
      }
      .paper .meta.aua-pdf-meta .aua-pdf-detail-row{
        display:grid!important;
        grid-template-columns:27mm minmax(0,1fr)!important;
        gap:2.2mm!important;
        align-items:baseline!important;
        min-height:7.4mm;
        margin:0!important;
        padding:1.2mm 0!important;
        border:0!important;
        border-bottom:1px solid #eef2f6!important;
      }
      .paper .meta.aua-pdf-meta .aua-pdf-detail-row:last-child{
        border-bottom:0!important;
      }
      .paper .meta.aua-pdf-meta .aua-pdf-detail-label{
        margin:0!important;
        padding:0!important;
        border:0!important;
        color:#334155;
        font-size:10px;
        font-weight:700;
        line-height:1.2;
      }
      .paper .meta.aua-pdf-meta .aua-pdf-detail-value{
        min-width:0;
        margin:0!important;
        padding:0!important;
        border:0!important;
        color:#0f172a;
        font-size:12.2px;
        font-weight:600;
        line-height:1.2;
        overflow-wrap:anywhere;
      }
      .paper .meta.aua-pdf-meta .aua-pdf-detail-row.aua-pdf-primary{
        min-height:8.5mm;
        padding:1.4mm 0 1.5mm!important;
      }
      .paper .meta.aua-pdf-meta .aua-pdf-detail-row.aua-pdf-primary .aua-pdf-detail-label{
        font-size:10.5px;
        font-weight:800;
      }
      .paper .meta.aua-pdf-meta .aua-pdf-detail-row.aua-pdf-primary .aua-pdf-detail-value{
        font-size:14px;
        font-weight:500;
        letter-spacing:.01em;
      }
      .paper .meta.aua-pdf-meta .aua-pdf-phone-row:not(.aua-empty){display:grid!important}
      .paper .meta.aua-pdf-meta .aua-pdf-phone-row.aua-empty{display:none!important}
      @media(max-width:700px){
        .paper .meta.aua-pdf-meta .aua-pdf-details{grid-template-columns:1fr!important}
      }
      @media print{
        .paper .meta.aua-pdf-meta .aua-pdf-details{grid-template-columns:1fr 1fr!important}
      }
    `;
    document.head.appendChild(style);
  }

  function removeTextNodes(node){
    [...node.childNodes].forEach(child=>{
      if(child.nodeType===Node.TEXT_NODE)child.remove();
    });
  }

  function prepareRow(row,value,label,primary=false,extraClass=''){
    removeTextNodes(row);
    row.className=`aua-pdf-detail-row${primary?' aua-pdf-primary':''}${extraClass?' '+extraClass:''}`;

    const labelNode=document.createElement('span');
    labelNode.className='aua-pdf-detail-label';
    labelNode.textContent=label;

    value.classList.add('aua-pdf-detail-value');
    row.prepend(labelNode);
    return row;
  }

  function makeCard(title,rows){
    const card=document.createElement('section');
    card.className='aua-pdf-detail-card';

    const head=document.createElement('div');
    head.className='aua-pdf-detail-head';
    head.textContent=title;

    const body=document.createElement('div');
    body.className='aua-pdf-detail-body';
    rows.forEach(row=>body.appendChild(row));

    card.append(head,body);
    return card;
  }

  function install(){
    addStyles();

    const meta=document.querySelector('.paper .meta');
    if(!meta||meta.dataset.auaPdfDetails==='1')return;

    const pc=byId('pc'),pphone=byId('pphone'),pd=byId('pd');
    const pv=byId('pv'),pmod=byId('pmod'),pm=byId('pm');
    const phoneWrap=byId('pphoneWrap');
    if(!pc||!pphone||!pd||!pv||!pmod||!pm||!phoneWrap)return;

    const customerWrap=pc.parentElement;
    const dateWrap=pd.parentElement;
    const vehicleWrap=pv.parentElement;
    const mileageWrap=pm.parentElement;
    const modelWrap=pmod.parentElement;
    if(!customerWrap||!dateWrap||!vehicleWrap||!mileageWrap||!modelWrap)return;

    // Phone originally lives inside the old customer line. Detach it and reuse it as its own row.
    phoneWrap.remove();

    const customerRow=prepareRow(customerWrap,pc,'Name',true);
    const phoneRow=prepareRow(phoneWrap,pphone,'Phone Number',false,'aua-pdf-phone-row');
    const dateRow=prepareRow(dateWrap,pd,'Date');
    const vehicleRow=prepareRow(vehicleWrap,pv,'Vehicle No.',true);
    const modelRow=prepareRow(modelWrap,pmod,'Model / Type');
    const mileageRow=prepareRow(mileageWrap,pm,'Mileage');

    const details=document.createElement('div');
    details.className='aua-pdf-details';
    details.append(
      makeCard('CUSTOMER DETAILS',[customerRow,phoneRow,dateRow]),
      makeCard('VEHICLE DETAILS',[vehicleRow,modelRow,mileageRow])
    );

    meta.appendChild(details);
    meta.classList.add('aua-pdf-meta');
    meta.dataset.auaPdfDetails='1';

    const phoneInput=byId('phone');
    const syncPhone=()=>{
      const hasPhone=Boolean(String(phoneInput?.value||'').trim());
      phoneRow.classList.toggle('aua-empty',!hasPhone);
      if(hasPhone)phoneRow.style.removeProperty('display');
    };
    phoneInput?.addEventListener('input',syncPhone);
    phoneInput?.addEventListener('change',syncPhone);
    syncPhone();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,120),{once:true});
  else setTimeout(install,120);
})();
