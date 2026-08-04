// Workshop-specific scan rules learned from Alan's United job sheets.
(function(){
  const additions = [
    '8l synthetic engine oil','synthetic engine oil','outside service','to outside service','inspection fee',
    'auxiliary battery','92ah battery','original 92ah battery','push start switch','keyless system','keyless control unit',
    'seat control unit','calibrate rear l/h side','reprogram','brake servo'
  ];

  function addTerms(){
    if(Array.isArray(window.AUTOMOTIVE_TERMS)){
      window.AUTOMOTIVE_TERMS = Array.from(new Set([...window.AUTOMOTIVE_TERMS,...additions])).sort();
    }
  }

  function clean(s){return String(s||'').replace(/[|•·]/g,' ').replace(/\s+/g,' ').trim()}
  function hasPrice(line){
    return /(?:S\$|SGD|\$)?\s*([0-9][0-9,]*(?:\.\d{1,2})?)\s*$/i.test(clean(line));
  }

  // On handwritten workshop job sheets, the unpriced lines at the top are usually workflow/job notes.
  // Quotation extraction begins only from the FIRST line carrying an amount/value.
  function installPriceStartRule(){
    if(typeof window.parseScanItems!=='function') return false;
    const original = window.parseScanItems;
    window.parseScanItems = function(lines){
      const arr = Array.from(lines||[]);
      const firstValueIndex = arr.findIndex(hasPrice);
      if(firstValueIndex < 0) return [];
      return original(arr.slice(firstValueIndex));
    };
    return true;
  }

  function installCorrections(){
    if(typeof window.autoCorrectAutomotiveLine!=='function') return;
    const base = window.autoCorrectAutomotiveLine;
    window.autoCorrectAutomotiveLine = function(line){
      let s = base(line);
      s = s.replace(/\b8\s*[lL]\s+(?:syn(?:thetic)?|synthet[i1]c)\s+eng(?:ine)?\s+oil\b/ig,'8L Synthetic Engine Oil');
      s = s.replace(/\b(?:to\s+)?out\s*side\s+serv(?:ice)?\b/ig,'To Outside Service');
      s = s.replace(/\binspec(?:tion)?\s+fee\b/ig,'Inspection Fee');
      s = s.replace(/\baux(?:iliary)?\s+batt(?:ery|ry)?\b/ig,'Auxiliary Battery');
      s = s.replace(/\bpush\s+start\s+sw(?:itch)?\b/ig,'Push Start Switch');
      return s;
    };
    if(typeof window.autoCorrectAutomotiveText==='function'){
      window.autoCorrectAutomotiveText = text => String(text||'').split(/\r?\n/).map(window.autoCorrectAutomotiveLine).join('\n');
    }
  }

  function install(){
    addTerms();
    installCorrections();
    if(!installPriceStartRule()) setTimeout(installPriceStartRule,50);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(install,0));
  else setTimeout(install,0);
})();