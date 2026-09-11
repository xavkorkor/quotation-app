// Spacing polish for the quotation History workspace.
(function(){
  const style=document.createElement('style');
  style.id='auaHistorySpacingPolish';
  style.textContent=`
    .aua-history-header{padding:24px 30px;gap:22px}
    .aua-history-head-actions{gap:10px}
    .aua-history-controls{padding:20px 30px}
    .aua-history-filter-row{gap:16px;margin-top:14px}
    .aua-history-chips{gap:9px}
    .aua-history-chip{padding:9px 14px}

    .aua-history-list-wrap{padding:22px}
    .aua-history-columns,.aua-history-row{grid-template-columns:110px minmax(240px,1.35fr) minmax(130px,.8fr) 110px 155px;gap:18px}
    .aua-history-columns{padding:0 18px 10px}
    .aua-history-columns>span:last-child{text-align:right}
    .aua-history-list{gap:10px}
    .aua-history-row{padding:16px 18px;min-height:82px}

    .aua-history-date,.aua-history-model,.aua-history-updated{line-height:1.45}
    .aua-history-vehicle{display:inline-block;line-height:1.3}
    .aua-history-vehicle-count{margin-left:8px}
    .aua-history-sub{display:block;margin-top:6px;line-height:1.4}
    .aua-history-total{line-height:1.4}

    .aua-history-preview{padding:28px}
    .aua-history-preview-sub{margin:8px 0 20px;line-height:1.5}
    .aua-history-stats{gap:10px}
    .aua-history-stat{padding:11px}
    .aua-history-stat b{margin-top:4px;line-height:1.35}
    .aua-history-items{margin:18px 0;max-height:300px}
    .aua-history-section{padding:11px 0 6px}
    .aua-history-item{gap:14px;padding:10px 0;line-height:1.4}
    .aua-history-actions{gap:10px;margin-top:2px}

    @media(max-width:900px){
      .aua-history-list-wrap{padding:16px}
      .aua-history-row{grid-template-columns:90px minmax(0,1fr) 98px;gap:14px;padding:14px 16px;min-height:72px}
      .aua-history-preview{padding:22px}
    }
    @media(max-width:520px){
      .aua-history-header,.aua-history-controls{padding:17px}
      .aua-history-list-wrap{padding:12px}
      .aua-history-row{grid-template-columns:76px minmax(0,1fr) 82px;gap:12px;padding:13px 12px;min-height:68px}
      .aua-history-sub{margin-top:5px}
      .aua-history-preview{padding:18px}
      .aua-history-stats{gap:8px}
    }
  `;
  document.head.appendChild(style);
})();
