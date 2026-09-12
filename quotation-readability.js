// UI/PDF-only readability adjustment. No calculation, storage or workflow logic here.
(function(){
  if(document.getElementById('auaQuotationReadabilityStyles'))return;
  const style=document.createElement('style');
  style.id='auaQuotationReadabilityStyles';
  style.textContent=`
    .paper .company-sub{font-size:12.75px;line-height:1.28}
    .paper .meta{font-size:12.25px;line-height:1.3}
    .paper .thead{font-size:10.25px}
    .paper .line{font-size:11.25px;line-height:1.32}
    .paper .sectitle{font-size:10.75px;line-height:1.3}
    .paper .adjust{font-size:10.75px;line-height:1.3}
    .paper .summary-head,.paper .summary-row{font-size:10.75px;line-height:1.3}
    .paper .totals{font-size:11.75px;line-height:1.3}
    .paper .remark-print{font-size:10.75px;line-height:1.55!important}
    .paper .notes{font-size:10px;line-height:1.4}
  `;
  document.head.appendChild(style);
})();
