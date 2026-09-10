// The paste/import panel was retired. Remove a cached copy if an older page still created it.
(function(){
  function removeRetiredPanel(){document.getElementById('collatedPanel')?.remove()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',removeRetiredPanel);
  else removeRetiredPanel();
})();

