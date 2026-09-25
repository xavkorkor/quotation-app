// v49: Consistent capitals in quotation entry and in the PDF/print preview.
// Existing saved quotations and pricing/calculation logic are not modified.
(function () {
  'use strict';

  const FIELD_SELECTOR = '#customer, #vehicle, #model, #remarks, #sections [data-desc], #sections [data-qty], #sections [data-section-title]';

  function normalizeField(event) {
    const field = event.target;
    if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement)) return;
    if (!field.matches(FIELD_SELECTOR) || field.readOnly || field.disabled || event.isComposing) return;
    const before = field.value;
    const after = before.toUpperCase();
    if (before === after) return;

    // Keep the cursor where it belongs when a typed or pasted letter is capitalized.
    let start = null, end = null, direction = 'none';
    try {
      start = field.selectionStart;
      end = field.selectionEnd;
      direction = field.selectionDirection || 'none';
    } catch (_) { /* Non-text inputs have no text selection. */ }

    field.value = after;
    if (start !== null && end !== null) {
      try {
        field.setSelectionRange(before.slice(0, start).toUpperCase().length,
          before.slice(0, end).toUpperCase().length, direction);
      } catch (_) { /* Keep the value even if the browser cannot restore selection. */ }
    }
    // The original input/change event continues to the quotation's existing handler,
    // which reads this uppercase value; do not fire a second event or re-render here.
  }

  function installStyles() {
    if (document.getElementById('auaUppercasePdfV49')) return;
    const style = document.createElement('style');
    style.id = 'auaUppercasePdfV49';
    style.textContent = `
      /* Export captures .paper through html2canvas. Apply to every descendant so
         existing mixed-case quotations, terms and editable preview text also render in caps. */
      .paper, .paper * { text-transform: uppercase !important; }
      /* Editor display stays consistent for quotations loaded before v49. */
      .editor #customer, .editor #vehicle, .editor #model,
      .editor #remarks, .editor #sections [data-desc],
      .editor #sections [data-qty], .editor #sections [data-section-title],
      .editor #auaRemarksEditor { text-transform: uppercase !important; }

      /* v50: The live PDF generator captures .paper, so screen-only print rules
         would not darken downloaded PDFs. Restrict contrast changes to .paper
         to keep the light quotation editor, button colors and page layout intact. */
      .paper, .paper * { color: #111827 !important; }
      .paper .thead { border-top-color: #303b4b !important; border-bottom-color: #5b6574 !important; }
      .paper .line, .paper .summary-row, .paper .totals > div,
      .paper .adjust, .paper .aua-pdf-detail-row {
        border-bottom-color: #87909d !important;
      }
      .paper .summary, .paper .summary-head, .paper .summary-total,
      .paper .adjust.final, .paper .grand, .paper .remark-print,
      .paper .aua-pdf-detail-card, .paper .aua-pdf-detail-head,
      .paper .aua-pdf-meta #pQuoteNumberWrap {
        border-color: #657184 !important;
      }
      .paper, .paper * {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      /* v51: html2pdf uses CSS page-break rules when exporting .paper.
         Keep the complete Terms & Conditions block on one page; if it will not
         fit in the remaining space, move it to the next page instead of slicing it. */
      .paper .notes {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }
      .paper .notes > div {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }
    `;
    document.head.appendChild(style);
  }

  function prepareRemarksPageBreak() {
    document.querySelectorAll('.aua-remark-page-break-v52').forEach(el=>el.remove());
    const paper=document.querySelector('.paper');
    const remarks=document.querySelector('.paper .remark-print');
    if(!paper||!remarks||getComputedStyle(remarks).display==='none'||!remarks.textContent.trim())return()=>{};

    const paperRect=paper.getBoundingClientRect();
    const remarksRect=remarks.getBoundingClientRect();
    if(!paperRect.width||!remarksRect.height)return()=>{};

    // html2pdf exports A4 with 1mm side margins. Convert that printable A4 height
    // back into the source-paper pixel scale so we can detect a real page crossing.
    const sourcePageHeight=paperRect.width*(297/208);
    const top=remarksRect.top-paperRect.top;
    const height=remarksRect.height;
    if(height>=sourcePageHeight-8)return()=>{};

    const offset=((top%sourcePageHeight)+sourcePageHeight)%sourcePageHeight;
    const remaining=sourcePageHeight-offset;
    if(height+4<=remaining)return()=>{};

    // html2pdf's existing "legacy" page-break mode recognises this class reliably.
    // Insert it only for the export, then remove it immediately afterwards.
    const breaker=document.createElement('div');
    breaker.className='html2pdf__page-break aua-remark-page-break-v52';
    breaker.setAttribute('aria-hidden','true');
    breaker.style.cssText='height:0;margin:0;padding:0;border:0;';
    remarks.parentNode.insertBefore(breaker,remarks);
    return()=>breaker.remove();
  }

  function installRemarksPaginationGuard(attempt=0) {
    const original=window.makePdfBlob;
    if(typeof original!=='function'){
      if(attempt<50)setTimeout(()=>installRemarksPaginationGuard(attempt+1),100);
      return;
    }
    if(original.__auaRemarksPaginationV52)return;
    const wrapped=async function(){
      const cleanup=prepareRemarksPageBreak();
      try{return await original.apply(this,arguments)}
      finally{cleanup()}
    };
    wrapped.__auaRemarksPaginationV52=true;
    wrapped.__auaOriginalMakePdfBlob=original;
    window.makePdfBlob=wrapped;
  }

  installStyles();
  installRemarksPaginationGuard();
  document.addEventListener('input', normalizeField, true);
  document.addEventListener('change', normalizeField, true);
})();
