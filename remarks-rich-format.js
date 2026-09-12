// Rich remarks editor: preserves bold, line breaks, blank lines and spacing in preview/PDF.
// Keeps plain `remarks` for backwards compatibility and stores safe formatting in `remarksRich`.
(function(){
  const byId=id=>document.getElementById(id);
  let editor=null,richHtml='';

  const escapeHtml=value=>String(value??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const plainToHtml=value=>escapeHtml(String(value??'').replace(/\r\n?/g,'\n')).replace(/\n/g,'<br>');

  function nodeHtml(node){
    if(node.nodeType===Node.TEXT_NODE)return escapeHtml(node.nodeValue||'');
    if(node.nodeType!==Node.ELEMENT_NODE)return'';
    const tag=node.tagName.toLowerCase();
    const children=Array.from(node.childNodes).map(nodeHtml).join('');
    if(tag==='br')return'<br>';
    if(tag==='b'||tag==='strong')return`<strong>${children}</strong>`;
    if(tag==='span'){
      const weight=String(node.style?.fontWeight||'').toLowerCase();
      const bold=weight==='bold'||weight==='bolder'||(!Number.isNaN(Number(weight))&&Number(weight)>=600);
      return bold?`<strong>${children}</strong>`:children;
    }
    if(tag==='div'||tag==='p')return`${children}<br>`;
    if(tag==='li')return`• ${children}<br>`;
    if(tag==='ul'||tag==='ol')return children;
    return children;
  }

  function sanitize(html){
    const template=document.createElement('template');
    template.innerHTML=String(html||'');
    let safe=Array.from(template.content.childNodes).map(nodeHtml).join('');
    safe=safe.replace(/(?:<br>){3,}$/,'<br><br>');
    return safe;
  }

  function plainFromHtml(html){
    const box=document.createElement('div');
    box.innerHTML=String(html||'').replace(/<br\s*\/?>/gi,'\n');
    return (box.textContent||'').replace(/\u00a0/g,' ');
  }

  function renderPreview(){
    const preview=byId('pRemarks');
    if(!preview)return;
    const safe=sanitize(richHtml||plainToHtml(byId('remarks')?.value||''));
    const hasText=plainFromHtml(safe).trim().length>0;
    preview.style.display=hasText?'block':'none';
    preview.innerHTML=hasText?`<div class="aua-remarks-print-title">Remarks</div><div class="aua-remarks-print-body">${safe}</div>`:'';
  }

  function syncFromEditor(){
    if(!editor)return;
    richHtml=sanitize(editor.innerHTML);
    const backing=byId('remarks');
    if(backing)backing.value=plainFromHtml(richHtml);
    try{if(typeof window.upd==='function')window.upd()}catch{}
    renderPreview();
  }

  function setEditor(html,plain){
    if(!editor)return;
    richHtml=sanitize(html||plainToHtml(plain||''));
    editor.innerHTML=richHtml;
    const backing=byId('remarks');
    if(backing)backing.value=plainFromHtml(richHtml);
    renderPreview();
  }

  function ensureUi(){
    const backing=byId('remarks');
    const panel=document.querySelector('.remarks-panel');
    if(!backing||!panel)return false;
    if(byId('auaRemarksEditor')){editor=byId('auaRemarksEditor');return true}

    const toolbar=document.createElement('div');
    toolbar.className='aua-remarks-toolbar';
    toolbar.innerHTML='<button id="auaRemarksBold" class="btn outline" type="button" title="Bold selected text"><strong>B</strong>&nbsp; Bold</button><span>Formatting, spacing and new lines are preserved in the PDF.</span>';

    editor=document.createElement('div');
    editor.id='auaRemarksEditor';
    editor.className='aua-remarks-editor';
    editor.contentEditable='true';
    editor.setAttribute('role','textbox');
    editor.setAttribute('aria-multiline','true');
    editor.dataset.placeholder='Key in notes to appear on the quotation';

    backing.style.display='none';
    backing.setAttribute('aria-hidden','true');
    backing.insertAdjacentElement('beforebegin',toolbar);
    toolbar.insertAdjacentElement('afterend',editor);

    byId('auaRemarksBold').addEventListener('mousedown',event=>event.preventDefault());
    byId('auaRemarksBold').addEventListener('click',()=>{
      editor.focus();
      try{document.execCommand('bold',false,null)}catch{}
      syncFromEditor();
    });
    editor.addEventListener('input',syncFromEditor);
    editor.addEventListener('blur',()=>{
      richHtml=sanitize(editor.innerHTML);
      editor.innerHTML=richHtml;
      syncFromEditor();
    });
    editor.addEventListener('paste',()=>setTimeout(syncFromEditor,0));

    setEditor('',backing.value);
    return true;
  }

  function ensureStyles(){
    if(byId('auaRemarksRichStyles'))return;
    const style=document.createElement('style');
    style.id='auaRemarksRichStyles';
    style.textContent=`
      .aua-remarks-toolbar{display:flex;align-items:center;gap:9px;margin-bottom:8px}.aua-remarks-toolbar .btn{min-height:32px;padding:5px 10px;font-size:10.5px}.aua-remarks-toolbar span{color:#64748b;font-size:9.5px;line-height:1.3}
      .aua-remarks-editor{min-height:115px;width:100%;padding:11px;border:1px solid #cfd9e5;border-radius:10px;background:#fff;color:#172033;font:inherit;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere;outline:none}
      .aua-remarks-editor:hover{border-color:#aebed1}.aua-remarks-editor:focus{border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.13)}
      .aua-remarks-editor:empty:before{content:attr(data-placeholder);color:#94a3b8;pointer-events:none}.aua-remarks-editor strong{font-weight:800}
      .remark-print{white-space:normal!important;line-height:1.5!important}.aua-remarks-print-title{margin-bottom:5px;font-weight:800}.aua-remarks-print-body{white-space:pre-wrap;overflow-wrap:anywhere}.aua-remarks-print-body strong{font-weight:800}
      @media print{.aua-remarks-print-body{white-space:pre-wrap!important}}
    `;
    document.head.appendChild(style);
  }

  function installHooks(){
    if(typeof window.state!=='function'||typeof window.loadRecord!=='function'||typeof window.newQuote!=='function')return false;
    if(window.state.__auaRichRemarks)return true;

    const baseState=window.state;
    const baseLoadRecord=window.loadRecord;
    const baseNewQuote=window.newQuote;
    const baseDuplicateQuote=typeof window.duplicateQuote==='function'?window.duplicateQuote:null;
    const baseUpd=typeof window.upd==='function'?window.upd:null;

    window.state=function(){
      const data=baseState.apply(this,arguments);
      if(editor){
        richHtml=sanitize(editor.innerHTML);
        data.remarks=plainFromHtml(richHtml);
        if(richHtml)data.remarksRich=richHtml;else delete data.remarksRich;
      }
      return data;
    };
    window.state.__auaRichRemarks=true;

    window.loadRecord=function(data){
      const result=baseLoadRecord.apply(this,arguments);
      setTimeout(()=>setEditor(data?.remarksRich||'',data?.remarks||''),0);
      return result;
    };

    window.newQuote=function(){
      const before=byId('remarks')?.value||'';
      const result=baseNewQuote.apply(this,arguments);
      setTimeout(()=>{
        const after=byId('remarks')?.value||'';
        if(after!==before)setEditor('',after);
      },0);
      return result;
    };

    if(baseDuplicateQuote){
      window.duplicateQuote=function(){
        const result=baseDuplicateQuote.apply(this,arguments);
        setTimeout(renderPreview,0);
        return result;
      };
    }

    if(baseUpd&&!baseUpd.__auaRichRemarks){
      window.upd=function(){
        const result=baseUpd.apply(this,arguments);
        renderPreview();
        return result;
      };
      window.upd.__auaRichRemarks=true;
    }
    return true;
  }

  function install(attempt=0){
    ensureStyles();
    const ui=ensureUi(),hooks=installHooks();
    if(ui&&hooks){renderPreview();return}
    if(attempt<20)setTimeout(()=>install(attempt+1),200);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>install(),{once:true});else install();
})();
