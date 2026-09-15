// Clearer customer / vehicle entry layout. UI-only: existing input elements and IDs are preserved.
(function(){
  const byId=id=>document.getElementById(id);

  function addStyles(){
    if(byId('auaCustomerVehicleStyles'))return;
    const style=document.createElement('style');
    style.id='auaCustomerVehicleStyles';
    style.textContent=`
      html:not(.cloud-auth-gate) .customer-panel{
        padding:17px!important;
        border:1px solid #cbd8e7!important;
        border-left:4px solid #2563eb!important;
        background:#fff!important;
        box-shadow:0 6px 20px rgba(15,39,71,.07)!important;
      }
      html:not(.cloud-auth-gate) .customer-panel>.panel-title{
        margin-bottom:13px!important;
        color:#183b63!important;
        font-size:12.5px!important;
        font-weight:900!important;
        letter-spacing:.11em!important;
      }
      .aua-cv-layout{
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:12px;
      }
      .aua-cv-group{
        min-width:0;
        padding:13px;
        border:1px solid #d9e3ee;
        border-radius:12px;
        background:#f8fbff;
      }
      .aua-cv-group[data-group="vehicle"]{
        background:#fbfcfe;
        border-color:#d8dee8;
      }
      .aua-cv-group-title{
        display:flex;
        align-items:center;
        gap:7px;
        margin-bottom:11px;
        padding-bottom:8px;
        border-bottom:1px solid #dbe5f0;
        color:#1d4ed8;
        font-size:11px;
        font-weight:900;
        letter-spacing:.1em;
      }
      .aua-cv-group[data-group="vehicle"] .aua-cv-group-title{color:#334155}
      .aua-cv-group-title::before{
        content:'';
        width:7px;
        height:7px;
        flex:0 0 7px;
        border-radius:999px;
        background:#2563eb;
      }
      .aua-cv-group[data-group="vehicle"] .aua-cv-group-title::before{background:#64748b}
      .aua-cv-fields{
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:10px;
      }
      .aua-cv-field{min-width:0}
      .aua-cv-field.aua-cv-main{grid-column:1/-1}
      html:not(.cloud-auth-gate) .customer-panel .aua-cv-field label{
        margin:0 0 6px!important;
        color:#475569!important;
        font-size:11.5px!important;
        font-weight:850!important;
        letter-spacing:.025em!important;
      }
      html:not(.cloud-auth-gate) .customer-panel .aua-cv-field input{
        min-height:46px;
        padding:10px 11px!important;
        border:1.5px solid #c7d2df!important;
        border-radius:9px!important;
        background:#fff!important;
        color:#0f172a!important;
        font-size:14.5px!important;
        font-weight:700!important;
        line-height:1.2!important;
        box-shadow:0 1px 1px rgba(15,23,42,.02);
      }
      html:not(.cloud-auth-gate) .customer-panel .aua-cv-main input{
        min-height:50px;
        font-size:16.5px!important;
        font-weight:850!important;
        border-color:#aebfd2!important;
      }
      html:not(.cloud-auth-gate) .customer-panel .aua-cv-field input:focus{
        outline:none!important;
        border-color:#2563eb!important;
        box-shadow:0 0 0 3px rgba(37,99,235,.12)!important;
      }
      html:not(.cloud-auth-gate) .customer-panel #vehicle{
        letter-spacing:.035em;
      }
      @media(max-width:1220px){
        .aua-cv-layout{grid-template-columns:1fr}
      }
      @media(max-width:760px){
        html:not(.cloud-auth-gate) .customer-panel{padding:14px!important}
        .aua-cv-layout{grid-template-columns:1fr;gap:10px}
        .aua-cv-group{padding:12px}
      }
      @media(max-width:430px){
        .aua-cv-fields{grid-template-columns:1fr}
        .aua-cv-field.aua-cv-main{grid-column:auto}
        html:not(.cloud-auth-gate) .customer-panel .aua-cv-field input{font-size:14px!important}
        html:not(.cloud-auth-gate) .customer-panel .aua-cv-main input{font-size:16px!important}
      }
      @media print{.aua-cv-layout{display:none!important}}
    `;
    document.head.appendChild(style);
  }

  function field(id,main=false){
    const input=byId(id);
    const wrap=input?.parentElement;
    if(!input||!wrap)return null;
    wrap.classList.add('aua-cv-field');
    if(main)wrap.classList.add('aua-cv-main');
    return wrap;
  }

  function group(title,name,fields){
    const box=document.createElement('section');
    box.className='aua-cv-group';
    box.dataset.group=name;
    const heading=document.createElement('div');
    heading.className='aua-cv-group-title';
    heading.textContent=title;
    const body=document.createElement('div');
    body.className='aua-cv-fields';
    fields.filter(Boolean).forEach(node=>body.appendChild(node));
    box.append(heading,body);
    return box;
  }

  function install(){
    addStyles();
    const panel=document.querySelector('.customer-panel');
    if(!panel||panel.dataset.auaCvLayout==='1')return;
    const oldGrid=panel.querySelector(':scope > .grid');
    if(!oldGrid)return;

    const customer=field('customer',true);
    const phone=field('phone');
    const date=field('date');
    const vehicle=field('vehicle',true);
    const model=field('model');
    const mileage=field('mileage');
    if(!customer||!vehicle)return;

    const phoneLabel=phone?.querySelector('label');
    if(phoneLabel)phoneLabel.textContent='Phone Number (Optional)';
    const modelLabel=model?.querySelector('label');
    if(modelLabel)modelLabel.textContent='Model / Type';

    const layout=document.createElement('div');
    layout.className='aua-cv-layout';
    layout.append(
      group('CUSTOMER DETAILS','customer',[customer,phone,date]),
      group('VEHICLE DETAILS','vehicle',[vehicle,model,mileage])
    );
    oldGrid.replaceWith(layout);
    panel.dataset.auaCvLayout='1';
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,50),{once:true});
  else setTimeout(install,50);
})();
