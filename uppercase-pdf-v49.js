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
    `;
    document.head.appendChild(style);
  }

  installStyles();
  document.addEventListener('input', normalizeField, true);
  document.addEventListener('change', normalizeField, true);
})();
