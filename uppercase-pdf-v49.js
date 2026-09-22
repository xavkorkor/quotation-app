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
    `;
    document.head.appendChild(style);
  }

  installStyles();
  document.addEventListener('input', normalizeField, true);
  document.addEventListener('change', normalizeField, true);
})();
