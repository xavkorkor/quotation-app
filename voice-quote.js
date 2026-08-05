// Alan's United Auto - free browser voice dictation into the collated quotation list.
// Captures complete finalized phrases only. Each finalized spoken phrase is added as its own line.
(function(){
 const $=id=>document.getElementById(id);
 function supported(){return window.SpeechRecognition||window.webkitSpeechRecognition}
 function install(){
  const ta=$('collatedText');if(!ta||$('auaVoiceQuoteBtn'))return;
  const R=supported();
  const btn=document.createElement('button');btn.id='auaVoiceQuoteBtn';btn.type='button';btn.className='btn secondary';btn.style.cssText='width:100%;margin-top:8px;min-height:42px;font-weight:700';
  btn.textContent=R?'🎤 Voice Quote':'🎤 Voice Quote (Not supported in this browser)';ta.insertAdjacentElement('afterend',btn);
  if(!R){btn.disabled=true;return}
  let rec=null,listening=false,baseText='',phrases=[];
  function rebuild(){
   const base=String(baseText||'').replace(/\s+$/,'');
   const spoken=phrases.filter(Boolean).join('\n');
   ta.value=base+(base&&spoken?'\n':'')+spoken;
   ta.dispatchEvent(new Event('input',{bubbles:true}));
  }
  function stop(){try{rec?.stop()}catch(e){}}
  btn.onclick=()=>{
   if(listening){stop();return}
   rec=new R();rec.lang='en-SG';rec.continuous=true;rec.interimResults=false;
   baseText=ta.value;phrases=[];
   rec.onstart=()=>{listening=true;btn.textContent='■ Stop Voice Quote';btn.style.fontWeight='800'};
   rec.onresult=e=>{
    for(let i=e.resultIndex;i<e.results.length;i++){
     if(!e.results[i].isFinal)continue;
     const phrase=String(e.results[i][0].transcript||'').trim();
     if(phrase)phrases.push(phrase);
    }
    rebuild();
   };
   rec.onerror=e=>{const st=$('collatedStatus');if(st)st.textContent='Voice dictation error: '+e.error};
   rec.onend=()=>{listening=false;btn.textContent='🎤 Voice Quote';btn.style.fontWeight='700';rebuild();ta.dispatchEvent(new Event('change',{bubbles:true}))};
   try{rec.start()}catch(e){}
  };
 }
 function watch(){install();new MutationObserver(install).observe(document.body,{childList:true,subtree:true})}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(watch,900));else setTimeout(watch,900);
})();